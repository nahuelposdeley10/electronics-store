import crypto from 'node:crypto'

export function createRefreshToken() {
  return crypto.randomBytes(32).toString('hex')
}

export function verifyRefreshToken(expected, provided) {
  if (!expected || !provided) return false
  const a = Buffer.from(String(expected))
  const b = Buffer.from(String(provided))
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}