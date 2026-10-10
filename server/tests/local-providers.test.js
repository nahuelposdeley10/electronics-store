import assert from 'node:assert/strict'
import test from 'node:test'
import { env } from '../config/env.js'
import { getMpConfig } from '../services/mercadopago.js'

test('local: los proveedores externos quedan desactivados por defecto', async () => {
  assert.equal(env.isProd, false)
  assert.equal(env.externalProvidersEnabled, false)
  assert.equal(env.emailProvider, 'none')
  assert.equal(env.imageStorageProvider, 'local')
  assert.deepEqual(await getMpConfig(), {
    configured: false,
    accessToken: null,
    webhookSecret: null,
    publicKey: null,
  })
})
