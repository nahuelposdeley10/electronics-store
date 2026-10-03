import { createHash } from 'node:crypto'
import { Product } from '../models/Product.js'
import { CashShift } from '../models/CashShift.js'
import { Onboarding } from '../models/Onboarding.js'
import { defaults, getSettings } from './settings.js'
import { buildPublicCatalogFilter } from './catalog-query.js'

export const ONBOARDING_STEPS = ['business', 'catalog', 'stock', 'payments', 'shipping', 'review']
export const signature = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
export const validWhatsapp = (value) => /^\d{10,15}$/.test(String(value || ''))
export const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || ''))

export function onboardingStatus({ business, settings, state = {}, products, available, cashReady }) {
  const template = defaults().store
  const store = settings.store
  const contact = {
    name: store.name === template.name ? '' : (store.name || ''),
    whatsapp: store.whatsapp === template.whatsapp ? '' : (store.whatsapp || '').replace(/\D/g, ''),
    email: store.email === template.email ? '' : (store.email || ''),
    ...Object.fromEntries(['phone', 'addressFull', 'addressShort', 'hours'].map((key) => [key, store[key] === template[key] ? '' : (store[key] || '')])),
  }
  const shipping = settings.shipping
  const mp = settings.payments.mercadopago || {}
  const online = settings.payments.online !== false
  const checks = {
    business: Boolean(contact.name.trim() && (validEmail(contact.email) || validWhatsapp(contact.whatsapp)) && business.businessSlug),
    catalog: products > 0,
    stock: available > 0,
    payments: online ? Boolean(mp.accessToken?.trim() && mp.webhookSecret?.trim()) : validWhatsapp(contact.whatsapp),
    shipping: state.shippingSignature === signature(shipping),
  }
  // Only readiness, not stock quantities or credentials, is included in review state.
  const reviewSignature = signature({ contact, slug: business.businessSlug, online, shipping, checks })
  const ready = Object.values(checks).every(Boolean)
  checks.review = ready && state.reviewSignature === reviewSignature && Boolean(state.completedAt)
  const steps = ONBOARDING_STEPS.map((id) => ({ id, complete: checks[id] }))
  return {
    adminId: String(business._id), businessSlug: business.businessSlug || '', contact, shipping,
    storePath: business.businessSlug ? `/u/${business.businessSlug}` : null,
    payments: { online, tokenPresent: Boolean(mp.accessToken?.trim()), webhookPresent: Boolean(mp.webhookSecret?.trim()) },
    products, available, cashReady: Boolean(cashReady), steps,
    completed: steps.filter((step) => step.complete).length,
    total: steps.length, ready, finished: checks.review,
    paused: Boolean(state.paused), lastStep: ONBOARDING_STEPS.includes(state.lastStep) ? state.lastStep : 'business',
    completedAt: state.completedAt || null,
    // Internal only: removed at the HTTP boundary.
    reviewSignature,
  }
}

export async function getOnboarding(business) {
  const adminId = business._id
  const catalogFilter = { ...buildPublicCatalogFilter(''), adminId, price: { $gt: 0 } }
  const [settings, state, products, available, cashReady] = await Promise.all([
    getSettings({ tenant: adminId, fresh: true }),
    Onboarding.findOne({ adminId }).lean(),
    Product.countDocuments(catalogFilter),
    Product.countDocuments({ ...catalogFilter, stock: { $gt: 0 } }),
    CashShift.exists({ adminId }),
  ])
  return onboardingStatus({ business, settings, state: state || {}, products, available, cashReady })
}

export function publicOnboarding(status) {
  const safe = { ...status }
  delete safe.reviewSignature
  return safe
}
