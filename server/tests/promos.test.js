import 'dotenv/config'
import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { Discount } from '../models/Discount.js'
import { Coupon } from '../models/Coupon.js'
import { buildCart } from '../services/pricing.js'
import { loadActiveDiscounts, discountRateFor, clearDiscountCache } from '../lib/discounts.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

async function main() {
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-promos'
  await mongoose.connect(base.toString())

  await Promise.all([
    Discount.deleteMany({}),
    Coupon.deleteMany({}),
    Product.deleteMany({}),
  ])
  await clearDiscountCache()

  await Product.create({ id: 1, name: 'Auriculares Test', brand: 'MarcaTest', category: 'audio', price: 10000, stock: 5 })

  await Coupon.create({ code: 'BIENVENIDA10', percent: 10, active: true })
  await Coupon.create({ code: 'PAUSADO20', percent: 20, active: false })
  await Coupon.create({ code: 'ALFOMBRA5', percent: 5, active: true })

  await Discount.create({ name: 'Global 5', scope: 'global', percent: 5, active: true })
  await Discount.create({ name: 'Audio 10', scope: 'category', target: 'audio', percent: 10, active: true })
  await Discount.create({ name: 'Marca 8', scope: 'brand', target: 'MarcaTest', percent: 8, active: true })
  await Discount.create({ name: 'Producto 15', scope: 'product', target: '1', percent: 15, active: true })
  await Discount.create({ name: 'Off', scope: 'global', percent: 90, active: false })

  const rules = await loadActiveDiscounts(true)
  check(rules.length === 4, 'solo cargan reglas activas (4 de 5 creadas)')

  const product = { id: 1, brand: 'MarcaTest', category: 'audio', price: 10000 }
  check(discountRateFor(product, rules) === 15, `gana el % mayor entre reglas aplicables (15), got ${discountRateFor(product, rules)}`)

  let cart = await buildCart([{ id: 1, quantity: 2 }], 'BIENVENIDA10')
  check(cart.subtotal === 17000, `subtotal unitario 8500 x2 = 17000, got ${cart.subtotal}`)
  check(cart.discount === 1700, `cupón 10% sobre subtotal = 1700, got ${cart.discount}`)
  check(cart.coupon === 'BIENVENIDA10', 'cupón activo se aplica')
  check(cart.total === 17000 - 1700 + 5999, `total con envío = ${cart.total}`)

  cart = await buildCart([{ id: 1, quantity: 1 }], 'PAUSADO20')
  check(cart.coupon === null && cart.discount === 0, 'cupón desactivado no aplica')

  cart = await buildCart([{ id: 1, quantity: 1 }], 'alfombra5')
  check(cart.coupon === 'ALFOMBRA5' && cart.discount === 425, 'código se normaliza a mayúsculas y aplica')

  await Coupon.updateOne({ code: 'BIENVENIDA10' }, { active: false })
  cart = await buildCart([{ id: 1, quantity: 1 }], 'BIENVENIDA10')
  check(cart.coupon === null, 'cupón pausado deja de aplicar')

  cart = await buildCart([{ id: 1, quantity: 1 }], 'CODIGOINVENTADO')
  check(cart.coupon === null && cart.subtotal === 8500, 'codigo inexistente no descuenta, subtotal 8500')

  const dbUrl = base.toString()
  await mongoose.disconnect()
  console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
  console.log(`test db: ${dbUrl}`)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})