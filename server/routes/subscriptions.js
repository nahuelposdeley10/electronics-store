import express from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { Subscription } from '../models/Subscription.js'
import { subscriptionSummary, validateSubscription, validateSubscriptionPayment } from '../lib/subscriptions.js'
import { getBillingService, isMercadoPagoAuthError } from '../services/mercadopago.js'
import { env } from '../config/env.js'

const router = express.Router()
router.use(requireAuth)
router.use(async (req, res, next) => {
  try {
    const actor = await User.findById(req.user.sub).lean()
    if (req.user.role !== 'superadmin' || actor?.role !== 'superadmin' || !actor.active) return res.status(403).json({ error: 'Solo el superadmin puede gestionar suscripciones' })
    next()
  } catch (error) { next(error) }
})
router.param('adminId', async (req, res, next, id) => {
  try {
    if (!mongoose.isObjectIdOrHexString(id) || !await User.exists({ _id: id, role: 'admin' })) return res.status(404).json({ error: 'Negocio no encontrado' })
    next()
  } catch (error) { next(error) }
})

function response(doc) {
  return { ...subscriptionSummary(doc), payments: [...(doc?.payments || [])].reverse() }
}

async function ensureSubscription(adminId) {
  try {
    return await Subscription.findOneAndUpdate({ adminId }, { $setOnInsert: { adminId } }, { upsert: true, new: true, setDefaultsOnInsert: true }).lean()
  } catch (error) {
    if (error.code === 11000) return Subscription.findOne({ adminId }).lean()
    throw error
  }
}

router.get('/:adminId', async (req, res, next) => {
  try { res.json(response(await Subscription.findOne({ adminId: req.params.adminId }).lean())) } catch (error) { next(error) }
})

router.put('/:adminId', async (req, res, next) => {
  try {
    const value = validateSubscription(req.body)
    if (!Number.isInteger(req.body.revision) || req.body.revision < 0) return res.status(400).json({ error: 'Versión inválida' })
    await ensureSubscription(req.params.adminId)
    const saved = await Subscription.findOneAndUpdate({ adminId: req.params.adminId, revision: req.body.revision }, { $set: value, $inc: { revision: 1 } }, { new: true, runValidators: true }).lean()
    if (!saved) return res.status(409).json({ error: 'La suscripción cambió. Volvé a abrirla antes de guardar.' })
    res.json(response(saved))
  } catch (error) { next(error) }
})

router.post('/:adminId/payments', async (req, res, next) => {
  try {
    const current = await Subscription.findOne({ adminId: req.params.adminId }).lean()
    if (!current) return res.status(400).json({ error: 'Configurá primero la suscripción' })
    if (typeof req.body?.requestId === 'string' && current.payments.some((p) => p.requestId === req.body.requestId)) return res.json(response(current))
    const payment = validateSubscriptionPayment(req.body, current, req.user.sub)
    if (req.body.revision !== current.revision) return res.status(409).json({ error: 'La suscripción cambió. Volvé a abrirla antes de registrar el pago.' })
    const saved = await Subscription.findOneAndUpdate({ adminId: req.params.adminId, revision: current.revision, 'payments.requestId': { $ne: payment.requestId } }, {
      $push: { payments: payment }, $set: { dueDate: payment.dueDate, status: 'active' }, $inc: { revision: 1 },
    }, { new: true, runValidators: true }).lean()
    if (!saved) {
      const latest = await Subscription.findOne({ adminId: req.params.adminId }).lean()
      if (latest?.payments.some((p) => p.requestId === payment.requestId)) return res.json(response(latest))
      return res.status(409).json({ error: 'La suscripción cambió. Volvé a abrirla antes de registrar el pago.' })
    }
    res.status(201).json(response(saved))
  } catch (error) { next(error) }
})

router.post('/:adminId/billing-link', async (req, res, next) => {
  try {
    const current = await Subscription.findOne({ adminId: req.params.adminId })
    if (!current?.plan || !current.price) return res.status(400).json({ error: 'Configurá primero el plan y el precio de la suscripción' })
    const billing = getBillingService()
    if (!billing) return res.status(503).json({ error: 'El cobro de suscripciones no está configurado en el servidor' })
    const owner = await User.findById(req.params.adminId).select('email name').lean()
    const result = await billing.create({ body: {
      reason: `${current.plan} · ${owner?.name || 'Suscripción del local'}`.slice(0, 255),
      external_reference: String(req.params.adminId), payer_email: owner?.email, back_url: env.clientUrl,
      auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: current.price, currency_id: 'ARS' },
      status: 'pending',
      notification_url: `${env.serverUrl}/api/webhooks/mercadopago/subscriptions`,
    } })
    current.billing = { provider: 'mercadopago', preapprovalId: result.id || '', initPoint: result.init_point || result.sandbox_init_point || '', createdAt: new Date(), status: 'pending' }
    await current.save()
    return res.json({ ...response(current.toObject()), billing: current.billing })
  } catch (error) {
    if (isMercadoPagoAuthError(error)) return res.status(502).json({ error: 'Mercado Pago rechazó las credenciales de facturación. Revisá MP_ACCESS_TOKEN.' })
    next(error)
  }
})

export default router
