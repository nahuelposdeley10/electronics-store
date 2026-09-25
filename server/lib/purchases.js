import { Product } from '../models/Product.js'
import { Purchase } from '../models/Purchase.js'
import { changeStock } from './stock.js'
import { roundMoney, roundLine } from './money.js'
import { nextSequence, sequenceKey } from './counter.js'
import { currentShift, addMovement } from './cash.js'

export async function registerPurchase({ tenant, supplier, invoice, items, by = null, cashOut = null }) {
  const cleanSupplier = String(supplier || '').trim()
  const cleanInvoice = String(invoice || '').trim()
  const cleanItems = (items || [])
    .map((row) => ({
      productId: Number(row?.productId),
      quantity: Math.floor(Number(row?.quantity)),
      cost: roundMoney(row?.cost),
    }))
    .filter(
      (row) =>
        Number.isFinite(row.productId) && row.quantity > 0 && Number.isFinite(row.cost) && row.cost >= 0,
    )

  if (cleanSupplier.length < 2) {
    const error = new Error('Nombrá el proveedor')
    error.status = 400
    throw error
  }
  if (cleanItems.length === 0) {
    const error = new Error('Agregá al menos un producto a la compra')
    error.status = 400
    throw error
  }

  const ids = [...new Set(cleanItems.map((row) => row.productId))]
  const dbProducts = await Product.find({ id: { $in: ids }, adminId: tenant }).lean()
  const byId = new Map(dbProducts.map((p) => [p.id, p]))
  if (byId.size !== ids.length) {
    const error = new Error('Algún producto ya no existe')
    error.status = 400
    throw error
  }

  const reference = `${cleanSupplier}${cleanInvoice ? ` · Fact. ${cleanInvoice}` : ''}`
  const lastNumber =
    (await Purchase.findOne({ adminId: tenant }).sort({ number: -1 }).lean())?.number || 0
  const number = await nextSequence(sequenceKey(tenant, 'purchase'), lastNumber)

  const lines = []
  let total = 0
  for (const row of cleanItems) {
    const product = byId.get(row.productId)
    const lineTotal = roundLine(row.cost, row.quantity)
    total += lineTotal
    lines.push({
      productId: product.id,
      name: product.name,
      quantity: row.quantity,
      cost: row.cost,
      total: lineTotal,
    })
  }
  total = roundMoney(total)

  const purchase = await Purchase.create({
    adminId: tenant,
    number,
    supplier: cleanSupplier,
    invoice: cleanInvoice,
    items: lines,
    total,
    createdBy: by || null,
  })

  const logged = []
  for (const row of cleanItems) {
    const product = byId.get(row.productId)
    if (Number.isFinite(row.cost) && product.costPrice !== row.cost) {
      await Product.updateOne({ id: product.id, adminId: tenant }, { $set: { costPrice: row.cost } })
    }
    const movement = await changeStock({
      productId: product.id,
      delta: row.quantity,
      type: 'compra',
      reason: reference,
      ref: String(number),
      createdBy: by || null,
      adminId: tenant,
    })
    logged.push({
      productId: product.id,
      delta: movement ? movement.delta : 0,
      stockAfter: movement ? movement.stockAfter : product.stock,
    })
  }

  let cashWarning = ''
  const cashAmount = roundMoney(Number(cashOut?.amount))
  if (cashAmount > 0) {
    try {
      const shift = await currentShift(tenant)
      if (!shift) {
        cashWarning =
          'El pago de la compra no se registró en caja porque no hay ninguna caja abierta'
      } else {
        const method = String(cashOut?.method || '').trim()
        const description = `Compra #${number} — ${cleanSupplier}${method ? ` (${method})` : ''}`
        await addMovement({
          shiftId: shift._id,
          kind: 'egreso',
          flow: 'out',
          amount: cashAmount,
          description,
          ref: String(number),
          by: by || null,
        })
      }
    } catch (error) {
      cashWarning = error.message || 'No se pudo registrar el pago de la compra en caja'
    }
  }

  return { purchase, logged, number, total, cashWarning }
}