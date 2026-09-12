import 'dotenv/config'
import mongoose from 'mongoose'
import { Product } from '../models/Product.js'
import { Coupon } from '../models/Coupon.js'
import { buildCart } from '../services/pricing.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

async function main() {
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-promos'
  await mongoose.connect(base.toString())

  await Promise.all([Coupon.deleteMany({}), Product.deleteMany({})])

  await Product.create({ id: 1, name: 'Auriculares Test', brand: 'MarcaTest', category: 'audio', price: 10000, stock: 5 })

  await Coupon.create({ code: 'BIENVENIDA10', percent: 10, active: true })
  await Coupon.create({ code: 'PAUSADO20', percent: 20, active: false })
  await Coupon.create({ code: 'ALFOMBRA5', percent: 5, active: true })

  let cart = await buildCart([{ id: 1, quantity: 2 }], 'BIENVENIDA10')
  check(cart.subtotal === 20000, `subtotal unitario 10000 x2 = 20000, got ${cart.subtotal}`)
  check(cart.discount === 2000, `cupón 10% sobre subtotal = 2000, got ${cart.discount}`)
  check(cart.coupon === 'BIENVENIDA10', 'cupón activo se aplica')
  check(cart.total === 20000 - 2000 + 5999, `total con envío = ${cart.total}`)

  cart = await buildCart([{ id: 1, quantity: 1 }], 'PAUSADO20')
  check(cart.coupon === null && cart.discount === 0, 'cupón desactivado no aplica')

  cart = await buildCart([{ id: 1, quantity: 1 }], 'alfombra5')
  check(cart.coupon === 'ALFOMBRA5' && cart.discount === 500, 'código se normaliza a mayúsculas y aplica')

  await Coupon.updateOne({ code: 'BIENVENIDA10' }, { active: false })
  cart = await buildCart([{ id: 1, quantity: 1 }], 'BIENVENIDA10')
  check(cart.coupon === null, 'cupón pausado deja de aplicar')

  cart = await buildCart([{ id: 1, quantity: 1 }], 'CODIGOINVENTADO')
  check(cart.coupon === null && cart.subtotal === 10000, 'codigo inexistente no descuenta, subtotal 10000')

  await mongoose.disconnect()
  console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})