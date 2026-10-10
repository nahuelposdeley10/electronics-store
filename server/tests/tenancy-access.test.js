import assert from 'node:assert/strict'
import test from 'node:test'
import { canAccessOverview } from '../lib/dashboard-access.js'
import { aggregateSoldUnits, productMetricKey } from '../lib/tenant-product-metrics.js'

test('dashboard: un operador sin ventas ni reportes no puede ver el overview', () => {
  assert.equal(canAccessOverview('operator', []), false)
  assert.equal(canAccessOverview('operator', ['catalog.manage']), false)
  assert.equal(canAccessOverview('operator', ['sales.read']), true)
  assert.equal(canAccessOverview('admin', []), true)
  assert.equal(canAccessOverview('superadmin', []), true)
})

test('tenancy: las métricas separan el mismo ID de producto por tenant', () => {
  const sold = aggregateSoldUnits([
    { adminId: 'tenant-a', items: [{ productId: 1, quantity: 2 }] },
    { adminId: 'tenant-b', items: [{ productId: 1, quantity: 5 }] },
    { adminId: 'tenant-a', items: [{ productId: 1, quantity: 3 }] },
  ])

  assert.equal(productMetricKey('tenant-a', 1), 'tenant-a:1')
  assert.equal(sold.get('tenant-a:1'), 5)
  assert.equal(sold.get('tenant-b:1'), 5)
  assert.notEqual(sold.get('tenant-a:1'), 10)
})
