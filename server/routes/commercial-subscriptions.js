import crypto from 'node:crypto'
import express from 'express'
import bcrypt from 'bcryptjs'
import rateLimit from 'express-rate-limit'
import { CommercialSignup } from '../models/CommercialSignup.js'
import { Subscription } from '../models/Subscription.js'
import { User } from '../models/User.js'
import { Setting } from '../models/Setting.js'
import { planByCode, normalizePlanCode } from '../lib/plans.js'
import { getBillingService, isMercadoPagoAuthError } from '../services/mercadopago.js'
import { sendCommercialActivationEmail } from '../services/email.js'
import { env } from '../config/env.js'

const router = express.Router()
const signupLimiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 8, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiados intentos. Probá nuevamente más tarde.' } })
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function slugify(value) {
  return String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70)
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}

function publicSignup(doc) {
  return {
    id: doc._id,
    status: doc.status,
    planCode: doc.planCode,
    planName: doc.planName,
    email: doc.email,
    emailDelivery: doc.activationSentAt ? { sent: true } : null,
  }
}

function activationUrl(token) {
  const url = new URL('/activar-cuenta', env.clientUrl)
  url.searchParams.set('token', token)
  return url.toString()
}

async function deliverActivation(signup) {
  const token = crypto.randomBytes(32).toString('hex')
  const saved = await CommercialSignup.findOneAndUpdate(
    { _id: signup._id, status: { $ne: 'activated' }, activationSentAt: null },
    { $set: { status: 'ready', activationTokenHash: tokenHash(token), activationTokenExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000) } },
    { new: true },
  )
  if (!saved) return { sent: false, skipped: true, reason: 'already_delivered' }

  try {
    const delivery = await sendCommercialActivationEmail({
      name: saved.name,
      email: saved.email,
      storeName: saved.storeName,
      planName: saved.planName,
      planPrice: `$${saved.price.toLocaleString('es-AR')}`,
      activationUrl: activationUrl(token),
    })
    await CommercialSignup.updateOne({ _id: saved._id }, { $set: { activationSentAt: delivery.sent ? new Date() : null } })
    return delivery
  } catch (error) {
    console.error('Commercial activation email error:', error.message)
    return { sent: false, skipped: false, reason: 'email_send_failed' }
  }
}

router.post('/', signupLimiter, async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim()
    const email = String(req.body?.email || '').trim().toLowerCase()
    const storeName = String(req.body?.storeName || '').trim()
    const businessSlug = slugify(req.body?.businessSlug || storeName)
    const plan = planByCode(normalizePlanCode(req.body?.planCode))
    if (name.length < 2 || name.length > 120) return res.status(400).json({ error: 'Ingresá tu nombre' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Ingresá un email válido' })
    if (!storeName || storeName.length > 160) return res.status(400).json({ error: 'Ingresá el nombre del negocio' })
    if (!businessSlug || !SLUG_PATTERN.test(businessSlug)) return res.status(400).json({ error: 'El nombre de la tienda no permite generar una URL válida' })
    if (!plan) return res.status(400).json({ error: 'Plan inválido' })
    if (await User.exists({ email })) return res.status(409).json({ error: 'Ya existe una cuenta con ese email. Ingresá desde el panel o usá otro email.' })
    if (await User.exists({ businessSlug })) return res.status(409).json({ error: 'La URL elegida para la tienda ya está ocupada.' })
    const existingSignup = await CommercialSignup.findOne({ $or: [{ email }, { businessSlug }], status: { $in: ['pending_payment', 'ready'] } }).lean()
    if (existingSignup) return res.status(409).json({ error: 'Ya hay una suscripción en proceso con esos datos. Revisá tu email o esperá la confirmación.' })

    const billing = getBillingService()
    if (!billing) return res.status(503).json({ error: 'Las suscripciones online todavía no están configuradas.' })

    const signup = await CommercialSignup.create({ name, email, storeName, businessSlug, planCode: plan.code, planName: plan.name, price: plan.price })
    try {
      const remote = await billing.create({ body: {
        reason: `Tienda BNP · Plan ${plan.name}`.slice(0, 255),
        external_reference: String(signup._id),
        payer_email: email,
        back_url: `${env.clientUrl}/home?subscription=return`,
        auto_recurring: { frequency: 1, frequency_type: 'months', transaction_amount: plan.price, currency_id: 'ARS' },
        status: 'pending',
        notification_url: `${env.serverUrl}/api/webhooks/mercadopago/subscriptions`,
      } })
      signup.billing = { provider: 'mercadopago', preapprovalId: remote.id || '', initPoint: remote.init_point || remote.sandbox_init_point || '', status: 'pending' }
      await signup.save()
      return res.status(201).json({ ...publicSignup(signup), initPoint: signup.billing.initPoint })
    } catch (error) {
      await CommercialSignup.deleteOne({ _id: signup._id })
      throw error
    }
  } catch (error) {
    if (isMercadoPagoAuthError(error)) return res.status(502).json({ error: 'Mercado Pago rechazó las credenciales de Tienda BNP.' })
    return next(error)
  }
})

router.post('/activate', signupLimiter, async (req, res, next) => {
  try {
    const token = String(req.body?.token || '').trim()
    const password = String(req.body?.password || '')
    if (!token || password.length < 6) return res.status(400).json({ error: 'El link o la contraseña no son válidos.' })
    const signup = await CommercialSignup.findOne({ activationTokenHash: tokenHash(token), activationTokenExpiresAt: { $gt: new Date() }, status: 'ready' })
    if (!signup) return res.status(400).json({ error: 'El link de activación venció o ya fue utilizado.' })
    if (await User.exists({ email: signup.email })) return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' })
    if (await User.exists({ businessSlug: signup.businessSlug })) return res.status(409).json({ error: 'La URL de la tienda ya está ocupada.' })

    const user = await User.create({
      name: signup.name,
      email: signup.email,
      passwordHash: await bcrypt.hash(password, 10),
      role: 'admin',
      businessSlug: signup.businessSlug,
    })
    await Subscription.create({
      adminId: user._id,
      planCode: signup.planCode,
      plan: signup.planName,
      price: signup.price,
      status: 'active',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      billing: { provider: 'mercadopago', preapprovalId: signup.billing.preapprovalId, status: 'authorized' },
    })
    await Setting.updateOne({ adminId: user._id, key: 'base' }, { $set: { 'value.store.name': signup.storeName } }, { upsert: true })
    await CommercialSignup.updateOne({ _id: signup._id }, { $set: { status: 'activated', adminId: user._id }, $unset: { activationTokenHash: '', activationTokenExpiresAt: '' } })
    return res.status(201).json({ ok: true, email: user.email, panelUrl: new URL('/admin', env.clientUrl).toString() })
  } catch (error) {
    return next(error)
  }
})

export { deliverActivation }
export default router
