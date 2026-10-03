import test from 'node:test'
import assert from 'node:assert/strict'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { createApp } from '../server/app.js'
import { companyUrl, companyMeta, companyStructuredData, plans, formatPrice } from '../src/views/CompanyHome/content.js'
import { companyHtml } from '../scripts/company-html.js'

// Integration against the real build and Express, without connecting to MongoDB.
// Run after npm run build.
test('commercial HTML is complete on the first response and isolated from tenant/admin routes', async (t) => {
  const server = createApp().listen(0, '127.0.0.1')
  t.after(() => new Promise((resolve) => server.close(resolve)))
  await once(server, 'listening')
  const origin = `http://127.0.0.1:${server.address().port}`

  for (const route of ['/home', '/home/', '/planes', '/home?subscription=return', '/home?status=approved&tenant=ignored']) {
    const response = await fetch(origin + route)
    assert.equal(response.status, 200, route)
    const html = await response.text()
    assert.match(html, /data-prerender="company"/)
    assert.match(html, /<h1[^>]*>.*Tu tienda online\./)
    assert.match(html, /<details><summary>¿Necesito saber programar\?/)
    assert.match(html, /Administrás el catálogo/)
    assert.equal((html.match(/rel="canonical"/g) || []).length, 1)
    assert.ok(html.includes(`<link rel="canonical" href="${companyUrl}"`))
    assert.equal((html.match(/<title>/g) || []).length, 1)
    assert.ok(html.includes(`<title>${companyMeta.title}</title>`))
    const json = html.match(/<script type="application\/ld\+json" data-seo-jsonld="company">([\s\S]*?)<\/script>/)
    assert.ok(json, 'JSON-LD must exist without running JavaScript')
    assert.deepEqual(JSON.parse(json[1]), companyStructuredData())
    for (const plan of plans) {
      assert.ok(html.includes(`>${plan.name}</h3>`))
      assert.ok(html.includes(`>${formatPrice(plan.price)}</strong>`))
    }
    const css = [...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g)].map((match) => match[1])
    assert.ok(css.some((href) => href.includes('CompanyHome-')), 'landing CSS must load without JavaScript')
    assert.equal(new Set(css).size, css.length)
    for (const href of css) {
      const stylesheet = await fetch(origin + href)
      assert.equal(stylesheet.status, 200)
      assert.match(stylesheet.headers.get('content-type'), /text\/css/)
    }
  }

  for (const route of ['/admin', '/activar-cuenta?token=not-a-real-token', '/u/mi-tienda', '/u/mi-tienda/p/4', '/u/mi-tienda/cart', '/']) {
    const response = await fetch(origin + route)
    assert.equal(response.status, 200)
    const html = await response.text()
    assert.match(html, /<div id="root"><\/div>/)
    assert.doesNotMatch(html, /data-prerender|data-seo-jsonld|rel="canonical"/)
  }
  assert.deepEqual(await (await fetch(origin + '/api/health')).json(), { ok: true })
  assert.match(await (await fetch(origin + '/robots.txt')).text(), /User-agent: \*/)
  assert.match(await (await fetch(origin + '/sitemap.xml')).text(), /<urlset/)
  assert.equal((await fetch(origin + '/home', { method: 'HEAD' })).status, 200)
})

test('HTML generation preserves literal content and fails if its template is incompatible', async () => {
  const template = await readFile(new URL('../index.html', import.meta.url), 'utf8')
  const literal = '<p>Importe $& / precio $1</p>'
  assert.ok(companyHtml(template, { body: literal, year: 2026 }).includes(literal))
  assert.throws(() => companyHtml('<html></html>', { body: '', year: 2026 }), /raíz vacía/)
})
