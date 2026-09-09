import express from 'express'
import { Order } from '../models/Order.js'
import { paymentService } from '../services/mercadopago.js'
import { orderStatusForPayment } from '../lib/order-status.js'

const router = express.Router()

function extractPaymentId(req) {
  if (req.body?.type === 'payment') {
    return req.body?.data?.id ? String(req.body.data.id) : null
  }
  if (req.query?.type === 'payment') {
    const id = req.query['data.id'] || req.query.id
    return id ? String(id) : null
  }
  return null
}

router.post('/webhooks/mercadopago', async (req, res) => {
  let paymentId
  try {
    paymentId = extractPaymentId(req)
    if (!paymentId) {
      return res.sendStatus(200)
    }

    const payment = await paymentService.get({ id: paymentId })
    const externalReference = payment?.external_reference
    if (!externalReference) {
      return res.sendStatus(200)
    }

    const order = await Order.findById(externalReference)
    if (!order) {
      return res.sendStatus(200)
    }

    order.status = orderStatusForPayment(payment.status)
    if (payment.id) order.paymentId = payment.id
    if (payment.merchant_order_id) order.merchantOrderId = payment.merchant_order_id
    await order.save()
  } catch (error) {
    console.error('Webhook error:', error)
    return res.sendStatus(500)
  }

  return res.sendStatus(200)
})

export default router