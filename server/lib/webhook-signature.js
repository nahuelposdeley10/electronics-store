import crypto from 'node:crypto'

export function parseSignatureHeader(xSignature) {
  const parts = {}
  for (const segment of String(xSignature || '').split(',')) {
    const eq = segment.indexOf('=')
    if (eq === -1) continue
    const key = segment.slice(0, eq).trim()
    const value = segment.slice(eq + 1).trim()
    if (key) parts[key] = value
  }
  return parts
}

export function buildWebhookManifest({ paymentId, requestId, ts }) {
  const pairs = []
  if (paymentId) pairs.push(`id:${paymentId}`)
  if (requestId) pairs.push(`request-id:${requestId}`)
  if (ts) pairs.push(`ts:${ts}`)
  return `${pairs.join(';')};`
}

export function verifyWebhookSignature({ xSignature, xRequestId, paymentId, secret }) {
  if (!secret || !paymentId) return false

  const parts = parseSignatureHeader(xSignature)
  const ts = parts.ts
  const received = parts.v1
  if (!ts || !received) return false

  const manifest = buildWebhookManifest({ paymentId, requestId: xRequestId, ts })
  const expected = crypto.createHmac('sha256', secret).update(manifest).digest('hex')
  const expectedBuf = Buffer.from(expected)
  const receivedBuf = Buffer.from(String(received).toLowerCase())

  return expectedBuf.length === receivedBuf.length && crypto.timingSafeEqual(expectedBuf, receivedBuf)
}