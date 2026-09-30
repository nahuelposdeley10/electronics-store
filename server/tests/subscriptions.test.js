import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import { subscriptionSummary, subscriptionToday, validateSubscription, validateSubscriptionPayment } from '../lib/subscriptions.js'
import { Subscription } from '../models/Subscription.js'
import { User } from '../models/User.js'
import router from '../routes/subscriptions.js'
import { env } from '../config/env.js'

test('subscription dates, amounts and derived overdue state', () => {
  assert.equal(subscriptionSummary(null).effectiveStatus, 'unconfigured')
  assert.equal(subscriptionToday(new Date('2026-09-30T01:00:00Z')), '2026-09-29')
  assert.equal(subscriptionSummary({ status: 'active', dueDate: '2026-09-29' }, '2026-09-29').effectiveStatus, 'active')
  assert.equal(subscriptionSummary({ status: 'active', dueDate: '2026-09-29' }, '2026-09-30').effectiveStatus, 'overdue')
  assert.equal(subscriptionSummary({ status: 'cancelled', dueDate: '2026-09-29' }, '2026-09-30').effectiveStatus, 'cancelled')
  const valid = { plan: 'Mensual', price: 20000, dueDate: '2026-10-29', status: 'active' }
  assert.deepEqual(validateSubscription(valid), valid)
  for (const patch of [{ price: -1 }, { price: '100' }, { price: Infinity }, { plan: '' }, { dueDate: '2026-02-30' }, { status: 'overdue' }]) {
    assert.throws(() => validateSubscription({ ...valid, ...patch }), { status: 400 })
  }
  const payment = { requestId: 'a'.repeat(20), amount: 20000, paidAt: '2025-01-01', dueDate: '2026-11-29', method: 'efectivo', reference: ' recibo 1 ' }
  assert.equal(validateSubscriptionPayment(payment, valid, 'actor').reference, 'recibo 1')
  for (const patch of [{ amount: 0 }, { paidAt: '9999-01-01' }, { dueDate: '2026-01-01' }, { method: 'bad' }]) {
    assert.throws(() => validateSubscriptionPayment({ ...payment, ...patch }, valid, 'actor'), { status: 400 })
  }
})

test('HTTP subscriptions: superadmin only, tenant separation, payment retries and stale writes', async (t) => {
  const ownerA = '650000000000000000000001'
  const ownerB = '650000000000000000000002'
  const actor = '650000000000000000000003'
  const records = new Map()
  t.mock.method(User, 'findById', (id) => ({ lean: async () => ({ _id: id, role: id === actor ? 'superadmin' : 'admin', active: true }) }))
  t.mock.method(User, 'exists', async ({ _id }) => [ownerA, ownerB].includes(_id) ? { _id } : null)
  t.mock.method(Subscription, 'findOne', ({ adminId }) => ({ lean: async () => structuredClone(records.get(adminId) || null) }))
  t.mock.method(Subscription, 'findOneAndUpdate', (query, update) => ({ lean: async () => {
    let current = records.get(query.adminId)
    if (update.$setOnInsert) {
      if (!current) { current = { ...subscriptionSummary(null), adminId: query.adminId, payments: [] }; records.set(query.adminId, current) }
      return structuredClone(current)
    }
    if (!current || query.revision !== current.revision) return null
    if (query['payments.requestId'] && current.payments.some((p) => p.requestId === query['payments.requestId'].$ne)) return null
    Object.assign(current, update.$set)
    current.revision += update.$inc.revision
    if (update.$push) current.payments.push(update.$push.payments)
    return structuredClone(current)
  } }))
  const app = express()
  app.use(express.json())
  app.use('/subscriptions', router)
  app.use((err, req, res, next) => { if (res.headersSent) return next(err); res.status(err.status || 500).json({ error: err.message }) })
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
  const request = (id, method = 'GET', body, role = 'superadmin') => fetch(`http://127.0.0.1:${server.address().port}/subscriptions/${id}`, {
    method, headers: { 'Content-Type': 'application/json', ...(role ? { Authorization: `Bearer ${jwt.sign({ sub: role === 'superadmin' ? actor : ownerA, role }, env.jwtSecret)}` } : {}) }, body: body ? JSON.stringify(body) : undefined,
  })
  assert.equal((await request(ownerA, 'GET', null, null)).status, 401)
  for (const role of ['admin', 'operator']) {
    assert.equal((await request(ownerA, 'GET', null, role)).status, 403)
    assert.equal((await request(ownerA, 'PUT', {}, role)).status, 403)
    assert.equal((await request(ownerA + '/payments', 'POST', {}, role)).status, 403)
  }
  assert.equal((await request('bad-id')).status, 404)
  assert.equal((await request(actor)).status, 404)
  assert.equal((await (await request(ownerA)).json()).effectiveStatus, 'unconfigured')
  const plan = { plan: 'Mensual', price: 25000, dueDate: '2026-10-01', status: 'active', revision: 0 }
  assert.equal((await request(ownerA, 'PUT', plan)).status, 200)
  assert.equal((await request(ownerA, 'PUT', plan)).status, 409)
  const payment = { requestId: 'retry-00000000000001', amount: 25000, paidAt: '2025-01-01', dueDate: '2026-11-01', method: 'transferencia', reference: '123', revision: 1 }
  const results = await Promise.all([request(ownerA + '/payments', 'POST', payment), request(ownerA + '/payments', 'POST', payment)])
  assert.ok(results.every((res) => [200, 201].includes(res.status)))
  const saved = await (await request(ownerA)).json()
  assert.equal(saved.payments.length, 1)
  assert.equal(saved.dueDate, '2026-11-01')
  assert.equal(saved.payments[0].recordedBy, actor)
  assert.equal((await (await request(ownerB)).json()).payments.length, 0)
  assert.equal((await request(ownerB + '/payments', 'POST', payment)).status, 400)
})
