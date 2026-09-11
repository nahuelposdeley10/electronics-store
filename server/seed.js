import 'dotenv/config'
import mongoose from 'mongoose'
import { Order } from './models/Order.js'
import { seedProducts } from './data/products.js'
import { coupons } from '../src/data/format.js'

const FREE_SHIPPING_THRESHOLD = 300000
const SHIPPING_COST = 5999

const STATUS_POOL = [
  'approved',
  'approved',
  'approved',
  'approved',
  'approved',
  'approved',
  'pending',
  'pending',
  'in_process',
  'rejected',
  'rejected',
  'cancelled',
]
const COUPON_POOL = [null, null, null, 'BIENVENIDA10', 'STORE15']

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

function randomItems() {
  const count = 1 + Math.floor(Math.random() * 3)
  const pool = [...seedProducts]
  const chosen = []
  for (let i = 0; i < count && pool.length; i++) {
    chosen.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0])
  }
  return chosen.map((p) => ({
    productId: p.id,
    name: p.name,
    unitPrice: p.price,
    quantity: 1 + Math.floor(Math.random() * 2),
  }))
}

function buildTotals(items, coupon) {
  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0)
  const discountRate = coupon ? coupons[coupon] || 0 : 0
  const discount = Math.round((subtotal * discountRate) / 100)
  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST
  return { subtotal, discount, shippingCost, total: subtotal - discount + shippingCost }
}

function demoOrders() {
  return STATUS_POOL.map((status, index) => {
    const items = randomItems()
    const coupon = pick(COUPON_POOL)
    const totals = buildTotals(items, coupon)
    const createdAt = new Date(
      Date.now() - (Math.floor(Math.random() * 30) * 86400000 + index * 7200000),
    )
    return {
      status,
      items,
      coupon,
      ...totals,
      demo: true,
      createdAt,
      updatedAt: createdAt,
    }
  })
}

async function seed() {
  const existing = await Order.countDocuments()
  console.log(`Órdenes existentes: ${existing}`)

  await Order.deleteMany({ demo: true })
  const docs = demoOrders()
  await Order.insertMany(docs)
  console.log(`Sembradas ${docs.length} órdenes demo.`)
}

mongoose
  .connect(process.env.MONGODB_URI, { dbName: 'electronics-store' })
  .then(seed)
  .then(() => mongoose.disconnect())
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Seed error:', error)
    process.exit(1)
  })