import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { StockMovement } from '../models/StockMovement.js'
import { deductApprovedStock } from '../lib/order-stock.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

async function main() {
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-checkout-stock'
  await mongoose.connect(base.toString())

  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({}), StockMovement.deleteMany({})])

  const admin = await User.create({ name: 'admin', email: `admin-${Date.now()}@test.com`, passwordHash: 'x', role: 'admin' })
  await Product.create({ adminId: admin._id, id: 1, name: 'Auriculares', brand: 'Sony', category: 'audio', price: 100, stock: 3 })

  const baseOrder = {
    adminId: admin._id,
    status: 'approved',
    source: 'web',
    items: [{ productId: 1, name: 'Auriculares', unitPrice: 100, quantity: 2 }],
    subtotal: 200,
    discount: 0,
    shippingCost: 0,
    total: 200,
  }

  const order = await Order.create(baseOrder)
  const res = await deductApprovedStock(order)
  check(!!res && res.count === 1, 'aprobada la orden, descuenta stock')

  const product = await Product.findOne({ id: 1, adminId: admin._id }).lean()
  check(product.stock === 1, `stock descontado de 3 a 1 (got ${product.stock})`)

  const movs = await StockMovement.find({ ref: String(order._id) }).lean()
  check(movs.length === 1 && movs[0].delta === -2 && movs[0].type === 'venta', 'crea un StockMovement de venta con delta -2')
  check(movs[0].stockBefore === 3 && movs[0].stockAfter === 1, 'movimiento registra stockBefore/stockAfter correctos')

  const fresh = await Order.findById(order._id).lean()
  check(fresh.stockDeducted === true, 'la orden queda marcada con stockDeducted')

  const again = await deductApprovedStock(await Order.findById(order._id))
  check(!again, 'segunda llamada no vuelve a descontar (idempotente)')
  check((await Product.findOne({ id: 1, adminId: admin._id }).lean()).stock === 1, 'el stock no se descontó dos veces')

  await Order.deleteOne({ _id: order._id })
  await Product.updateOne({ id: 1, adminId: admin._id }, { $set: { stock: 1 } })

  const over = await Order.create({
    ...baseOrder,
    items: [{ productId: 1, name: 'Auriculares', unitPrice: 100, quantity: 5 }],
    subtotal: 500,
    total: 500,
  })
  let threw = null
  try {
    await deductApprovedStock(over)
  } catch (error) {
    threw = error
  }
  check(threw && threw.code === 'OUT_OF_STOCK', 'sin stock suficiente, lanza OUT_OF_STOCK')
  const afterFail = await Order.findById(over._id).lean()
  check(afterFail.stockDeducted === false, 'tras el fallo la orden queda libre para reintentar')
  check((await Product.findOne({ id: 1, adminId: admin._id }).lean()).stock === 1, 'el fallo no deja stock descontado a medias')

  await mongoose.disconnect()
  console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})