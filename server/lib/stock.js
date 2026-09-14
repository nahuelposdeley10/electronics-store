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
  const product = await Product.findOne({ id: Number(productId), adminId })
  if (!product || !TYPES.has(type)) return null

  const qty = Math.round(Number(delta))
  if (!Number.isFinite(qty) || qty === 0) return null

  const stockBefore = product.stock
  const stockAfter = Math.max(0, stockBefore + qty)
  const applied = stockAfter - stockBefore

  if (applied === 0) return null

  product.stock = stockAfter
  await product.save()

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