import test from 'node:test'
import assert from 'node:assert/strict'
import { parseLocation, urlForView } from '../src/lib/router.js'
import { commercialContact, formatPrice, planMessage, plans, setupPrice, whatsappUrl } from '../src/views/CompanyHome/content.js'

function at(path) {
  const url = new URL(path, 'http://localhost:5173')
  globalThis.window = { location: { pathname: url.pathname, search: url.search } }
}

test('commercial routes are independent of tenant and payment parameters', () => {
  for (const path of ['/home', '/home/', '/home?status=approved']) {
    at(path)
    assert.equal(parseLocation().name, 'company-home')
  }
  at('/planes')
  assert.equal(parseLocation().name, 'plans')
  assert.equal(urlForView('plans'), '/home#planes')
})

test('admin and scoped store routes retain their behavior', () => {
  at('/admin')
  assert.equal(parseLocation().name, 'dashboard')
  at('/')
  assert.equal(parseLocation().name, 'dashboard')
  at('/u/mi-tienda')
  assert.equal(parseLocation().name, 'home')
  at('/u/mi-tienda/p/4')
  assert.deepEqual(parseLocation(), { name: 'product', payload: { id: 4 } })
  assert.equal(urlForView('cart'), '/u/mi-tienda/cart')
  at('/u/mi-tienda/cart')
  assert.equal(parseLocation().name, 'cart')
  at('/u/mi-tienda?status=approved&external_reference=123')
  assert.deepEqual(parseLocation(), { name: 'order-status', payload: { status: 'approved', orderId: '123' } })
})

test('all plan links use the company contact and exact monthly prices', () => {
  assert.equal(commercialContact.whatsapp, '5491176731388')
  assert.deepEqual(plans.map(({ price }) => price), [49900, 89900, 149900])
  assert.equal(setupPrice, 250000)
  for (const plan of plans) {
    const url = new URL(whatsappUrl(planMessage(plan)))
    assert.equal(url.origin, 'https://wa.me')
    assert.equal(url.pathname, '/5491176731388')
    assert.equal(url.searchParams.get('text'), `Hola, quiero conocer el plan ${plan.name} de Tienda BNP, de ${formatPrice(plan.price)} por mes. ¿Cómo podemos comenzar?`)
    assert.ok(plan.features.length)
  }
})
