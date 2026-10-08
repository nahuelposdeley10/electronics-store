import assert from 'node:assert/strict'
import test from 'node:test'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { requireAuth } from '../middleware/auth.js'

const userId = '507f1f77bcf86cd799439011'

function makeRequest(token) {
  return {
    get(name) {
      return name.toLowerCase() === 'authorization' ? `Bearer ${token}` : ''
    },
  }
}

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(body) {
      this.body = body
      return this
    },
  }
}

function token() {
  return jwt.sign({ sub: userId, email: 'audit@example.invalid' }, env.jwtSecret)
}

async function runWithUser(user) {
  const originalFindById = User.findById
  User.findById = () => ({
    select: () => ({
      lean: async () => user,
    }),
  })

  const response = makeResponse()
  let continued = false
  try {
    await requireAuth(makeRequest(token()), response, () => {
      continued = true
    })
  } finally {
    User.findById = originalFindById
  }
  return { response, continued }
}

test('requireAuth permite una cuenta activa', async () => {
  const result = await runWithUser({ _id: userId, active: true })
  assert.equal(result.continued, true)
  assert.equal(result.response.statusCode, null)
})

test('requireAuth rechaza un JWT emitido antes de desactivar la cuenta', async () => {
  const result = await runWithUser({ _id: userId, active: false })
  assert.equal(result.continued, false)
  assert.equal(result.response.statusCode, 401)
  assert.deepEqual(result.response.body, { error: 'Sesión inválida o vencida' })
})
