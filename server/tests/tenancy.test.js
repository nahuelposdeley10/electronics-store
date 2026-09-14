import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Order } from '../models/Order.js'
import { Coupon } from '../models/Coupon.js'
import { Quote } from '../models/Quote.js'
import { Purchase } from '../models/Purchase.js'
import { StockMovement } from '../models/StockMovement.js'
import { Category } from '../models/Category.js'
import { buildCart } from '../services/pricing.js'
import { changeStock } from '../lib/stock.js'
import { slugToAdminId } from '../lib/tenant.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

async function makeUser(role) {
  const email = `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`
  const user = await User.create({ name: role, email, passwordHash: 'x', role })
  return user
}

async function main() {
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-tenancy'
  await mongoose.connect(base.toString())

  await User.deleteMany({})

  const adminA = await makeUser('admin')
  const adminB = await makeUser('admin')
  const operatorA = await makeUser('operator')
  operatorA.adminId = adminA._id
  await operatorA.save()

  await Promise.all([
    Product.deleteMany({}),
    Order.deleteMany({}),
    Coupon.deleteMany({}),
    Quote.deleteMany({}),
    Purchase.deleteMany({}),
    StockMovement.deleteMany({}),
    Category.deleteMany({}),
  ])

  await adminA.updateOne({ businessSlug: 'negocio-a' })
  await adminB.updateOne({ businessSlug: 'negocio-b' })

  await Category.create([
    { adminId: adminA._id, key: 'audio', name: 'Audio' },
    { adminId: adminB._id, key: 'audio', name: 'Audio' },
  ])

  await Product.create({ adminId: adminA._id, id: 1, name: 'Producto A', brand: 'A', category: 'audio', price: 100, stock: 10 })
  await Product.create({ adminId: adminB._id, id: 1, name: 'Producto B', brand: 'B', category: 'audio', price: 200, stock: 10 })
  await Coupon.create({ adminId: adminA._id, code: 'A10', percent: 10, active: true })
  await Coupon.create({ adminId: adminB._id, code: 'A10', percent: 50, active: true })

  const idA = await slugToAdminId('neGocio-A')
  check(idA && idA.toString() === adminA._id.toString(), 'slug -> adminId (case insensitive)')

  const cartA = await buildCart([{ id: 1, quantity: 1 }], 'A10', adminA._id)
  const cartB = await buildCart([{ id: 1, quantity: 1 }], 'A10', adminB._id)
  check(cartA.subtotal === 100, 'A ve su propio producto (precio 100), got ' + cartA.subtotal)
  check(cartB.subtotal === 200, 'B ve su propio producto (precio 200), got ' + cartB.subtotal)
  check(cartA.discount === 10 && cartA.coupon === 'A10', 'A aplica su cupón 10%')
  check(cartB.discount === 100 && cartB.coupon === 'A10', 'B aplica SU cupón (50%) aunque el código coincida')
  check(cartA.total === 100 - 10 + 5999, `total A con envío = ${cartA.total}`)

  await Order.create({ adminId: adminA._id, status: 'approved', subtotal: 100, discount: 0, shippingCost: 0, total: 100 })
  await Order.create({ adminId: adminB._id, status: 'approved', subtotal: 200, discount: 0, shippingCost: 0, total: 200 })

  const ordersA = await Order.find({ adminId: adminA._id }).lean()
  const ordersB = await Order.find({ adminId: adminB._id }).lean()
  check(ordersA.length === 1 && ordersA[0].total === 100, 'A ve solo sus órdenes')
  check(ordersB.length === 1 && ordersB[0].total === 200, 'B ve solo sus órdenes')
  const crossOrder = await Order.findOne({ _id: ordersB[0]._id, adminId: adminA._id }).lean()
  check(!crossOrder, 'A no puede referenciar órdenes de B por id')
  const crossProduct = await Product.findOne({ id: 1, adminId: adminA._id }).lean()
  check(crossProduct && crossProduct.name === 'Producto A', 'A busca por id=1 y ve su propio producto')

  const seqA = await Product.findOne({ adminId: adminA._id }).sort({ id: -1 }).lean()
  const seqB = await Product.findOne({ adminId: adminB._id }).sort({ id: -1 }).lean()
  check(seqA.id === 1 && seqB.id === 1, 'secuencia de ids independiente por negocio')

  const movB = await changeStock({ productId: 1, delta: 2, type: 'ajuste', reason: 'test', adminId: adminB._id })
  check(movB && (await StockMovement.countDocuments({ adminId: adminA._id })) === 0, 'movimiento de stock no cruza tenant')
  const sameIdProdA = await Product.findOne({ adminId: adminA._id, id: 1 }).lean()
  check(sameIdProdA.stock === 10, `el ajuste de B no toca el stock de A (got ${sameIdProdA.stock})`)

  await Quote.create({ adminId: adminA._id, number: 1, status: 'draft', customer: { name: 'cli' }, items: [], subtotal: 0, discount: 0, total: 0 })
  await Quote.create({ adminId: adminB._id, number: 1, status: 'draft', customer: { name: 'cli' }, items: [], subtotal: 0, discount: 0, total: 0 })
  const quoteA = await Quote.findOne({ number: 1, adminId: adminA._id }).lean()
  const crossQuote = await Quote.findOne({ _id: quoteA._id, adminId: adminB._id }).lean()
  check(quoteA && !crossQuote, 'Quote #1 es de A; B no puede leerla por id')

  await mongoose.disconnect()
  console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})