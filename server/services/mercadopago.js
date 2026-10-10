import { MercadoPagoConfig, Preference, Payment, PreApproval } from 'mercadopago'
import { env } from '../config/env.js'
import { getSettings } from '../lib/settings.js'

const clientCache = new Map()

function clientKey(token) {
  return `mp:${token}`
}

function buildMpServices(token) {
  const client = new MercadoPagoConfig({ accessToken: token })
  return {
    preferenceService: new Preference(client),
    paymentService: new Payment(client),
    preApprovalService: new PreApproval(client),
  }
}

export async function getMpConfig(tenantId = null) {
  if (!env.externalProvidersEnabled) {
    return { configured: false, accessToken: null, webhookSecret: null, publicKey: null }
  }
  const envConfigured = Boolean(env.mpAccessToken)
  if (!tenantId) {
    return {
      configured: envConfigured,
      accessToken: env.mpAccessToken || null,
      webhookSecret: env.mpWebhookSecret || null,
      publicKey: env.mpPublicKey || null,
    }
  }
  // Payment credentials can be changed from another process or tab. Never
  // use the short-lived settings cache for checkout authorization.
  const settings = await getSettings({ fresh: true, tenant: tenantId })
  const mp = settings?.payments?.mercadopago || {}
  const token = String(mp.accessToken || env.mpAccessToken || '').trim() || null
  return {
    configured: Boolean(mp.accessToken),
    accessToken: token || null,
    webhookSecret: mp.webhookSecret || env.mpWebhookSecret || null,
    publicKey: mp.publicKey || env.mpPublicKey || null,
  }
}

export async function getMpServices(tenantId = null) {
  const config = await getMpConfig(tenantId)
  const token = config.accessToken
  if (!token) {
    return { configured: false, preferenceService: null, paymentService: null }
  }
  const key = clientKey(token)
  if (!clientCache.has(key)) {
    clientCache.set(key, buildMpServices(token))
  }
  return { configured: true, ...clientCache.get(key) }
}

export function getBillingService() {
  if (!env.externalProvidersEnabled) return null
  const token = String(env.mpAccessToken || '').trim()
  return token ? new PreApproval(new MercadoPagoConfig({ accessToken: token })) : null
}

export async function getAuthorizedPayment(id) {
  if (!env.externalProvidersEnabled) return null
  const token = String(env.mpAccessToken || '').trim()
  if (!token) return null

  const response = await fetch(`https://api.mercadopago.com/authorized_payments/${encodeURIComponent(String(id))}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok) {
    const error = new Error(`Mercado Pago authorized payment request failed with ${response.status}`)
    error.status = response.status
    throw error
  }
  return response.json()
}

export function isMercadoPagoAuthError(error) {
  const status = Number(error?.status)

  // The Mercado Pago SDK can return an empty `error` and no `causes` for an
  // invalid access token. The HTTP status is the reliable signal in that
  // response, so every 401 must stop the order tracker immediately.
  if (status === 401) return true

  return status === 403 && (
    error?.error === 'unauthorized' ||
    error?.causes?.some((cause) => /credential|live credentials|unauthorized/i.test(String(cause?.description || '')))
  )
}
