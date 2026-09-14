import express from 'express'
import { Order } from '../models/Order.js'
import { buildCart } from '../services/pricing.js'
import { getMpServices } from '../services/mercadopago.js'
import { verifyOrderPayment } from '../lib/order-verify.js'
import { trackOrder } from '../lib/order-tracker.js'
import { getSettings } from '../lib/settings.js'
import { env, isAllowedOrigin } from '../config/env.js'
import { publicTenantId } from '../lib/tenant.js'
import { createRefreshToken, verifyRefreshToken } from '../lib/order-token.js'

const router = express.Router()

const MUTABLE_STATUSES = new Set(['pending', 'in_process'])

function orderPayload(order) {
  return {
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
  }
}

router.post('/orders/:id/refresh', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
    const token = req.headers['x-refresh-token'] || req.body?.refreshToken || null

    if (!order || !verifyRefreshToken(order.refreshToken, token)) {
      return res.status(404).json({ error: 'Orden no encontrada' })
    }

    if (MUTABLE_STATUSES.has(order.status)) {
      const updated = await verifyOrderPayment(order)
      if (MUTABLE_STATUSES.has(updated.status)) {
        trackOrder(updated._id)
      }
      return res.json(orderPayload(updated))
    }

    return res.json(orderPayload(order))
  } catch (error) {
    console.error('Order refresh error:', error)
    return res.status(500).json({ error: 'No se pudo corroborar el pago' })
  }
})

router.post('/checkout', async (req, res) => {
  try {
    const tenant = await publicTenantId(req)
    const cart = await buildCart(req.body.items, req.body.coupon, tenant)
    if (cart.lineItems.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' })
    }

    for (const line of cart.lineItems) {
      if (line.product.stock < line.quantity) {
        return res.status(400).json({
          error: `Stock insuficiente de "${line.product.name}" (queda ${line.product.stock})`,
        })
      }
    }

    const buyer = req.body.payer || {}
    const fullName = String(buyer.name || '').trim()
    const lastNameIdx = fullName.lastIndexOf(' ') + 1

    const order = await Order.create({
      adminId: tenant,
      refreshToken: createRefreshToken(),
      items: cart.lineItems.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        unitPrice: line.unitPrice,
        quantity: line.quantity,
      })),
      coupon: cart.coupon,
      subtotal: cart.subtotal,
      discount: cart.discount,
      shippingCost: cart.shippingCost,
      total: cart.total,
      payerEmail: String(buyer.email || '').trim() || null,
      payerName: fullName ? fullName.slice(0, lastNameIdx - 1) || fullName : null,
      payerSurname: fullName && lastNameIdx > 0 ? fullName.slice(lastNameIdx) : null,
    })

    trackOrder(order._id)

    const items = cart.lineItems.map((line) => ({
      id: String(line.product.id),
      title: line.product.name,
      picture_url: line.product.image,
      quantity: line.quantity,
      unit_price: line.unitPrice,
      currency_id: 'ARS',
    }))

    if (cart.shippingCost > 0) {
      items.push({
        id: 'envio',
        title: cart.shippingLabel || 'Envío a domicilio',
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

    const origin = isAllowedOrigin(req.headers.origin) ? req.headers.origin : env.clientUrl
    const slug = String(req.headers['x-tenant-slug'] || '').trim().toLowerCase()
    const storePath = slug ? `/u/${slug}` : ''

    const body = {
      items,
      external_reference: String(order._id),
      metadata: { tenant: String(order.adminId) },
      back_urls: {
        success: `${origin}${storePath}`,
        failure: `${origin}${storePath}`,
        pending: `${origin}${storePath}`,
      },
      statement_descriptor: (await getSettings({ tenant })).checkout?.statementDescriptor || 'TechStore',
    }

    const mp = await getMpServices(tenant)
    if (!mp.configured) {
      return res.status(400).json({
        error: 'Esta tienda aún no configuró Mercado Pago para recibir pagos online',
      })
    }

    if (env.clientUrl.startsWith('https://')) {
      body.auto_return = 'approved'
    }

    if (env.serverUrl.startsWith('https://')) {
      const qs = new URLSearchParams({ tenant: String(order.adminId) })
      body.notification_url = `${env.serverUrl}/api/webhooks/mercadopago?${qs.toString()}`
    }

    const preference = await mp.preferenceService.create({ body })

    return res.json({
      init_point: preference.init_point,
      order_id: String(order._id),
      refresh_token: order.refreshToken,
      total: cart.total,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return res.status(500).json({ error: 'No se pudo iniciar el pago' })
  }
})

export default router