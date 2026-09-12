import express from 'express'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { parsePagination } from '../lib/catalog-query.js'
import { cashNet, currentShift, openShift, closeShift, addMovement, createArqueo } from '../lib/cash.js'
import { CashShift } from '../models/CashShift.js'
import { CashMovement } from '../models/CashMovement.js'
import { CashCount } from '../models/CashCount.js'
import { Order } from '../models/Order.js'

const router = express.Router()

router.use(requireAuth)

router.get('/status', async (req, res) => {
  try {
    const active = await currentShift()
    const lastShift = await CashShift.findOne({ status: 'closed' }).sort({ closedAt: -1 }).lean()

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const today = await Order.aggregate([
      { $match: { status: 'approved', createdAt: { $gte: todayStart } } },
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

    if (!active) {
      return res.json({
        open: false,
        shift: null,
        lastShift,
        today: today[0] || { revenue: 0, orders: 0, cash: 0 },
      })
    }

    const balance = await cashNet(active._id)
    return res.json({
      open: true,
      shift: {
        _id: active._id,
        number: active.number,
        openedAt: active.openedAt,
        openedBy: active.openedBy,
        openingBalance: active.openingBalance,
        note: active.note,
        ...balance,
        expected: Math.round((active.openingBalance + balance.net) * 100) / 100,
      },
      lastShift,
      today: today[0] || { revenue: 0, orders: 0, cash: 0 },
    })
  } catch (error) {
    console.error('Cash status error:', error)
    return res.status(500).json({ error: 'No se pudo leer el estado de caja' })
  }
})

router.post('/shifts', requirePermission('cash.manage'), async (req, res) => {
  const { openingBalance = 0, note = '' } = req.body || {}
  try {
    const shift = await openShift({
      openingBalance,
      note,
      openedBy: req.user?.email || null,
    })
    return res.status(201).json({ shift })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'No se pudo abrir la caja' })
  }
})

router.post('/shifts/close', requirePermission('cash.manage'), async (req, res) => {
  const { countedBalance, note = '' } = req.body || {}
  try {
    const shift = await closeShift({
      countedBalance,
      note,
      closedBy: req.user?.email || null,
    })
    const balance = await cashNet(shift._id)
    return res.json({
      shift,
      balance,
      netSales: balance.sales,
      salesCount: balance.salesCount,
    })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'No se pudo cerrar la caja' })
  }
})

router.get('/shifts', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    const filter = {}
    if (req.query.status === 'open' || req.query.status === 'closed') {
      filter.status = req.query.status
    }
    const [items, total] = await Promise.all([
      CashShift.find(filter).sort({ openedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CashShift.countDocuments(filter),
    ])

    const enriched = []
    for (const item of items) {
      const balance = await cashNet(item._id)
      enriched.push({
        ...item,
        ...balance,
        expected: item.expectedClose ?? Math.round((item.openingBalance + balance.net) * 100) / 100,
      })
    }

    return res.json({
      items: enriched,
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

router.get('/movements', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    let shiftId = req.query.shiftId
    let active = null
    if (!shiftId) {
      active = await currentShift()
    }

    const filter = {}
    if (req.query.kind === 'venta' || req.query.kind === 'ingreso' || req.query.kind === 'egreso' || req.query.kind === 'devolucion') {
      filter.kind = req.query.kind
    }
    if (shiftId) {
      filter.shiftId = shiftId
    } else if (active) {
      filter.shiftId = active._id
    } else {
      return res.json({ shift: null, items: [], total: 0, page, totalPages: 1, pageSize: limit, balance: { net: 0, income: 0, outcome: 0, sales: 0, salesCount: 0 } })
    }

    const [items, total] = await Promise.all([
      CashMovement.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      CashMovement.countDocuments(filter),
    ])

    const shift = active
      ? { _id: active._id, number: active.number, openedAt: active.openedAt, status: active.status }
      : await CashShift.findById(filter.shiftId).select('number openedAt status').lean()
    const balance = await cashNet(filter.shiftId)

    return res.json({
      shift,
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
  try {
    const active = await currentShift()
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
    })
    return res.status(201).json({ movement })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'No se pudo registrar el movimiento' })
  }
})

router.get('/counts', async (req, res) => {
  try {
    let shiftId = req.query.shiftId
    let active = null
    if (!shiftId) {
      active = await currentShift()
    }
    if (!shiftId && !active) {
      return res.json({ shift: null, items: [] })
    }
    const id = shiftId || active._id
    const status = active ? active.status : 'closed'
    const [items, shift] = await Promise.all([
      CashCount.find({ shiftId: id }).sort({ createdAt: -1 }).limit(100).lean(),
      shiftId
        ? CashShift.findById(id).select('number openedAt status').lean()
        : active,
    ])
    return res.json({ shift: { ...shift, status }, items })
  } catch (error) {
    console.error('Cash counts error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los arqueos' })
  }
})

router.post('/counts', requirePermission('cash.manage'), async (req, res) => {
  const { countedAmount, note = '' } = req.body || {}
  try {
    const count = await createArqueo({
      countedAmount,
      note,
      by: req.user?.email || null,
    })
    return res.status(201).json({ count })
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message || 'No se pudo hacer el arqueo' })
  }
})

export default router