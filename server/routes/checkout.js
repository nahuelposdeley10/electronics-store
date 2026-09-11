import express from 'express'
import { Order } from '../models/Order.js'
import { buildCart } from '../services/pricing.js'
import { preferenceService } from '../services/mercadopago.js'
import { verifyOrderPayment } from '../lib/order-verify.js'
import { trackOrder } from '../lib/order-tracker.js'
import { env } from '../config/env.js'

const router = express.Router()

router.post('/orders/:id/refresh', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    if (!order) {
      return res.status(404).json({ error: 'Orden no encontrada' })
    }

    if (order.status === 'approved') {
      return res.json({
        id: order._id,
        status: order.status,
        paymentId: order.paymentId,
        total: order.total,
        payer: {
          email: order.payerEmail,
          name: order.payerName,
          surname: order.payerSurname,
          fullName: [order.payerName, order.payerSurname].filter(Boolean).join(' ') || null,
          idType: order.payerIdType,
          idNumber: order.payerIdNumber,
        },
      })
    }

    const updated = await verifyOrderPayment(order)
    if (updated.status === 'pending' || updated.status === 'in_process') {
      trackOrder(updated._id)
    }

    return res.json({
      id: updated._id,
      status: updated.status,
      paymentId: updated.paymentId,
      total: updated.total,
      payer: {
        email: updated.payerEmail,
        name: updated.payerName,
        surname: updated.payerSurname,
        fullName: [updated.payerName, updated.payerSurname].filter(Boolean).join(' ') || null,
        idType: updated.payerIdType,
        idNumber: updated.payerIdNumber,
      },
    })
  } catch (error) {
    console.error('Order refresh error:', error)
    return res.status(500).json({ error: 'No se pudo corroborar el pago' })
  }
})

router.post('/checkout', async (req, res) => {
  try {
    const cart = await buildCart(req.body.items, req.body.coupon)
    if (cart.lineItems.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' })
    }

    const order = await Order.create({
      items: cart.lineItems.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        unitPrice: line.product.price,
        quantity: line.quantity,
      })),
      coupon: cart.coupon,
      subtotal: cart.subtotal,
      discount: cart.discount,
      shippingCost: cart.shippingCost,
      total: cart.total,
    })

    trackOrder(order._id)

    const items = cart.lineItems.map((line) => ({
      id: String(line.product.id),
      title: line.product.name,
      picture_url: line.product.image,
      quantity: line.quantity,
      unit_price: line.product.price,
      currency_id: 'ARS',
    }))

    if (cart.shippingCost > 0) {
      items.push({
        id: 'envio',
        title: 'Envío a domicilio',
        quantity: 1,
        unit_price: cart.shippingCost,
        currency_id: 'ARS',
      })
    }

    if (cart.discount > 0) {
      items.push({
        id: `descuento-${cart.coupon}`,
        title: `Descuento cupón ${cart.coupon}`,
        quantity: 1,
        unit_price: -cart.discount,
        currency_id: 'ARS',
      })
    }

    const body = {
      items,
      external_reference: String(order._id),
      back_urls: {
        success: env.clientUrl,
        failure: env.clientUrl,
        pending: env.clientUrl,
      },
      statement_descriptor: 'TechStore',
    }

    if (env.clientUrl.startsWith('https://')) {
      body.auto_return = 'approved'
    }

    if (env.serverUrl.startsWith('https://')) {
      body.notification_url = `${env.serverUrl}/api/webhooks/mercadopago`
    }

    const preference = await preferenceService.create({ body })

    return res.json({
      init_point: preference.init_point,
      order_id: String(order._id),
      total: cart.total,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return res.status(500).json({ error: 'No se pudo iniciar el pago' })
  }
})

export default router