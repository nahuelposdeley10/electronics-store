import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import test from 'node:test'
import { captureWhatsappRawBody } from '../routes/whatsapp-webhook.js'
import { verifyMetaWhatsappSignature } from '../services/whatsapp-cloud.js'
import { publicWhatsappConfig } from '../lib/whatsapp-config.js'
import { sanitizeWhatsAppErrorMessage } from '../lib/whatsapp-persistence.js'

test('WhatsApp: verifica la firma HMAC sobre el cuerpo crudo', () => {
  const rawBody = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account' }))
  const appSecret = 'test-app-secret'
  const signature = `sha256=${crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')}`

  assert.equal(verifyMetaWhatsappSignature({ rawBody, signature, appSecret }), true)
  assert.equal(verifyMetaWhatsappSignature({ rawBody: Buffer.from(`${rawBody} `), signature, appSecret }), false)
  assert.equal(verifyMetaWhatsappSignature({ rawBody, signature: 'sha256=bad', appSecret }), false)
})

test('WhatsApp: conserva el body original para la validación de Meta', () => {
  const req = {}
  captureWhatsappRawBody(req, {}, Buffer.from('{"ok":true}'))
  assert.deepEqual(req.rawBody, Buffer.from('{"ok":true}'))
})

test('WhatsApp: la configuración pública nunca expone credenciales', () => {
  const publicConfig = publicWhatsappConfig({
    enabled: true,
    phoneNumberId: 'phone-123',
    accessTokenEncrypted: JSON.stringify({ data: 'secret' }),
    connectionStatus: 'connected',
  })

  assert.equal(publicConfig.tokenConfigured, true)
  assert.equal('accessToken' in publicConfig, false)
  assert.equal('accessTokenEncrypted' in publicConfig, false)
})

test('WhatsApp: redacta secretos en mensajes de error persistibles', () => {
  const safe = sanitizeWhatsAppErrorMessage('authorization: Bearer abc123 appSecret=xyz')
  assert.equal(safe.includes('abc123'), false)
  assert.equal(safe.includes('xyz'), false)
  assert.match(safe, /REDACTED/i)
})
