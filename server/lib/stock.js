import { Product } from '../models/Product.js'
import { StockMovement } from '../models/StockMovement.js'

const TYPES = new Set(['venta', 'compra', 'ajuste', 'devolucion', 'inventario'])

export async function changeStock({
  productId,
  delta,
  type = 'ajuste',
  reason = '',
  ref = null,
  createdBy = null,
  adminId = null,
}) {
  if (!TYPES.has(type)) return null

  const qty = Math.round(Number(delta))
  if (!Number.isFinite(qty) || qty === 0) return null

  const filter = { id: Number(productId), adminId }
  if (qty < 0) filter.stock = { $gte: -qty }

  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { stock: qty } },
    { returnDocument: 'after' },
  )
  if (!product) return null

  const stockAfter = product.stock
  const stockBefore = stockAfter - qty
  const applied = qty

  const movement = await StockMovement.create({
    adminId,
    productId: product.id,
    productName: product.name,
    delta: applied,
    type,
    reason: String(reason || '').slice(0, 200),
    ref,
    stockBefore,
    stockAfter,
    createdBy,
  })

  return movement
}