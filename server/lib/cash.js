import { CashMovement } from '../models/CashMovement.js'
import { CashShift } from '../models/CashShift.js'
import { CashCount } from '../models/CashCount.js'
import { nextSequence, sequenceKey } from './counter.js'
import { roundMoney } from './money.js'

export async function cashNet(shiftId) {
  const rows = await CashMovement.aggregate([
    { $match: { shiftId } },
    {
      $group: {
        _id: null,
        net: {
          $sum: {
            $cond: [{ $eq: ['$flow', 'in'] }, '$amount', { $multiply: ['$amount', -1] }],
          },
        },
        income: { $sum: { $cond: [{ $eq: ['$flow', 'in'] }, '$amount', 0] } },
        outcome: { $sum: { $cond: [{ $eq: ['$flow', 'out'] }, '$amount', 0] } },
        sales: {
          $sum: { $cond: [{ $eq: ['$kind', 'venta'] }, '$amount', 0] },
        },
        salesCount: { $sum: { $cond: [{ $eq: ['$kind', 'venta'] }, 1, 0] } },
      },
    },
  ])
  const row = rows[0]
  return {
    net: row?.net || 0,
    income: row?.income || 0,
    outcome: row?.outcome || 0,
    sales: row?.sales || 0,
    salesCount: row?.salesCount || 0,
  }
}

function tenantShiftFilter(tenant, status = 'open') {
  return tenant ? { status, adminId: tenant } : { status, adminId: null }
}

function ownerFilter(filter, userId, { includeLegacy = false, userEmail = null } = {}) {
  if (!userId) return filter
  filter.$or = [{ openedByUserId: userId }]
  if (userEmail) filter.$or.push({ openedBy: userEmail })
  if (includeLegacy) filter.$or.push({ openedByUserId: null })
  return filter
}

export async function currentShift(tenant = null, userId = null, { includeLegacy = false, userEmail = null } = {}) {
  const filter = ownerFilter(tenantShiftFilter(tenant), userId, { includeLegacy, userEmail })
  return CashShift.findOne(filter).sort({ openedAt: -1 }).lean()
}

export async function openShift({
  openingBalance = 0,
  note = '',
  openedBy = null,
  openedByUserId = null,
  tenant = null,
  includeLegacy = false,
}) {
  const existing = await currentShift(tenant, openedByUserId, { includeLegacy, userEmail: openedBy })
  if (existing) {
    const error = new Error('Ya tenés una caja abierta')
    error.status = 400
    throw error
  }
  const filter = tenant ? { adminId: tenant } : { adminId: null }
  const number = await nextSequence(sequenceKey(tenant, 'shift'), await CashShift.countDocuments(filter))
  const shift = await CashShift.create({
    adminId: tenant,
    number,
    status: 'open',
    openingBalance: roundMoney(Math.max(0, Number(openingBalance) || 0)),
    note: note || '',
    openedBy,
    openedByUserId,
  })
  return shift
}

export async function closeShift({
  countedBalance,
  note = '',
  closedBy = null,
  closedByUserId = null,
  shiftId = null,
  userId = null,
  tenant = null,
  includeLegacy = false,
  actorEmail = null,
}) {
  const filter = tenantShiftFilter(tenant)
  if (shiftId) filter._id = shiftId
  else ownerFilter(filter, userId, { includeLegacy, userEmail: actorEmail })
  const shift = await CashShift.findOne(filter).sort({ openedAt: -1 })
  if (!shift) {
    const error = new Error('No hay ninguna caja abierta')
    error.status = 400
    throw error
  }
  const balance = await cashNet(shift._id)
  const expectedClose = roundMoney(shift.openingBalance + balance.net)
  const counted = roundMoney(Math.max(0, Number(countedBalance) || 0))
  shift.expectedClose = expectedClose
  shift.closedBalance = counted
  shift.difference = roundMoney(counted - expectedClose)
  shift.closedBy = closedBy
  shift.closedByUserId = closedByUserId
  shift.note = note ?? shift.note
  shift.status = 'closed'
  shift.closedAt = new Date()
  await shift.save()
  return shift
}

export async function addMovement({
  shiftId,
  kind = 'ingreso',
  flow = 'in',
  amount,
  description = '',
  ref = null,
  by = null,
  byUserId = null,
}) {
  const shift = await CashShift.findById(shiftId)
  if (!shift || shift.status !== 'open') {
    const error = new Error('No hay una caja abierta para registrar el movimiento')
    error.status = 400
    throw error
  }
  return CashMovement.create({
    adminId: shift.adminId || null,
    shiftId,
    kind,
    flow,
    amount: roundMoney(Math.max(0, Number(amount) || 0)),
    description: description || '',
    ref,
    by,
    byUserId,
  })
}

export async function createArqueo({
  countedAmount,
  note = '',
  by = null,
  byUserId = null,
  shiftId = null,
  userId = null,
  tenant = null,
  includeLegacy = false,
  actorEmail = null,
}) {
  const shift = shiftId
    ? await CashShift.findOne({ _id: shiftId, ...tenantShiftFilter(tenant, 'open') }).lean()
    : await currentShift(tenant, userId, { includeLegacy, userEmail: actorEmail })
  if (!shift) {
    const error = new Error('No hay ninguna caja abierta')
    error.status = 400
    throw error
  }
  const balance = await cashNet(shift._id)
  const expected = roundMoney(shift.openingBalance + balance.net)
  const counted = roundMoney(Math.max(0, Number(countedAmount) || 0))
  const diff = roundMoney(counted - expected)
  const count = await CashCount.create({
    adminId: shift.adminId || null,
    shiftId: shift._id,
    expectedAmount: expected,
    countedAmount: counted,
    difference: diff,
    note: note || '',
    by,
    byUserId,
  })
  return count
}
