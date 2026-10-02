const fs = require('node:fs')
const dotenv = require('/var/www/electronics-store/node_modules/dotenv')
const incoming = JSON.parse(fs.readFileSync(0, 'utf8'))
const target = '/var/www/electronics-store/.env'
const values = dotenv.parse(fs.readFileSync(target))
for (const key of ['MP_ACCESS_TOKEN', 'MP_PUBLIC_KEY', 'MP_WEBHOOK_SECRET']) {
  if (incoming[key]) values[key] = incoming[key]
}
fs.copyFileSync(target, `${target}.before-mp-${Date.now()}`)
fs.writeFileSync(target, Object.entries(values).map(([key, value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 })
fs.chmodSync(target, 0o600)
console.log('Mercado Pago global production credentials saved')
