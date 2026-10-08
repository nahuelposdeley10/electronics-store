import express from 'express'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { parsePagination } from '../lib/catalog-query.js'
import { cashNet, currentShift, openShift, closeShift, addMovement, createArqueo } from '../lib/cash.js'
import { roundMoney } from '../lib/money.js'
import { CashShift } from '../models/CashShift.js'
import { CashMovement } from '../models/CashMovement.js'
import { CashCount } from '../models/CashCount.js'
import { Order } from '../models/Order.js'
import { User } from '../models/User.js'
import { requireTenantIdOf } from '../lib/tenant.js'

const router = express.Router()

router.use(requireAuth)

function requireTenant(req, res, next) {
  try {
    requireTenantIdOf(req)
    next()
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }
}

router.use(requireTenant)

function canManageAllShifts(req) {
  return req.user?.role === 'admin' || req.user?.role === 'superadmin'
}

function actorId(req) {
  return req.user?.sub || null
}

function legacyShiftAccess(req) {
  return canManageAllShifts(req)
}

async function enrichShifts(shifts) {
  const rows = (shifts || []).filter(Boolean)
  const ids = [...new Set(rows.map((shift) => shift.openedByUserId).filter(Boolean).map(String))]
  const users = ids.length
    ? await User.find({ _id: { $in: ids } }).select('_id name email role').lean()
    : []
  const byId = new Map(users.map((user) => [String(user._id), user]))
  return rows.map((shift) => {
    const user = shift.openedByUserId ? byId.get(String(shift.openedByUserId)) : null
    const fallback = shift.openedBy ? { name: shift.openedBy, email: shift.openedBy, role: null } : null
    return {
      ...shift,
      operator: user
        ? { id: String(user._id), name: user.name, email: user.email, role: user.role }
        : fallback
          ? { id: null, ...fallback }
          : null,
    }
  })
}

async function tenantOwnedShift(tenant, shiftId, req) {
  if (!shiftId) return null
  const filter = { _id: shiftId, adminId: tenant }
  if (!canManageAllShifts(req)) {
    filter.$or = [{ openedByUserId: actorId(req) }, { openedBy: req.user?.email || null }]
  }
  return CashShift.findOne(filter)
    .select('_id number openedAt status')
    .lean()
}

router.get('/status', requirePermission('cash.manage'), async (req, res) => {
  try {
    const tenant = requireTenantIdOf(req)
    const manager = canManageAllShifts(req)
    const active = await currentShift(tenant, actorId(req), { includeLegacy: legacyShiftAccess(req), userEmail: req.user?.email || null })
    const openShifts = manager
      ? await CashShift.find({ status: 'open', adminId: tenant }).sort({ openedAt: -1 }).lean()
      : active
        ? [active]
        : []
    const lastFilter = { status: 'closed', adminId: tenant }
    if (!manager) {
      lastFilter.$or = [{ openedByUserId: actorId(req) }, { openedBy: req.user?.email || null }]
    }
    const lastShift = await CashShift.findOne(lastFilter).sort({ closedAt: -1 }).lean()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayFilter = { status: 'approved', adminId: tenant, createdAt: { $gte: todayStart } }
    if (!manager) {
      todayFilter.source = 'pos'
      todayFilter.soldBy = req.user?.email || null
    }
    const today = await Order.aggregate([
      { $match: todayFilter },
      {
        $group: {
          _id: null,
          revenue: { $sum: '$total' },
          orders: { $sum: 1 },
          cash: {
            $sum: { $cond: [{ $eq: ['$payment', 'efectivo'] }, '$total', 0] },
          },
        },
      },
    ])

    const [activeWithOwner, openWithOwner, lastWithOwner] = await Promise.all([
      enrichShifts([active]),
      enrichShifts(openShifts),
      enrichShifts([lastShift]),
    ])
    const activeShift = activeWithOwner[0] || null
    const balance = active ? await cashNet(active._id) : null
    const openWithBalance = await Promise.all(openWithOwner.map(async (shift) => {
      const shiftBalance = await cashNet(shift._id)
      return {
        ...shift,
        ...shiftBalance,
        expected: roundMoney(shift.openingBalance + shiftBalance.net),
      }
    }))
    return res.json({
      open: Boolean(active),
      shift: active
        ? {
            ...activeShift,
            ...balance,
            expected: roundMoney(active.openingBalance + balance.net),
          }
        : null,
      openShifts: openWithBalance,
      lastShift: lastWithOwner[0] || null,
      today: today[0] || { revenue: 0, orders: 0, cash: 0 },
    })
  } catch (error) {
    console.error('Cash status error:', error)
    return res.status(500).json({ error: 'No se pudo leer el estado de caja' })
  }
})

router.post('/shifts', requirePermission('cash.manage'), async (req, res) => {
  const { openingBalance = 0, note = '' } = req.body || {}
  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }
  try {
    const shift = await openShift({
      openingBalance,
      note,
      openedBy: req.user?.email || null,
      openedByUserId: actorId(req),
      includeLegacy: legacyShiftAccess(req),
      tenant,
    })
    return res.status(201).json({ shift })
  } catch (error) {
    if (error?.code === 11000) return res.status(400).json({ error: 'Ya tenés una caja abierta' })
    return res.status(error.status || 500).json({ error: error.message || 'No se pudo abrir la caja' })
  }
})

router.post('/shifts/close', requirePermission('cash.manage'), async (req, res) => {
  const { countedBalance, note = '', shiftId = null } = req.body || {}
  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }
  try {
    if (shiftId && !(await tenantOwnedShift(tenant, shiftId, req))) {
      return res.status(404).json({ error: 'Turno no encontrado' })
    }
    const shift = await closeShift({
      countedBalance,
      note,
      closedBy: req.user?.email || null,
      closedByUserId: actorId(req),
      shiftId,
      userId: actorId(req),
      includeLegacy: legacyShiftAccess(req),
      actorEmail: req.user?.email || null,
      tenant,
    })
    const balance = await cashNet(shift._id)
    const [enriched] = await enrichShifts([shift.toObject()])
    return res.json({
      shift: enriched,
      balance,
      netSales: balance.sales,
      salesCount: balance.salesCount,
    })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'No se pudo cerrar la caja' })
  }
})

router.get('/shifts', requirePermission('cash.manage'), async (req, res) => {
  try {
    const tenant = requireTenantIdOf(req)
    const { page, limit } = parsePagination(req.query)
    const filter = { adminId: tenant }
    if (!canManageAllShifts(req)) {
      filter.$or = [{ openedByUserId: actorId(req) }, { openedBy: req.user?.email || null }]
    }
    if (req.query.status === 'open' || req.query.status === 'closed') {
      filter.status = req.query.status
    }
    const [rawItems, total] = await Promise.all([
      CashShift.find(filter).sort({ openedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CashShift.countDocuments(filter),
    ])

    const enriched = []
    for (const item of rawItems) {
      const balance = await cashNet(item._id)
      enriched.push({
        ...item,
        ...balance,
        expected: item.expectedClose ?? roundMoney(item.openingBalance + balance.net),
      })
    }

    const items = await enrichShifts(enriched)
    return res.json({
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      pageSize: limit,
    })
  } catch (error) {
    console.error('Cash shifts error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los turnos' })
  }
})

router.get('/movements', requirePermission('cash.manage'), async (req, res) => {
  try {
    const tenant = requireTenantIdOf(req)
    const { page, limit } = parsePagination(req.query)
    let shiftId = req.query.shiftId
    let active = null
    let activeShifts = []
    let ownedShift = null
    if (shiftId) {
      ownedShift = await tenantOwnedShift(tenant, shiftId, req)
      if (!ownedShift) {
        return res.status(404).json({ error: 'Turno no encontrado' })
      }
    } else if (canManageAllShifts(req)) {
      activeShifts = await CashShift.find({ status: 'open', adminId: tenant }).sort({ openedAt: -1 }).lean()
    } else {
      active = await currentShift(tenant, actorId(req), { userEmail: req.user?.email || null })
      activeShifts = active ? [active] : []
    }

    const filter = { adminId: tenant }
    if (req.query.kind === 'venta' || req.query.kind === 'ingreso' || req.query.kind === 'egreso' || req.query.kind === 'devolucion') {
      filter.kind = req.query.kind
    }
    if (req.query.operator) {
      filter.by = req.query.operator
    }
    if (ownedShift) {
      filter.shiftId = ownedShift._id
    } else if (activeShifts.length > 0) {
      filter.shiftId = activeShifts.length === 1 ? activeShifts[0]._id : { $in: activeShifts.map((shift) => shift._id) }
    } else {
      return res.json({ shift: null, shifts: [], items: [], total: 0, page, totalPages: 1, pageSize: limit, balance: { net: 0, income: 0, outcome: 0, sales: 0, salesCount: 0 } })
    }

    const [items, total] = await Promise.all([
      CashMovement.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CashMovement.countDocuments(filter),
    ])

    const [shift] = await enrichShifts(ownedShift ? [ownedShift] : activeShifts)
    const shifts = await enrichShifts(activeShifts)
    const balance = await cashNet(filter.shiftId)

    return res.json({
      shift: ownedShift ? shift : active,
      shifts,
      items,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      pageSize: limit,
      balance,
    })
  } catch (error) {
    console.error('Cash movements error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los movimientos' })
  }
})

router.post('/movements', requirePermission('cash.manage'), async (req, res) => {
  const { flow, amount, description = '' } = req.body || {}
  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }
  try {
    const active = await currentShift(tenant, actorId(req), { includeLegacy: legacyShiftAccess(req), userEmail: req.user?.email || null })
    if (!active) {
      return res.status(400).json({ error: 'No hay una caja abierta para registrar el movimiento' })
    }
    if (flow !== 'in' && flow !== 'out') {
      return res.status(400).json({ error: 'El flujo debe ser in o out' })
    }
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Ingresá un monto válido' })
    }
    const movement = await addMovement({
      shiftId: active._id,
      kind: flow === 'in' ? 'ingreso' : 'egreso',
      flow,
      amount,
      description,
      by: req.user?.email || null,
      byUserId: actorId(req),
    })
    return res.status(201).json({ movement })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'No se pudo registrar el movimiento' })
  }
})

router.get('/counts', requirePermission('cash.manage'), async (req, res) => {
  try {
    const tenant = requireTenantIdOf(req)
    let shiftId = req.query.shiftId
    let active = null
    let ownedShift = null
    if (shiftId) {
      ownedShift = await tenantOwnedShift(tenant, shiftId, req)
      if (!ownedShift) {
        return res.status(404).json({ error: 'Turno no encontrado' })
      }
    } else {
      active = await currentShift(tenant, actorId(req), { includeLegacy: legacyShiftAccess(req), userEmail: req.user?.email || null })
    }
    if (!shiftId && !active) {
      return res.json({ shift: null, items: [] })
    }
    const id = shiftId || active._id
    const status = active ? active.status : 'closed'
    const countFilter = { shiftId: id, adminId: tenant }
    if (req.query.operator) {
      countFilter.by = req.query.operator
    }
    const [items, shift] = await Promise.all([
      CashCount.find(countFilter).sort({ createdAt: -1 }).limit(100).lean(),
      shiftId ? ownedShift : active,
    ])
    return res.json({ shift: { ...shift, status }, items })
  } catch (error) {
    console.error('Cash counts error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los arqueos' })
  }
})

router.post('/counts', requirePermission('cash.manage'), async (req, res) => {
  const { countedAmount, note = '', shiftId = null } = req.body || {}
  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }
  try {
    if (shiftId && !(await tenantOwnedShift(tenant, shiftId, req))) {
      return res.status(404).json({ error: 'Turno no encontrado' })
    }
    const count = await createArqueo({
      countedAmount,
      note,
      by: req.user?.email || null,
      byUserId: actorId(req),
      shiftId,
      userId: actorId(req),
      includeLegacy: legacyShiftAccess(req),
      actorEmail: req.user?.email || null,
      tenant,
    })
    return res.status(201).json({ count })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'No se pudo hacer el arqueo' })
  }
})

export default router
