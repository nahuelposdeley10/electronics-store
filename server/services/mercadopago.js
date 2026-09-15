import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
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
  }
}

export async function getMpConfig(tenantId = null) {
  const envConfigured = Boolean(env.mpAccessToken)
  if (!tenantId) {
    return {
      configured: envConfigured,
      accessToken: env.mpAccessToken || null,
      webhookSecret: env.mpWebhookSecret || null,
      publicKey: env.mpPublicKey || null,
    }
  }
  const settings = await getSettings({ tenant: tenantId })
  const mp = settings?.payments?.mercadopago || {}
  const token = mp.accessToken || env.mpAccessToken
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
