import test from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import jwt from 'jsonwebtoken'
import { APPEARANCE_DEFAULTS, normalizeAppearance, appearanceVariables, contrastInk } from '../../src/lib/appearance.js'
import { sanitizeSettings } from '../lib/settings.js'
import settingsRouter from '../routes/settings.js'
import { User } from '../models/User.js'
import { env } from '../config/env.js'

test('appearance defaults preserve existing stores and reject arbitrary CSS', () => {
  assert.deepEqual(normalizeAppearance(null), APPEARANCE_DEFAULTS)
  const clean = sanitizeSettings({ appearance: { primary: 'url(https://example.com)', accent: '#ABCDEF', background: '#fff', headingFont: 'bad-font', corners: 'rounded', showHero: 'false', showGaming: false, heroButton: '  Ver catálogo  ', css: 'body{}' } }).appearance
  assert.equal(clean.primary, APPEARANCE_DEFAULTS.primary)
  assert.equal(clean.accent, '#abcdef')
  assert.equal(clean.background, APPEARANCE_DEFAULTS.background)
  assert.equal(clean.headingFont, 'anton')
  assert.equal(clean.corners, 'rounded')
  assert.equal(clean.showHero, true)
  assert.equal(clean.showGaming, false)
  assert.equal(clean.heroButton, 'Ver catálogo')
  assert.equal(clean.css, undefined)
  assert.equal(normalizeAppearance({ heroButton: 'x'.repeat(80) }).heroButton.length, 40)
  assert.equal(normalizeAppearance({ backgroundImageUrl: 'javascript:alert(1)' }).backgroundImageUrl, '')
  assert.equal(normalizeAppearance({ backgroundImageUrl: 'https://cdn.example.com/fondo.jpg', backgroundImageMode: 'repeat', backgroundImageStrength: 'strong' }).backgroundImageUrl, 'https://cdn.example.com/fondo.jpg')
  assert.equal(normalizeAppearance({ productsPerRow: '5', productCardStyle: 'elevated', productSpacing: 'compact' }).productsPerRow, 5)
  assert.equal(normalizeAppearance({ productsPerRow: 9 }).productsPerRow, 4)
  assert.equal(normalizeAppearance({ headingFont: 'space' }).headingFont, 'space')
  assert.equal(normalizeAppearance({ headingFont: 'comic-sans' }).headingFont, 'anton')
})

test('theme variables use selected typography, images, corners and readable button text', () => {
  const vars = appearanceVariables({ primary: '#ffffff', accent: '#000000', headingFont: 'archivo', imageFit: 'contain', corners: 'square' })
  assert.equal(vars['--gal-facade-ink'], '#101209')
  assert.equal(vars['--gal-tag-ink'], '#ffffff')
  assert.equal(vars['--store-image-fit'], 'contain')
  assert.equal(vars['--store-radius'], '0px')
  assert.equal(vars['--store-page-background'], APPEARANCE_DEFAULTS.background)
  assert.equal(vars['--gal-panel'], undefined, 'Page colors must not override neutral card surfaces')
  assert.match(vars['--font-sign'], /Archivo/)
  assert.equal(vars['--store-background-image'], 'none')
  assert.equal(vars['--store-grid-columns'], 4)
  const imageVars = appearanceVariables({ backgroundImageUrl: 'https://cdn.example.com/fondo.jpg', backgroundImageMode: 'repeat', backgroundImageStrength: 'strong' })
  assert.match(imageVars['--store-background-image'], /cdn\.example\.com/)
  assert.equal(imageVars['--store-background-repeat'], 'repeat')
  assert.match(imageVars['--store-background-overlay'], /0\.5\)$/)
  const productVars = appearanceVariables({ productsPerRow: 5, productCardStyle: 'elevated', productSpacing: 'compact' })
  assert.equal(productVars['--store-grid-columns'], 5)
  assert.equal(productVars['--store-product-gap'], '10px')
  assert.match(productVars['--store-card-shadow'], /rgba/)
  assert.match(productVars['--store-card-divider'], /rgba/)
  assert.match(appearanceVariables({ headingFont: 'bebas' })['--font-sign'], /Bebas Neue/)
  assert.equal(contrastInk('#175cd3'), '#ffffff')
})

test('HTTP: operators cannot publish appearance even with settings.manage; malformed sections cannot bypass guard', async (t) => {
  const id = '650000000000000000000001'
  t.mock.method(User, 'findById', () => ({ lean: async () => ({ _id: id, active: true, role: 'operator', permissions: ['settings.manage'] }) }))
  const app = express()
  app.use(express.json())
  app.use('/api', settingsRouter)
  const server = app.listen(0, '127.0.0.1')
  await new Promise((resolve) => server.once('listening', resolve))
  t.after(() => new Promise((resolve) => { server.close(resolve); server.closeAllConnections() }))
  const token = jwt.sign({ sub: id, role: 'operator', adminId: id }, env.jwtSecret)
  const request = (section, authenticated = true) => fetch(`http://127.0.0.1:${server.address().port}/api/admin/settings`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json', ...(authenticated ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ section, value: { primary: '#175cd3' } }),
  })
  assert.equal((await request('appearance')).status, 403)
  assert.equal((await request(['appearance'])).status, 400)
  assert.equal((await request('appearance', false)).status, 401)
  const backgroundForm = new FormData()
  backgroundForm.append('field', 'background')
  const backgroundUpload = await fetch(`http://127.0.0.1:${server.address().port}/api/admin/settings/media`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: backgroundForm,
  })
  assert.equal(backgroundUpload.status, 403)
})
