import test from 'node:test'
import assert from 'node:assert/strict'
import { STORE_PAGES, isNavGroupActive } from '../../src/views/Dashboard/storeNavigation.js'

test('store screens have distinct destinations and keep existing saved screen IDs', () => {
  const ids = STORE_PAGES.map((page) => page.id)
  assert.equal(new Set(ids).size, 4)
  for (const id of ['settings-store', 'settings-appearance', 'settings-general', 'settings-content']) assert.ok(ids.includes(id))
  assert.equal(STORE_PAGES.find((page) => page.id === 'settings-appearance').adminOnly, true)
})

test('navigation expands only the group owning a screen, even with a shared settings prefix', () => {
  const store = { id: 'storefront', children: STORE_PAGES }
  const admin = { id: 'settings', prefix: 'settings-', children: [{ id: 'settings-users' }, { id: 'settings-payments' }] }
  for (const page of STORE_PAGES) {
    assert.equal(isNavGroupActive(store, page.id), true)
    assert.equal(isNavGroupActive(admin, page.id), false)
  }
  assert.equal(isNavGroupActive(admin, 'settings-payments'), true)
  assert.equal(isNavGroupActive(store, 'settings-payments'), false)
  assert.equal(isNavGroupActive({ id: 'overview' }, 'overview'), true)
  assert.equal(isNavGroupActive({ id: 'overview' }, 'settings-content'), false)
})
