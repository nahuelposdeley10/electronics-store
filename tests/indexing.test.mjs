import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createApp } from '../server/app.js'
import { NO_INDEX, PAYMENT_QUERY_KEYS, shouldNoIndex } from '../src/lib/indexing.js'
import { applySEO, applyRobotsPolicy, seoMeta } from '../src/lib/seo.js'

const privateRoutes = [
  '/', '/index.html', '/admin', '/admin/', '/admin?tenant=example',
  '/activar-cuenta?token=example-not-valid', '/cart', '/order-status',
  '/u/mi-tienda/cart', '/u/mi-tienda/cart/', '/u/otra-tienda/cart',
  '/u/mi-tienda/order-status', '/u/mi-tienda?status=pending&external_reference=example',
  '/u/mi-tienda?collection_status=approved', '/home?subscription=return',
  '/api/health',
  ...PAYMENT_QUERY_KEYS.map((key) => `/u/mi-tienda?${key}=example`),
]
const publicRoutes = [
  '/home', '/home/', '/planes', '/planes/', '/home?utm_source=google',
  '/u/mi-tienda', '/u/mi-tienda/', '/u/mi-tienda/p/4', '/u/mi-tienda/info/contacto',
  '/u/cart', '/u/admin', '/u/activar-cuenta', '/u/order-status',
  '/u/mi-tienda?category=cart', '/u/mi-tienda?search=status',
  '/home?subscription=information', '/robots.txt', '/sitemap.xml',
]

test('private routes and payment returns are excluded without hiding public stores', () => {
  for (const url of privateRoutes) {
    assert.equal(shouldNoIndex(url), true, url)
    assert.equal(shouldNoIndex(`https://www.tiendabnp.com${url}`), true, url)
  }
  for (const url of publicRoutes) assert.equal(shouldNoIndex(url), false, url)
  assert.equal(shouldNoIndex('/administer'), false)
  assert.equal(shouldNoIndex('/u/mi-tienda/carteles'), false)
  assert.equal(shouldNoIndex('/ADMIN/'), true)
})

test('Express sends noindex on GET and HEAD before JavaScript; public responses stay indexable', async (t) => {
  const server = createApp().listen(0, '127.0.0.1')
  t.after(() => new Promise((resolve) => server.close(resolve)))
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`
  for (const method of ['GET', 'HEAD']) {
    for (const route of [...privateRoutes, ...publicRoutes]) {
      const response = await fetch(origin + route, { method })
      assert.equal(response.status, 200, `${method} ${route}`)
      assert.equal(response.headers.get('x-robots-tag'), privateRoutes.includes(route) ? NO_INDEX : null, `${method} ${route}`)
      await response.arrayBuffer()
    }
  }
})

test('robots lets Google read HTML exclusions; sitemap contains only public canonical URLs', async () => {
  const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8')
  const disallowed = [...robots.matchAll(/^Disallow:\s*(.+)$/gm)].map((match) => match[1].trim())
  assert.deepEqual(disallowed, ['/api/'])
  const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8')
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1])
  assert.ok(locations.length > 0)
  for (const url of locations) assert.equal(shouldNoIndex(url), false, url)
})

test('Vercel static headers include every private route family and payment query key', async () => {
  const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'))
  const rules = config.headers.filter((rule) => rule.headers.some(({ key, value }) => key === 'X-Robots-Tag' && value === NO_INDEX))
  assert.deepEqual(rules.filter((rule) => !rule.has).map((rule) => rule.source), [
    '/', '/index.html', '/admin/:path*', '/activar-cuenta/:path*', '/cart/:path*',
    '/order-status/:path*', '/api/:path*', '/u/:slug/cart/:path*', '/u/:slug/order-status/:path*',
  ])
  const queries = rules.filter((rule) => rule.has)
  assert.deepEqual(queries.map((rule) => rule.has[0].key), [...PAYMENT_QUERY_KEYS, 'subscription'])
  for (const rule of queries) {
    assert.equal(rule.source, '/:path*')
    assert.equal(rule.has[0].type, 'query')
    assert.equal(rule.has[0].value, rule.has[0].key === 'subscription' ? 'return' : undefined)
  }
})

// Minimal head fixture: exercises metadata writes and SPA cleanup without a new DOM dependency.
function createDocument() {
  const nodes = []
  return {
    title: '',
    head: {
      appendChild(node) { nodes.push(node) },
      querySelector(selector) {
        const [, tag, attr, value] = selector.match(/^(\w+)\[([^=]+)="([^"]+)"\]$/)
        return nodes.find((node) => node.tag === tag && (
          attr === 'data-seo-jsonld' ? node.dataset.seoJsonld === value : (node.attrs[attr] || node[attr]) === value
        )) || null
      },
    },
    createElement(tag) {
      return {
        tag, attrs: {}, dataset: {},
        setAttribute(key, value) { this.attrs[key] = value },
        remove() { nodes.splice(nodes.indexOf(this), 1) },
      }
    },
  }
}

test('client metadata excludes lazy private screens and clears/restores public SEO during navigation', (t) => {
  const originalDocument = globalThis.document
  const originalWindow = globalThis.window
  globalThis.document = createDocument()
  globalThis.window = { location: new URL('https://www.tiendabnp.com/home') }
  t.after(() => {
    if (originalDocument === undefined) delete globalThis.document
    else globalThis.document = originalDocument
    if (originalWindow === undefined) delete globalThis.window
    else globalThis.window = originalWindow
  })
  const canonical = 'https://www.tiendabnp.com/home'
  const company = { title: 'Tienda BNP', canonical, structuredData: { '@type': 'Organization' } }
  const robots = () => document.head.querySelector('meta[name="robots"]').attrs.content
  const getCanonical = () => document.head.querySelector('link[rel="canonical"]')
  const jsonld = () => document.head.querySelector('script[data-seo-jsonld="company"]')

  applySEO(company)
  assert.equal(robots(), 'index, follow')
  assert.equal(getCanonical().href, canonical)
  assert.ok(jsonld())

  for (const [url, name] of [
    ['/admin', 'dashboard'], ['/activar-cuenta?token=example', 'account-activation'],
    ['/u/mi-tienda/cart', 'cart'], ['/u/mi-tienda?status=pending', 'order-status'],
  ]) {
    window.location = new URL(url, canonical)
    assert.equal(applyRobotsPolicy(), true, 'lazy bootstrap is protected')
    const metadata = seoMeta({ view: { name } })
    assert.equal(metadata.noIndex, true)
    applySEO(metadata)
    assert.equal(robots(), NO_INDEX)
    assert.equal(getCanonical(), null)
    assert.equal(document.head.querySelector('meta[property="og:url"]'), null)
    assert.equal(jsonld(), null)
  }

  window.location = new URL('/home?subscription=return', canonical)
  applySEO({ ...company, noIndex: false })
  assert.equal(robots(), NO_INDEX, 'a public component cannot override a payment URL exclusion')
  assert.equal(getCanonical(), null)

  window.location = new URL('/u/mi-tienda/p/4', canonical)
  applySEO(seoMeta({ view: { name: 'product' }, product: { id: 4, name: 'Producto ejemplo' } }))
  assert.equal(robots(), 'index, follow')
  assert.equal(getCanonical().href, window.location.href)

  window.location = new URL(canonical)
  applySEO(company)
  assert.equal(robots(), 'index, follow')
  assert.equal(getCanonical().href, canonical)
  assert.ok(jsonld())
})
