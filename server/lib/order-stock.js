import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { StockMovement } from '../models/StockMovement.js'

export async function deductApprovedStock(order) {
  if (!order || order.status !== 'approved' || order.source === 'pos' || order.stockDeducted) {
    return null
  }

  const claimed = await Order.updateOne(
    { _id: order._id, stockDeducted: false },
    { $set: { stockDeducted: true } },
  )
  if (claimed.modifiedCount !== 1) return null

  const done = []
  try {
    for (const line of order.items) {
      const product = await Product.findOneAndUpdate(
        { id: line.productId, adminId: order.adminId, stock: { $gte: line.quantity } },
        { $inc: { stock: -line.quantity } },
        { returnDocument: 'after' },
      )
      if (!product) {
        const error = new Error(`Stock insuficiente de "${line.name}" (id ${line.productId})`)
        error.code = 'OUT_OF_STOCK'
        throw error
      }
      const delta = -line.quantity
      await StockMovement.create({
        adminId: order.adminId,
        productId: product.id,
        productName: product.name,
        delta,
        type: 'venta',
        reason: 'Venta web',
        ref: String(order._id),
        stockBefore: product.stock - delta,
        stockAfter: product.stock,
      })
      done.push({ productId: product.id, quantity: line.quantity })
    }
  } catch (error) {
    for (const item of done) {
      await Product.updateOne(
        { id: item.productId, adminId: order.adminId },
        { $inc: { stock: item.quantity } },
      )
    }
    await StockMovement.deleteMany({ ref: String(order._id), type: 'venta' })
    await Order.updateOne({ _id: order._id }, { $set: { stockDeducted: false } })
    throw error
  }

  order.stockDeducted = true
  return { order, count: done.length }
}