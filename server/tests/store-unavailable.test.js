import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { publicTenantId } from '../lib/tenant.js'
import catalog from '../routes/catalog.js'
import settings from '../routes/settings.js'
import checkout from '../routes/checkout.js'

test('HTTP missing and inactive stores return unavailable before reading global data; deactivation is immediate', async (t) => {
  let active = true
  const id = '650000000000000000000001'
  t.mock.method(User, 'findOne', (query) => ({ select: () => ({ lean: async () => query.businessSlug === 'local-a' && query.active === true && active ? { _id: id } : null }) }))
  let productReads = 0
  t.mock.method(Product, 'findOne', (query) => ({ lean: async () => { productReads++; return { id: 1, name: query.adminId ? 'Local A' : 'Global', brand: 'Marca', category: 'audio' } } }))
  const app = express()
  app.use(express.json())
  app.use('/api', checkout, catalog, settings)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
  const request = (path, slug) => fetch(`http://127.0.0.1:${server.address().port}/api${path}`, { method: path === '/checkout' ? 'POST' : 'GET', headers: slug ? { 'x-tenant-slug': slug } : {} })
  assert.equal((await (await request('/products/1')).json()).name, 'Global')
  assert.equal((await (await request('/products/1', 'local-a')).json()).name, 'Local A')
  active = false
  for (const slug of ['local-a', 'inexistente', '__invalid__']) {
    for (const path of ['/products', '/products/1', '/categories', '/brands', '/coupons', '/settings/public', '/checkout']) {
      const res = await request(path, slug)
      assert.equal(res.status, 404, path)
      assert.deepEqual(await res.json(), { error: 'Tienda no disponible', code: 'STORE_UNAVAILABLE' })
    }
  }
  assert.equal(productReads, 2)
  assert.equal(await publicTenantId({ get: () => undefined }), null)
})
