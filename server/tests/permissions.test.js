import assert from 'node:assert/strict'
import test from 'node:test'
import { User } from '../models/User.js'
import { requirePermission } from '../middleware/auth.js'
import { normalizePermissions, permissionsForUser, sanitizeSettings } from '../lib/settings.js'

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

test('permisos: inventory.write incluye inventory.read', () => {
  const permissions = normalizePermissions(['inventory.write'])

  assert.deepEqual(permissions, ['inventory.write', 'inventory.read'])
})

test('permisos: inventory.read no concede escritura', () => {
  const permissions = normalizePermissions(['inventory.read'])

  assert.deepEqual(permissions, ['inventory.read'])
})

test('permisos: conserva permisos válidos y descarta valores desconocidos', () => {
  const permissions = normalizePermissions(['sales.read', 'inventory.write', 'not-a-permission', 'sales.read'])

  assert.deepEqual(permissions, ['sales.read', 'inventory.write', 'inventory.read'])
})

test('permisos: un rol heredado con escritura también puede leer inventario', () => {
  const settings = sanitizeSettings({ roles: { operator: ['inventory.write'] } })

  assert.deepEqual(settings.roles.operator, ['inventory.write', 'inventory.read'])
})

test('permisos: un usuario con solo inventory.write puede consultar ajustes', async () => {
  const permissions = await permissionsForUser({
    role: 'admin',
    permissions: ['inventory.write'],
  })

  assert.equal(permissions.includes('inventory.write'), true)
  assert.equal(permissions.includes('inventory.read'), true)
})

test('middleware: inventory.write permite leer los movimientos de ajustes', async () => {
  const originalFindById = User.findById
  User.findById = () => ({
    lean: async () => ({ role: 'admin', permissions: ['inventory.write'] }),
  })

  const request = { user: { sub: '507f1f77bcf86cd799439011', adminId: null } }
  const response = makeResponse()
  let continued = false

  try {
    await requirePermission('inventory.read')(request, response, () => {
      continued = true
    })
  } finally {
    User.findById = originalFindById
  }

  assert.equal(continued, true)
  assert.equal(response.statusCode, null)
  assert.equal(request.user.perms.includes('inventory.read'), true)
})
