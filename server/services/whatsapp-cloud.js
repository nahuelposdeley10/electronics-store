import crypto from 'node:crypto'
import { findWhatsappConfigByPhoneNumberId, getWhatsappConfig, whatsappGraphConfig } from '../lib/whatsapp-config.js'
import { recordWhatsappOutbound } from '../lib/whatsapp-models.js'

function graphUrl(path) {
  const { apiVersion } = whatsappGraphConfig()
  return `https://graph.facebook.com/${apiVersion}/${String(path).replace(/^\/+/, '')}`
}
export function verifyMetaWhatsappSignature({ rawBody, signature, appSecret } = {}) {
  if (!Buffer.isBuffer(rawBody) || !appSecret) return false
  const received = String(signature || '').trim()
  if (!received.startsWith('sha256=')) return false
  const expected = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`
  const expectedBuffer = Buffer.from(expected)
  const receivedBuffer = Buffer.from(received.toLowerCase())
  return expectedBuffer.length === receivedBuffer.length && crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
}

async function graphRequest({ tenant, path, body, allowWhenDisabled = false }) {
  const config = await getWhatsappConfig(tenant, { decrypt: true })
  if (!config.phoneNumberId || !config.accessToken) {
    const error = new Error('WhatsApp no está conectado para este negocio')
    error.status = 409
    throw error
  }
  if (!allowWhenDisabled && config.enabled !== true) {
    const error = new Error('La atención automática de WhatsApp está pausada para este negocio')
    error.status = 409
    throw error
  }
  const response = await fetch(graphUrl(path), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.accessToken}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15_000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error('Meta rechazó el mensaje de WhatsApp')
    error.status = response.status >= 500 ? 502 : 400
    error.code = payload?.error?.code || 'META_WHATSAPP_ERROR'
    throw error
  }
  return payload
}

export async function sendWhatsappText({ tenant, to, text, replyToMessageId, conversationId, allowWhenDisabled = false } = {}) {
  const destination = String(to || '').replace(/\D/g, '')
  const message = String(text || '').trim().slice(0, 4_096)
  if (!destination || !message) {
    const error = new Error('Destinatario y texto son requeridos')
    error.status = 400
    throw error
  }
  const config = await getWhatsappConfig(tenant, { decrypt: true })
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: destination,
    type: 'text',
    text: { preview_url: true, body: message },
  }
  if (replyToMessageId) body.context = { message_id: String(replyToMessageId) }
  const response = await graphRequest({
    tenant,
    path: `${config.phoneNumberId}/messages`,
    body,
    allowWhenDisabled,
  })
  const externalId = response?.messages?.[0]?.id || null
  const stored = conversationId
    ? await recordWhatsappOutbound({ tenant, phoneNumberId: config.phoneNumberId, customerWaId: destination, conversationId, externalId, text: message })
    : { available: false }
  return { response, externalId, stored }
}

export async function resolveWhatsappTenant(phoneNumberId) {
  return findWhatsappConfigByPhoneNumberId(phoneNumberId, { decrypt: false })
}
