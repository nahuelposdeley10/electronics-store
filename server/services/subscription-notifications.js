import { Subscription } from '../models/Subscription.js'
import { CommercialSignup } from '../models/CommercialSignup.js'
import { User } from '../models/User.js'
import { getSettings } from '../lib/settings.js'
import { subscriptionToday, paidGraceDeadline, paidSubscriptionExpired } from '../lib/subscriptions.js'
import { getBillingService } from './mercadopago.js'
import { sendSubscriptionPaymentIssueEmail, sendTrialEndedSubscriptionEmail } from './email.js'
import { deliverTrialActivation } from '../routes/commercial-subscriptions.js'
import { env } from '../config/env.js'

const CHECK_INTERVAL = 15 * 60 * 1000
let timer = null

function displayPrice(value) {
  return `$${Number(value || 0).toLocaleString('es-AR')}`
}

export async function processTrialActivationNotifications(now = new Date()) {
  const recent = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const candidates = await CommercialSignup.find({
    status: 'ready',
    activationSentAt: null,
    createdAt: { $gte: recent },
  }).limit(50)
  let sent = 0

  for (const signup of candidates) {
    try {
      const delivery = await deliverTrialActivation(signup)
      if (delivery.sent) sent += 1
    } catch (error) {
      console.error(`Trial activation email error (${String(signup._id)}):`, error.message)
    }
  }
  return { checked: candidates.length, sent }
}

function trialDaysFor(subscription) {
  const started = new Date(subscription.createdAt).getTime()
  const ended = new Date(`${subscription.dueDate}T00:00:00Z`).getTime()
  if (!Number.isFinite(started) || !Number.isFinite(ended) || ended <= started) return 14
  return Math.max(1, Math.round((ended - started) / (24 * 60 * 60 * 1000)))
}

async function ensureBillingLink(subscription, owner, today) {
  if (subscription.billing?.initPoint) {
    return {
      initPoint: subscription.billing.initPoint,
      preapprovalId: subscription.billing.preapprovalId || '',
    }
  }

  const billing = getBillingService()
  if (!billing) return null

  const result = await billing.create({ body: {
    reason: `${subscription.plan} · ${owner.name || 'Suscripción del local'}`.slice(0, 255),
    external_reference: String(subscription.adminId),
    payer_email: owner.email,
    back_url: `${env.clientUrl}/home?subscription=return`,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: subscription.price,
      currency_id: 'ARS',
    },
    status: 'pending',
    notification_url: `${env.serverUrl}/api/webhooks/mercadopago/subscriptions`,
  } })
  const link = {
    preapprovalId: result.id || '',
    initPoint: result.init_point || result.sandbox_init_point || '',
  }
  if (!link.initPoint) return null

  await Subscription.updateOne(
    { _id: subscription._id, status: { $in: ['trial', 'paused'] }, dueDate: { $lt: today }, trialEndedEmailSentAt: null },
    { $set: { billing: { provider: 'mercadopago', ...link, createdAt: new Date(), status: 'pending' } } },
  )
  return link
}

export async function processTrialExpirations(now = new Date()) {
  const today = subscriptionToday(now)
  const candidates = await Subscription.find({
    dueDate: { $ne: '', $lt: today },
    trialEndedEmailSentAt: null,
    $or: [
      { status: 'trial', pausedAt: null },
      { status: 'paused', pauseReason: 'trial_expired', pausedAt: { $ne: null } },
    ],
  }).limit(50)
  let sent = 0

  for (const subscription of candidates) {
    try {
      const owner = await User.findOne({ _id: subscription.adminId, role: 'admin' }).lean()
      if (!owner) continue

      if (subscription.status === 'trial') {
        const paused = await Subscription.updateOne(
          { _id: subscription._id, status: 'trial', dueDate: { $lt: today }, pausedAt: null },
          { $set: { status: 'paused', pausedAt: new Date(), pauseReason: 'trial_expired' }, $inc: { revision: 1 } },
        )
        if (!paused.modifiedCount) continue
      }

      const current = await Subscription.findById(subscription._id).lean()
      if (!current || current.status !== 'paused' || current.pauseReason !== 'trial_expired') continue
      const settings = await getSettings({ fresh: true, tenant: owner._id })
      const billingLink = await ensureBillingLink(current, owner, today)
      if (!billingLink?.initPoint) continue

      const delivery = await sendTrialEndedSubscriptionEmail({
        name: owner.name,
        email: owner.email,
        storeName: settings.store?.name || owner.name,
        planName: current.plan,
        planPrice: displayPrice(current.price),
        trialDays: trialDaysFor(current),
        subscriptionUrl: billingLink.initPoint,
      })
      if (!delivery.sent) continue
      const marked = await Subscription.updateOne(
        { _id: subscription._id, status: 'paused', pauseReason: 'trial_expired', dueDate: { $lt: today }, trialEndedEmailSentAt: null },
        { $set: { trialEndedEmailSentAt: new Date() } },
      )
      if (marked.modifiedCount) sent += 1
    } catch (error) {
      console.error(`Trial expiration email error (${String(subscription.adminId)}):`, error.message)
    }
  }
  return { checked: candidates.length, sent }
}

function paymentFailureReason(subscription) {
  if (subscription.status === 'cancelled') {
    return 'Mercado Pago canceló la suscripción o agotó sus reintentos de cobro.'
  }
  return 'Mercado Pago pausó la suscripción mientras revisa el medio de pago.'
}

export async function processPaymentFailureNotifications() {
  const candidates = await Subscription.find({
    status: { $in: ['paused', 'cancelled'] },
    pauseReason: 'payment_failed',
    paymentFailureEmailSentAt: null,
    'billing.initPoint': { $ne: '' },
  }).limit(50)
  let sent = 0

  for (const subscription of candidates) {
    try {
      const owner = await User.findOne({ _id: subscription.adminId, role: 'admin' }).lean()
      if (!owner) continue
      const settings = await getSettings({ fresh: true, tenant: owner._id })
      const delivery = await sendSubscriptionPaymentIssueEmail({
        name: owner.name,
        email: owner.email,
        storeName: settings.store?.name || owner.name,
        planName: subscription.plan,
        planPrice: displayPrice(subscription.price),
        subscriptionUrl: subscription.billing.initPoint,
        reason: paymentFailureReason(subscription),
      })
      if (!delivery.sent) continue
      const marked = await Subscription.updateOne(
        { _id: subscription._id, paymentFailureEmailSentAt: null },
        { $set: { paymentFailureEmailSentAt: new Date() } },
      )
      if (marked.modifiedCount) sent += 1
    } catch (error) {
      console.error(`Payment failure email error (${String(subscription.adminId)}):`, error.message)
    }
  }
  return { checked: candidates.length, sent }
}

export async function processPaidSubscriptionGrace(now = new Date()) {
  const today = subscriptionToday(now)
  const candidates = await Subscription.find({ status: 'active', dueDate: { $ne: '', $lt: today } }).limit(100)
  let reminded = 0
  let suspended = 0
  for (const subscription of candidates) {
    try {
      const expired = paidSubscriptionExpired(subscription, today)
      const field = expired ? 'graceSuspensionDueDate' : 'graceReminderDueDate'
      if (subscription[field] === subscription.dueDate) continue
      const owner = await User.findOne({ _id: subscription.adminId, role: 'admin' }).lean()
      if (!owner) continue
      const settings = await getSettings({ fresh: true, tenant: owner._id })
      const deadline = paidGraceDeadline(subscription.dueDate)
      const reason = expired
        ? `El periodo de gracia termino el ${deadline}. La tienda y el panel estan suspendidos hasta regularizar el pago.`
        : `Tu abono vencio el ${subscription.dueDate}. Tenes tiempo hasta el ${deadline} inclusive para regularizarlo antes de que se suspenda la tienda.`
      const delivery = await sendSubscriptionPaymentIssueEmail({
        name: owner.name, email: owner.email,
        storeName: settings.store?.name || owner.name,
        planName: subscription.plan,
        planPrice: displayPrice(subscription.price),
        subscriptionUrl: subscription.billing?.initPoint || `${env.clientUrl}/home`,
        reason,
      })
      if (!delivery.sent) continue
      const marked = await Subscription.updateOne(
        { _id: subscription._id, status: 'active', dueDate: subscription.dueDate, [field]: { $ne: subscription.dueDate } },
        { $set: { [field]: subscription.dueDate } },
      )
      if (marked.modifiedCount) { if (expired) suspended += 1; else reminded += 1 }
    } catch (error) {
      console.error(`Paid subscription grace notification error (${String(subscription.adminId)}):`, error.message)
    }
  }
  return { checked: candidates.length, reminded, suspended }
}

export function startSubscriptionNotifications() {
  if (timer) return () => clearInterval(timer)
  const run = async () => {
    try {
      await processTrialActivationNotifications()
      await processTrialExpirations()
      await processPaidSubscriptionGrace()
      await processPaymentFailureNotifications()
    } catch (error) {
      console.error('Subscription notification error:', error.message)
    }
  }
  run()
  timer = setInterval(run, CHECK_INTERVAL)
  timer.unref?.()
  return () => {
    if (!timer) return
    clearInterval(timer)
    timer = null
  }
}
