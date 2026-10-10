import crypto from 'node:crypto'
import { env } from '../config/env.js'

const ALGORITHM = 'aes-256-gcm'

function encryptionKey() {
  if (!env.arcaEncryptionKey) {
    const error = new Error('Falta ARCA_ENCRYPTION_KEY en la configuración del servidor')
    error.status = 503
    throw error
  }
  return crypto.createHash('sha256').update(env.arcaEncryptionKey).digest()
}

export function encryptArcaSecret(value) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, encryptionKey(), iv)
  const encrypted = Buffer.concat([cipher.update(String(value), 'utf8'), cipher.final()])
  return JSON.stringify({
    v: 1,
    iv: iv.toString('base64url'),
    tag: cipher.getAuthTag().toString('base64url'),
    data: encrypted.toString('base64url'),
  })
}

export function decryptArcaSecret(payload) {
  const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload
  if (!parsed || parsed.v !== 1) throw new Error('Formato de credencial ARCA inválido')
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    encryptionKey(),
    Buffer.from(parsed.iv, 'base64url'),
  )
  decipher.setAuthTag(Buffer.from(parsed.tag, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.data, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}
