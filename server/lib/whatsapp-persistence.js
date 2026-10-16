export const WHATSAPP_PROVIDER = 'meta-cloud'

export const WHATSAPP_CONNECTION_STATUSES = Object.freeze([
  'disconnected',
  'pending',
  'connected',
  'paused',
  'error',
])

export const WHATSAPP_AUTOMATION_MODES = Object.freeze(['ai', 'human', 'paused'])

const secretAssignmentPattern = /((?:access[_-]?token|app[_-]?secret|verify[_-]?token|authorization)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi
const jsonSecretPattern = /((?:"|'|\b)(?:access[_-]?token|app[_-]?secret|verify[_-]?token|authorization)(?:"|'|\b)\s*:\s*)"[^"]*"/gi
const bearerAssignmentPattern = /((?:access[_-]?token|app[_-]?secret|verify[_-]?token|authorization)\s*[:=]\s*bearer\s+)[^\s,;]+/gi
const bearerPattern = /(\bbearer\s+)[^\s,;]+/gi

export function normalizeWhatsAppId(value) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

export function sanitizeWhatsAppErrorMessage(value) {
  const message = String(value ?? '')
    .replace(jsonSecretPattern, '$1"[REDACTED]"')
    .replace(bearerAssignmentPattern, '$1[REDACTED]')
    .replace(secretAssignmentPattern, '$1[REDACTED]')
    .replace(bearerPattern, '$1[REDACTED]')
    .trim()

  return message ? message.slice(0, 500) : null
}

export function buildWhatsAppMessageIdempotencyKey({ providerMessageId, requestId } = {}) {
  const providerId = normalizeWhatsAppId(providerMessageId)
  if (providerId) return `provider:${providerId}`

  const clientRequestId = normalizeWhatsAppId(requestId)
  if (clientRequestId) return `request:${clientRequestId}`

  throw new TypeError('WhatsApp message requires a providerMessageId or requestId')
}
