import 'dotenv/config'
import { MongoClient } from 'mongodb'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'

if (!process.env.MONGODB_URI) throw new Error('Falta MONGODB_URI')
const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 8000 })
const databaseName = 'electronic_store_isolated_test_' + randomUUID().replaceAll('-', '')
let created = false

try {
  await client.connect()
  const db = client.db(databaseName)
  const products = db.collection('products')
  const orders = db.collection('orders')
  const movements = db.collection('movements')
  created = true

  await products.insertOne({ _id: 'product-1', stock: 1 })
  await orders.insertMany([
    { _id: 'order-a', status: 'approved', stockDeducted: false },
    { _id: 'order-b', status: 'approved', stockDeducted: false },
  ])

  async function buy(orderId) {
    const session = client.startSession()
    try {
      await session.withTransaction(async () => {
        const claim = await orders.updateOne(
          { _id: orderId, stockDeducted: false },
          { $set: { stockDeducted: true } },
          { session },
        )
        if (claim.modifiedCount !== 1) throw new Error('ORDER_ALREADY_CLAIMED')
        const result = await products.findOneAndUpdate(
          { _id: 'product-1', stock: { $gte: 1 } },
          { $inc: { stock: -1 } },
          { session, returnDocument: 'after' },
        )
        if (!result) throw new Error('OUT_OF_STOCK')
        await movements.insertOne({ orderId, stockAfter: result.stock }, { session })
      })
      return { orderId, ok: true }
    } catch (error) {
      return { orderId, ok: false, reason: error.message }
    } finally {
      await session.endSession()
    }
  }

  const results = await Promise.all([buy('order-a'), buy('order-b')])
  const successCount = results.filter((result) => result.ok).length
  const product = await products.findOne({ _id: 'product-1' })
  const movementCount = await movements.countDocuments()
  const deductedCount = await orders.countDocuments({ stockDeducted: true })
  assert.equal(successCount, 1, 'Solo una compra debe aprobar descuento')
  assert.equal(product.stock, 0, 'El stock nunca puede ser negativo')
  assert.equal(movementCount, 1, 'Solo debe existir un movimiento')
  assert.equal(deductedCount, 1, 'Solo una orden debe marcarse como descontada')
  console.log('OK: dos compras simultáneas, una unidad disponible, una sola deducción.')
  console.log('OK: stock final 0, un movimiento, una orden descontada.')

  const retry = await buy(results.find((result) => result.ok).orderId)
  assert.equal(retry.ok, false)
  assert.equal(await movements.countDocuments(), 1)
  console.log('OK: el reintento no duplica movimientos.')
} finally {
  if (created) {
    try {
      await client.db(databaseName).dropDatabase()
      console.log('Base aislada de pruebas eliminada.')
    } catch (error) {
      console.error('ATENCIÓN: no se pudo eliminar la base aislada:', databaseName, error.message)
      process.exitCode = 1
    }
  }
  await client.close()
}