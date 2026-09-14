import 'dotenv/config'
import mongoose from 'mongoose'
import express from 'express'
import { createServer } from 'node:http'
import { Order } from '../models/Order.js'
import { StockMovement } from '../models/StockMovement.js'
import checkoutRouter from '../routes/checkout.js'
import { createRefreshToken, verifyRefreshToken } from '../lib/order-token.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

async function main() {
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-refresh'
  await mongoose.connect(base.toString())

  await Promise.all([Order.deleteMany({}), StockMovement.deleteMany({})])

  check(verifyRefreshToken('a', 'a') === true, 'token correcto pasa la verificación')
  check(verifyRefreshToken('a', 'b') === false, 'token distinto no pasa')
  check(verifyRefreshToken(null, 'a') === false, 'orden sin token no pasa')
  check(verifyRefreshToken('a', null) === false, 'requester sin token no pasa')

  const app = express()
  app.use(express.json())
  app.use('/api', checkoutRouter)
  const server = createServer(app)
  await new Promise((resolve) => server.listen(0, resolve))
  const port = server.address().port
  const refresh = (id, token) =>
    fetch(`http://127.0.0.1:${port}/api/orders/${id}/refresh`, {
      method: 'POST',
      headers: token ? { 'x-refresh-token': token } : {},
    })

  const token = createRefreshToken()
  const pending = await Order.create({
    status: 'pending',
    refreshToken: token,
    items: [{ productId: 1, name: 'Auriculares', unitPrice: 100, quantity: 1 }],
    subtotal: 100,
    discount: 0,
    shippingCost: 0,
    total: 100,
    payerEmail: 'comprador@test.com',
    payerName: 'Ana',
    payerSurname: 'Pérez',
    payerIdType: 'DNI',
    payerIdNumber: '12345678',
  })

  let res = await refresh(pending._id, null)
  check(res.status === 404, 'sin token no revela la orden (404)')

  res = await refresh(pending._id, 'token-invalido')
  check(res.status === 404, 'token incorrecto no revela la orden (404)')

  res = await refresh('000000000000000000000000', token)
  check(res.status === 404, 'id inexistente con token válido no revela nada (404)')

  check(verifyRefreshToken(token, '') === false, 'token vacío rechazado')

  const approved = await Order.create({
    status: 'approved',
    refreshToken: token,
    paymentId: 999001,
    items: [],
    subtotal: 100,
    discount: 0,
    shippingCost: 0,
    total: 100,
    payerEmail: 'comprador@test.com',
    payerName: 'Ana',
    payerSurname: 'Pérez',
    payerIdType: 'DNI',
    payerIdNumber: '12345678',
  })

  res = await refresh(approved._id, token)
  const body = await res.json()
  check(res.status === 200, 'con token correcto devuelve 200')
  check(body.id === String(approved._id) && body.status === 'approved', 'devuelve el estado real de la orden')
  check(body.payer?.idNumber === '12345678', 'el dueño de la orden lee sus propios datos de pago')

  const after = await Order.findById(approved._id).lean()
  check(after.status === 'approved' && after.payerIdNumber === '12345678', 'no muta estado ni datos en órdenes finales')
  check((await StockMovement.countDocuments({ ref: String(approved._id) })) === 0, 'no dispara descuento de stock en órdenes finales')

  const refunded = await Order.create({
    status: 'refunded',
    refreshToken: createRefreshToken(),
    items: [],
    subtotal: 50,
    discount: 0,
    shippingCost: 0,
    total: 50,
  })
  res = await refresh(refunded._id, createRefreshToken())
  check(res.status === 404, 'token ajeno a la orden queda bloqueado')
  res = await refresh(refunded._id, refunded.refreshToken)
  check(res.status === 200, 'estado final con token propio: solo lectura')

  await server.close()
  await mongoose.disconnect()
  console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})