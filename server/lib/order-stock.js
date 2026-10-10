import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { StockMovement } from '../models/StockMovement.js'

/**
 * Atomically claim and deduct stock for an approved web order.
 * Requires a MongoDB replica set or sharded cluster (transactions enabled).
 * Never fall back to partial deductions when transactions are unavailable.
 */
export async function deductApprovedStock(order) {
  if (!order || order.status !== 'approved' || order.source === 'pos' || order.stockDeducted) {
    return null
  }

  const session = await mongoose.startSession()
  let deductedCount = 0
  let claimedOrder = false
  try {
    await session.withTransaction(async () => {
      const claim = await Order.updateOne(
        { _id: order._id, status: 'approved', stockDeducted: false },
        { $set: { stockDeducted: true } },
        { session },
      )
      if (claim.modifiedCount !== 1) return
      claimedOrder = true

      for (const line of order.items) {
        const product = await Product.findOneAndUpdate(
          { id: line.productId, adminId: order.adminId, stock: { $gte: line.quantity } },
          { $inc: { stock: -line.quantity } },
          { returnDocument: 'after', session },
        )
        if (!product) {
          const error = new Error(`Stock insuficiente de "${line.name}" (id ${line.productId})`)
          error.code = 'OUT_OF_STOCK'
          throw error
        }

        await StockMovement.create([{
          adminId: order.adminId,
          productId: product.id,
          productName: product.name,
          delta: -line.quantity,
          type: 'venta',
          reason: 'Venta web',
          ref: String(order._id),
          stockBefore: product.stock + line.quantity,
          stockAfter: product.stock,
        }], { session })
        deductedCount += 1
      }
    })
  } finally {
    await session.endSession()
  }

  if (!claimedOrder) return null
  order.stockDeducted = true
  return { order, count: deductedCount }
}