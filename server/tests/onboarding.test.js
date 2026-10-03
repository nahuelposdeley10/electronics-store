import 'dotenv/config'
import test from 'node:test'
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'
import express from 'express'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Setting } from '../models/Setting.js'
import { Onboarding } from '../models/Onboarding.js'
import { defaults } from '../lib/settings.js'
import { onboardingStatus, signature, publicOnboarding } from '../lib/onboarding.js'
import onboardingRouter from '../routes/onboarding.js'

test('onboarding: defaults, real requirements and secrets', () => {
  const settings = defaults()
  const business = { _id: 'a', businessSlug: 'tienda-a' }
  const initial = onboardingStatus({ business, settings, products: 0, available: 0 })
  assert.equal(initial.completed, 0)
  assert.equal(initial.contact.whatsapp, '')
  assert.equal(initial.ready, false)
  settings.store = { ...settings.store, name: 'Casa Norte', email: 'hola@example.test', whatsapp: '5491100000000' }
  settings.payments.mercadopago = { accessToken: 'TEST-secret-token', webhookSecret: 'TEST-secret-webhook' }
  const state = { shippingSignature: signature(settings.shipping) }
  const ready = onboardingStatus({ business, settings, state, products: 3, available: 1 })
  assert.equal(ready.ready, true)
  assert.equal(ready.finished, false)
  state.reviewSignature = ready.reviewSignature
  state.completedAt = new Date()
  assert.equal(onboardingStatus({ business, settings, state, products: 3, available: 1 }).finished, true)
  settings.payments.mercadopago.accessToken = ''
  assert.equal(onboardingStatus({ business, settings, state, products: 3, available: 1 }).finished, false)
  assert.doesNotMatch(JSON.stringify(publicOnboarding(ready)), /TEST-secret|reviewSignature|accessToken|webhookSecret/)
  settings.payments.online = false
  assert.equal(onboardingStatus({ business, settings, state, products: 3, available: 1 }).ready, true)
  settings.shipping.cost += 1
  assert.equal(onboardingStatus({ business, settings, state, products: 3, available: 1 }).ready, false)
})

test('onboarding HTTP: complete flow, persistence, tenant isolation and permissions', async (t) => {
  const database = `bnp-test-onboarding-${randomUUID().slice(0, 12)}`
  const uri = new URL(env.mongodbUri)
  uri.pathname = `/${database}`
  await mongoose.connect(uri.toString(), { dbName: database, serverSelectionTimeoutMS: 10000 })
  t.after(async () => {
    assert.equal(mongoose.connection.name, database)
    assert.match(database, /^bnp-test-onboarding-[a-f0-9-]+$/)
    try { await mongoose.connection.dropDatabase() }
    finally { await mongoose.disconnect() }
  })
  await Promise.all([User.init(), Product.init(), Setting.init(), Onboarding.init()])
  const [a, b, superadmin, operator, inactive] = await User.create([
    { name: 'A', email: 'a@example.test', passwordHash: 'unused', role: 'admin' },
    { name: 'B', email: 'b@example.test', passwordHash: 'unused', role: 'admin', businessSlug: 'business-b' },
    { name: 'Super', email: 'super@example.test', passwordHash: 'unused', role: 'superadmin' },
    { name: 'Operator', email: 'operator@example.test', passwordHash: 'unused', role: 'operator', permissions: ['settings.manage'] },
    { name: 'Inactive', email: 'inactive@example.test', passwordHash: 'unused', role: 'admin', active: false },
  ])
  const token = (user, extra = {}) => jwt.sign({ sub: String(user._id), role: user.role, ...extra }, env.jwtSecret, { expiresIn: '10m' })
  const app = express()
  app.use(express.json())
  app.use('/api/admin/onboarding', onboardingRouter)
  app.use((err, req, res, next) => { if (res.headersSent) return next(err); res.status(err.status || 500).json({ error: err.message }) })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
  const request = async (user, body, query = '', customToken) => {
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/onboarding${query}`, {
      method: body ? 'PUT' : 'GET', headers: { 'Content-Type': 'application/json', ...(user ? { Authorization: `Bearer ${customToken || token(user)}` } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    return { code: response.status, data: await response.json() }
  }
  await t.test('auth and selected-business guards', async () => {
    assert.equal((await request(null)).code, 401)
    assert.equal((await request(operator)).code, 403)
    assert.equal((await request(inactive)).code, 403)
    assert.equal((await request(superadmin)).code, 400)
    assert.equal((await request(superadmin, null, '?tenant=invalid')).code, 400)
    assert.equal((await request(superadmin, null, `?tenant=${operator._id}`)).code, 404)
    assert.equal((await request(a, null, '', token(a, { role: 'superadmin' }))).code, 403)
  })
  await t.test('incomplete setup cannot be completed or forged', async () => {
    assert.equal((await request(a)).data.completed, 0)
    assert.equal((await request(a, { action: 'finish' })).code, 409)
    assert.equal((await request(a, { action: 'visit', value: 'made-up-step' })).code, 400)
    assert.equal((await request(a, { action: 'payments', value: 'whatsapp' })).code, 400)
    assert.equal((await request(a, { action: 'shipping', value: { enabled: true, cost: -1, freeThreshold: 10, label: 'Envío' } })).code, 400)
    assert.equal((await request(a, { completedAt: new Date(), steps: [{ complete: true }] })).code, 400)
  })
  await t.test('identity and URL, duplicate slug and isolation', async () => {
    const value = { name: 'Casa Norte', email: 'hola@example.test', whatsapp: '+54 9 11 0000-0000', slug: 'business-b' }
    assert.equal((await request(a, { action: 'business', value })).code, 409)
    value.slug = 'casa-norte'
    const result = await request(a, { action: 'business', value }, `?tenant=${b._id}`, token(a, { adminId: String(b._id) }))
    assert.equal(result.code, 200)
    assert.equal(result.data.adminId, String(a._id))
    assert.equal(result.data.storePath, '/u/casa-norte')
    assert.equal(result.data.contact.whatsapp, '5491100000000')
    assert.equal(result.data.lastStep, 'catalog')
    assert.equal((await request(b)).data.completed, 0)
  })
  await t.test('actual catalog and stock count, not other tenants', async () => {
    await Product.create({ adminId: b._id, id: 1, name: 'B', brand: 'B', category: 'B', price: 100, stock: 1 })
    assert.equal((await request(a)).data.products, 0)
    await Product.collection.insertOne({ adminId: a._id, id: 99, name: 'Sin clasificar', brand: '', category: '', price: 100, stock: 5 })
    assert.equal((await request(a)).data.products, 0, 'hidden/unclassified products cannot complete the catalog step')
    await Product.create({ adminId: a._id, id: 1, name: 'A', brand: 'A', category: 'A', price: 100, stock: 0 })
    assert.equal((await request(a)).data.products, 1)
    assert.equal((await request(a)).data.available, 0)
    await Product.updateOne({ adminId: a._id, id: 1 }, { $set: { stock: 2 } })
    assert.equal((await request(a)).data.available, 1)
  })
  await t.test('channel toggle keeps credentials, unknown payload cannot overwrite them', async () => {
    const creds = { accessToken: 'TEST-private-token', publicKey: 'TEST-public-key', webhookSecret: 'TEST-webhook' }
    await Setting.updateOne({ adminId: a._id, key: 'base' }, { $set: { 'value.payments.mercadopago': creds } })
    const result = await request(a, { action: 'payments', value: 'whatsapp', mercadopago: { accessToken: null } })
    assert.equal(result.code, 200)
    assert.equal(result.data.payments.online, false)
    assert.doesNotMatch(JSON.stringify(result.data), /TEST-private|TEST-webhook|accessToken|webhookSecret/)
    assert.deepEqual((await Setting.findOne({ adminId: a._id }).lean()).value.payments.mercadopago, creds)
    assert.equal((await request(a, { action: 'payments', value: 'mercadopago' })).data.payments.online, true)
    assert.equal((await request(b)).data.payments.tokenPresent, false)
  })
  await t.test('pause, resume and last step survive a new authenticated session', async () => {
    await request(a, { action: 'visit', value: 'shipping' })
    await request(a, { action: 'pause' })
    assert.equal((await request(a)).data.paused, true)
    assert.equal((await request(a)).data.lastStep, 'shipping')
    assert.equal((await request(b)).data.paused, false)
    assert.equal((await request(a, { action: 'resume' })).data.paused, false)
  })
  await t.test('delivery review and completion, regression and superadmin visibility', async () => {
    assert.equal((await request(a, { action: 'shipping', value: { enabled: false, cost: 0, freeThreshold: 0, label: 'Entrega a coordinar' } })).data.ready, true)
    const finished = await request(a, { action: 'finish' })
    assert.equal(finished.data.finished, true)
    assert.equal(finished.data.completed, 6)
    assert.ok(finished.data.completedAt)
    assert.equal((await request(a)).data.finished, true)
    assert.equal((await request(superadmin, null, `?tenant=${a._id}`)).data.finished, true)
    assert.equal((await request(superadmin, { action: 'pause' }, `?tenant=${b._id}`)).data.paused, true)
    assert.equal((await request(superadmin, { action: 'visit', value: 'catalog' }, `?tenant=${b._id}`)).data.paused, true, 'assistance navigation must preserve the merchant pause')
    assert.equal((await request(a)).data.paused, false)
    await Setting.updateOne({ adminId: a._id }, { $set: { 'value.payments.mercadopago.accessToken': null } })
    assert.equal((await request(a)).data.finished, false)
    assert.equal((await request(a, { action: 'finish' })).code, 409)
    await request(a, { action: 'payments', value: 'whatsapp' })
    assert.equal((await request(a, { action: 'finish' })).data.finished, true)
    await Product.updateOne({ adminId: a._id, id: 1 }, { $set: { stock: 0 } })
    assert.equal((await request(a)).data.ready, false)
  })
})
