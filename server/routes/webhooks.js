import express from 'express'
import { Order } from '../models/Order.js'
import { paymentService } from '../services/mercadopago.js'
import { orderStatusForPayment, canTransitionOrder } from '../lib/order-status.js'
import { payerFieldsFromPayment } from '../lib/payer.js'
import { verifyWebhookSignature } from '../lib/webhook-signature.js'
import { deductApprovedStock } from '../lib/order-stock.js'
import { env } from '../config/env.js'

const router = express.Router()

const AMOUNT_TOLERANCE = 0.01

function extractPaymentId(req) {
  if (req.body?.type === 'payment' && req.body?.data?.id) {
    return String(req.body.data.id)
  }
  if (req.query?.type === 'payment') {
    const id = req.query['data.id'] || req.query.id
    return id ? String(id) : null
  }
  return null
}

router.post('/webhooks/mercadopago', async (req, res) => {
  try {
    const paymentId = extractPaymentId(req)
    if (!paymentId) return res.sendStatus(200)

    const signed = verifyWebhookSignature({
      xSignature: req.get('x-signature'),
      xRequestId: req.get('x-request-id'),
      paymentId,
      secret: env.mpWebhookSecret,
    })

    if (!signed) {
      if (!env.mpWebhookSecret) {
        console.error('[webhook] MP_WEBHOOK_SECRET no configurado; se rechaza la notificación sin procesar nada')
        return res.sendStatus(503)
      }
      console.warn(`[webhook] Firma inválida para payment ${paymentId}`)
      return res.sendStatus(401)
    }

    const payment = await paymentService.get({ id: paymentId })
    const externalReference = payment?.external_reference
    if (!externalReference) return res.sendStatus(200)

    const order = await Order.findById(externalReference)
    if (!order) return res.sendStatus(200)

    const claimedTenant = payment.metadata?.tenant
    if (order.adminId && (!claimedTenant || String(claimedTenant) !== String(order.adminId))) {
      console.warn(`[webhook] Tenant no coincide para la orden ${order._id}`)
      return res.sendStatus(200)
    }

    const paidAmount = Number(payment.transaction_amount)
    if (Number.isFinite(paidAmount) && Math.abs(paidAmount - order.total) > AMOUNT_TOLERANCE) {
      console.warn(`[webhook] Monto no coincide para la orden ${order._id}: pago ${paidAmount} vs orden ${order.total}`)
      return res.sendStatus(200)
    }

    const nextStatus = orderStatusForPayment(payment.status)
    if (!canTransitionOrder(order.status, nextStatus)) {
      console.warn(`[webhook] Transición no permitida ${String(order.status)} -> ${nextStatus} para la orden ${order._id}`)
      return res.sendStatus(200)
    }

    if (String(order.paymentId) === String(payment.id) && order.status === nextStatus) {
      return res.sendStatus(200)
    }

    const updates = {
      status: nextStatus,
      ...payerFieldsFromPayment(order, payment),
    }
    if (payment.id) updates.paymentId = payment.id
    if (payment.merchant_order_id) updates.merchantOrderId = payment.merchant_order_id

    const updated = await Order.findOneAndUpdate(
      { _id: order._id, status: order.status },
      { $set: updates },
      { new: true },
    )

    if (updated && nextStatus === 'approved') {
      await deductApprovedStock(updated).catch((error) =>
        console.error(`Stock decrement error (order ${String(updated._id)}):`, error),
      )
    }
  } catch (error) {
    console.error('Webhook error:', error)
    return res.sendStatus(500)
  }

  return res.sendStatus(200)
})

export default router