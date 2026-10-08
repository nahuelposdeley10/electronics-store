import { Subscription } from '../models/Subscription.js'
import { subscriptionToday } from './subscriptions.js'

function providerDate(value) {
  const parsed = value ? new Date(value) : new Date()
  return Number.isFinite(parsed.getTime()) ? parsed : new Date()
}

export function nextSubscriptionDueDate(value = new Date()) {
  const current = providerDate(value)
  const next = new Date(current)
  const day = next.getUTCDate()
  next.setUTCMonth(next.getUTCMonth() + 1)
  if (next.getUTCDate() !== day) next.setUTCDate(0)
  return subscriptionToday(next)
}

function paymentData(invoice, payment) {
  const nested = invoice?.payment || {}
  return {
    id: nested.id || payment?.id || invoice?.id || '',
    status: String(nested.status || payment?.status || '').trim().toLowerCase(),
    amount: nested.transaction_amount ?? payment?.transaction_amount ?? invoice?.transaction_amount,
    paidAt: nested.date_approved || payment?.date_approved || invoice?.last_modified || invoice?.date_created,
  }
}

export async function recordSubscriptionPayment({ invoice = null, payment = null } = {}) {
  const preapprovalId = String(invoice?.preapproval_id || payment?.preapproval_id || '').trim()
  if (!preapprovalId) return { matched: false }

  const subscription = await Subscription.findOne({ 'billing.preapprovalId': preapprovalId })
  if (!subscription) return { matched: false }

  const details = paymentData(invoice, payment)
  const providerPaymentId = String(details.id || '').trim()
  if (!providerPaymentId) return { matched: true, recorded: false, status: details.status || 'unknown' }

  const lastPaymentAt = providerDate(details.paidAt)
  const billingStatus = details.status || String(invoice?.status || '').trim().toLowerCase()
  const billingUpdate = {
    'billing.lastPaymentId': providerPaymentId,
    'billing.lastPaymentStatus': billingStatus,
    'billing.lastPaymentAt': lastPaymentAt,
  }

  if (details.status !== 'approved') {
    await Subscription.updateOne({ _id: subscription._id }, { $set: billingUpdate })
    return { matched: true, recorded: false, status: billingStatus }
  }

  const amount = Number(details.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    await Subscription.updateOne({ _id: subscription._id }, { $set: billingUpdate })
    return { matched: true, recorded: false, status: 'approved', reason: 'invalid_amount' }
  }

  const paidAt = subscriptionToday(lastPaymentAt)
  const dueDate = nextSubscriptionDueDate(lastPaymentAt)
  const entry = {
    requestId: `mercadopago-${providerPaymentId}`,
    amount,
    paidAt,
    dueDate,
    method: 'mercadopago',
    reference: providerPaymentId,
    plan: subscription.plan,
    recordedBy: null,
    providerPaymentId,
    providerStatus: 'approved',
  }

  const saved = await Subscription.findOneAndUpdate(
    { _id: subscription._id, 'payments.providerPaymentId': { $ne: providerPaymentId } },
    {
      $push: { payments: entry },
      $set: {
        ...billingUpdate,
        status: 'active',
        dueDate,
        pausedAt: null,
        pauseReason: '',
        'billing.status': 'authorized',
      },
      $inc: { revision: 1 },
    },
    { new: true, runValidators: true },
  )

  return { matched: true, recorded: Boolean(saved), status: 'approved', dueDate }
}
