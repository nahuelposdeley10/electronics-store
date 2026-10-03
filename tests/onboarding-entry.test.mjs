import test from 'node:test'
import assert from 'node:assert/strict'
import { claimOnboardingEntry, onboardingMode, ONBOARDING_ENTRY_KEY } from '../src/lib/onboardingEntry.js'
import { clearSession, storeSession } from '../src/lib/api.js'

function memoryStorage() {
  const values = new Map()
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) }
}

const pending = { adminId: 'merchant-a', paused: false, finished: false, completedAt: null }
const enter = (storage, status = pending, role = 'admin', userId = 'merchant-a') => claimOnboardingEntry({ role, userId, status, storage })

test('only the merchant admin enters automatically, once per signed-in tab', () => {
  const storage = memoryStorage()
  assert.equal(enter(storage), true)
  assert.equal(enter(storage), false, 'refresh and navigation must not redirect again')
  assert.equal(enter(storage, { ...pending, adminId: 'merchant-b' }, 'admin', 'merchant-b'), true, 'another account has its own entry decision')
})

test('deferred, finished and previously completed setups never auto-open', () => {
  for (const status of [{ ...pending, paused: true }, { ...pending, finished: true }, { ...pending, completedAt: '2026-10-03' }]) {
    const storage = memoryStorage()
    assert.equal(enter(storage, status), false)
    assert.equal(enter(storage), false, 'a later configuration regression cannot interrupt the current session')
  }
})

test('missing data, wrong tenant, superadmin and operator never consume admin entry', () => {
  const storage = memoryStorage()
  assert.equal(enter(storage, null), false)
  assert.equal(enter(storage, { ...pending, adminId: 'merchant-b' }), false)
  assert.equal(enter(storage, pending, 'superadmin'), false)
  assert.equal(enter(storage, pending, 'operator'), false)
  assert.equal(storage.getItem(ONBOARDING_ENTRY_KEY), null)
  assert.equal(enter(storage), true, 'a failed initial request may retry')
})

test('superadmin only mounts assistance after opening it and selecting a business', () => {
  const base = { role: 'superadmin', canConfigure: true, screen: 'overview', tenantId: 'merchant-a' }
  assert.equal(onboardingMode(base), null)
  assert.equal(onboardingMode({ ...base, screen: 'products' }), null)
  assert.equal(onboardingMode({ ...base, screen: 'onboarding', tenantId: null }), null)
  assert.equal(onboardingMode({ ...base, screen: 'onboarding' }), 'assistance')
  assert.equal(onboardingMode({ ...base, role: 'admin', tenantId: null }), 'owner')
  assert.equal(onboardingMode({ ...base, role: 'operator', screen: 'onboarding' }), null)
  assert.equal(onboardingMode({ ...base, role: 'admin', canConfigure: false }), null)
})

test('a fresh login and logout reset only the tab entry marker, not business progress', (t) => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage')
  const storage = memoryStorage()
  Object.defineProperty(globalThis, 'sessionStorage', { value: storage, configurable: true })
  t.after(() => {
    if (original) Object.defineProperty(globalThis, 'sessionStorage', original)
    else delete globalThis.sessionStorage
  })
  assert.equal(enter(storage), true)
  storeSession({ token: 'test-only', user: { id: 'merchant-a', role: 'admin' } })
  assert.equal(storage.getItem(ONBOARDING_ENTRY_KEY), null)
  assert.equal(enter(storage), true)
  clearSession()
  assert.equal(storage.getItem(ONBOARDING_ENTRY_KEY), null)
  assert.equal(enter(storage, { ...pending, paused: true }), false, 'server-side pause still wins after login')
})

test('storage failures do not prevent opening the guide', () => {
  const storage = { getItem() { throw new Error('disabled') } }
  assert.equal(enter(storage), true)
  assert.equal(enter(storage, { ...pending, paused: true }), false)
})
