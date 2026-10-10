import assert from 'node:assert/strict'
import test from 'node:test'

process.env.ARCA_ENCRYPTION_KEY = process.env.ARCA_ENCRYPTION_KEY || 'local-test-key'
const { decryptArcaSecret, encryptArcaSecret } = await import('../lib/arca-crypto.js')

test('ARCA: las credenciales se cifran y se recuperan sin guardar texto plano', () => {
  const secret = '-----BEGIN PRIVATE KEY-----\nlocal-test\n-----END PRIVATE KEY-----'
  const encrypted = encryptArcaSecret(secret)
  assert.notEqual(encrypted, secret)
  assert.equal(decryptArcaSecret(encrypted), secret)
})
