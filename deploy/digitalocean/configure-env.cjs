const fs = require('node:fs')
const crypto = require('node:crypto')
const dotenv = require('/var/www/electronics-store/node_modules/dotenv')
const target = '/var/www/electronics-store/.env'
const incoming = JSON.parse(fs.readFileSync(0, 'utf8'))
const values = dotenv.parse(fs.readFileSync(target))
const allowed = [
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
  'IMAGE_STORAGE_PROVIDER', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL',
]
for (const key of allowed) if (!values[key] && incoming[key]) values[key] = incoming[key]
values.NODE_ENV = 'production'
values.PORT = '3000'
values.HOST = '127.0.0.1'
values.CLIENT_URL = 'https://tiendabnp.com'
values.SERVER_URL = values.CLIENT_URL
values.CORS_ORIGINS = values.CLIENT_URL
if (!values.MONGODB_URI) throw new Error('MONGODB_URI missing')
if (!values.JWT_SECRET || values.JWT_SECRET.length < 32) {
  values.JWT_SECRET = crypto.randomBytes(48).toString('hex')
  console.log('JWT_SECRET strengthened; previous login sessions will expire')
}
fs.copyFileSync(target, `${target}.preproduction-${Date.now()}`)
fs.writeFileSync(target, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 })
fs.chmodSync(target, 0o600)
console.log('Production URLs configured; image credentials present:', allowed.every(key => Boolean(values[key])))
