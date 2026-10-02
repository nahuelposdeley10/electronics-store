const fs = require('node:fs')
const dotenv = require('dotenv')
const env = dotenv.parse(fs.readFileSync('.env'))
const origin = 'https://137.184.155.228'
async function main() {
  for (const path of ['/', '/admin', '/u/local', '/u/mi-tienda', '/api/health', '/api/settings/public']) {
    const result = await fetch(origin + path)
    if (!result.ok) throw new Error(`${path}: ${result.status}`)
    console.log(path, result.status)
  }
  for (const slug of ['local', 'mi-tienda']) {
    const response = await fetch(origin + '/api/products', { headers: { 'x-tenant-slug': slug } })
    const data = await response.json()
    if (!response.ok || !Array.isArray(data.items)) throw new Error('Catalog failed: ' + slug)
    console.log('Catalog', slug, 'products:', data.total)
  }
  const unauthorized = await fetch(origin + '/api/admin/settings')
  if (unauthorized.status !== 401) throw new Error('Admin authentication guard failed')
  console.log('Admin requires authentication: OK')
  const missing = await fetch(origin + '/api/products', { headers: { 'x-tenant-slug': 'nonexistent-production-check-20261001' } })
  if (missing.status !== 404) throw new Error('Unknown store isolation failed: ' + missing.status)
  console.log('Unknown store isolated: OK')
  if (env.SUPERADMIN_EMAIL && env.SUPERADMIN_PASSWORD) {
    const login = await fetch(origin + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: env.SUPERADMIN_EMAIL, password: env.SUPERADMIN_PASSWORD }) })
    const data = await login.json()
    if (!login.ok || !data.token) throw new Error('Existing superadmin login failed: ' + login.status)
    const me = await fetch(origin + '/api/auth/me', { headers: { Authorization: `Bearer ${data.token}` } })
    if (!me.ok) throw new Error('Session verification failed')
    console.log('Existing superadmin login and session: OK')
  } else console.log('Login credentials unavailable for automated smoke test')
  const socket = await fetch(origin + '/socket.io/?EIO=4&transport=polling')
  if (!socket.ok || !(await socket.text()).startsWith('0')) throw new Error('Socket.IO handshake failed')
  console.log('Socket.IO handshake: OK')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
