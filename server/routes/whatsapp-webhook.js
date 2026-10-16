import express from 'express'
import { whatsappGraphConfig, whatsappWebhookVerifyToken } from '../lib/whatsapp-config.js'
import { verifyMetaWhatsappSignature } from '../services/whatsapp-cloud.js'
import { processWhatsappPayload } from '../services/whatsapp-webhook.js'

const router = express.Router()

// Integration contract for the app layer: pass this function as the `verify`
// callback of express.json() so Meta's signature is checked against exact bytes.
export function captureWhatsappRawBody(req, res, buffer) {
  req.rawBody = Buffer.from(buffer)
}

router.get('/webhook', (req, res) => {
  const mode = String(req.query['hub.mode'] || '')
  const token = String(req.query['hub.verify_token'] || '')
  const challenge = String(req.query['hub.challenge'] || '')
  const expected = whatsappWebhookVerifyToken()
  if (mode === 'subscribe' && expected && token === expected && challenge) return res.status(200).send(challenge)
  return res.sendStatus(403)
})

router.post('/webhook', async (req, res) => {
  const rawBody = Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.isBuffer(req.body) ? req.body : null
  const { appSecret } = whatsappGraphConfig()
  if (!rawBody) {
    return res.status(503).json({ error: 'Webhook de WhatsApp requiere conservar el cuerpo crudo para validar la firma' })
  }
  if (!verifyMetaWhatsappSignature({ rawBody, signature: req.get('x-hub-signature-256'), appSecret })) {
    return res.sendStatus(401)
  }
  let payload
  try {
    payload = JSON.parse(rawBody.toString('utf8'))
  } catch {
    return res.status(400).json({ error: 'Payload de WhatsApp inválido' })
  }
  try {
    const result = await processWhatsappPayload(payload)
    return res.status(200).json({ ok: true, ...result })
  } catch (error) {
    console.error('[whatsapp] Error procesando webhook', { status: error?.status || 500 })
    return res.sendStatus(503)
  }
})

export default router
