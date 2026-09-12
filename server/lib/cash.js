import { CashMovement } from '../models/CashMovement.js'
import { CashShift } from '../models/CashShift.js'
import { CashCount } from '../models/CashCount.js'

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

export async function currentShift() {
  return CashShift.findOne({ status: 'open' }).lean()
}

export async function openShift({ openingBalance = 0, note = '', openedBy = null }) {
  const existing = await currentShift()
  if (existing) {
    const error = new Error('Ya hay una caja abierta')
    error.status = 400
    throw error
  }
  const number = (await CashShift.countDocuments({})) + 1
  const shift = await CashShift.create({
    number,
    status: 'open',
    openingBalance: Math.max(0, Number(openingBalance) || 0),
    note: note || '',
    openedBy,
  })
  return shift
}

export async function closeShift({ countedBalance, note = '', closedBy = null }) {
  const shift = await CashShift.findOne({ status: 'open' })
  if (!shift) {
    const error = new Error('No hay ninguna caja abierta')
    error.status = 400
    throw error
  }
  const balance = await cashNet(shift._id)
  const expectedClose = Math.round((shift.openingBalance + balance.net) * 100) / 100
  const counted = Math.max(0, Number(countedBalance) || 0)
  shift.expectedClose = expectedClose
  shift.closedBalance = counted
  shift.difference = Math.round((counted - expectedClose) * 100) / 100
  shift.closedBy = closedBy
  shift.note = note ?? shift.note
  shift.status = 'closed'
  shift.closedAt = new Date()
  await shift.save()
  return shift
}

export async function addMovement({ shiftId, kind = 'ingreso', flow = 'in', amount, description = '', ref = null, by = null }) {
  const shift = await CashShift.findById(shiftId)
  if (!shift || shift.status !== 'open') {
    const error = new Error('No hay una caja abierta para registrar el movimiento')
    error.status = 400
    throw error
  }
  return CashMovement.create({
    shiftId,
    kind,
    flow,
    amount: Math.max(0, Number(amount) || 0),
    description: description || '',
    ref,
    by,
  })
}

export async function createArqueo({ countedAmount, note = '', by = null }) {
  const shift = await currentShift()
  if (!shift) {
    const error = new Error('No hay ninguna caja abierta')
    error.status = 400
    throw error
  }
  const balance = await cashNet(shift._id)
  const expected = Math.round((shift.openingBalance + balance.net) * 100) / 100
  const counted = Math.max(0, Number(countedAmount) || 0)
  const diff = Math.round((counted - expected) * 100) / 100
  const count = await CashCount.create({
    shiftId: shift._id,
    expectedAmount: expected,
    countedAmount: counted,
    difference: diff,
    note: note || '',
    by,
  })
  return count
}