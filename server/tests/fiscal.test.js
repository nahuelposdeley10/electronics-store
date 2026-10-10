import assert from 'node:assert/strict'
import test from 'node:test'
import { fiscalSnapshot, normalizeFiscalSettings } from '../lib/fiscal.js'

test('fiscal: la modalidad externa deja la venta pendiente de comprobante', () => {
  const snapshot = fiscalSnapshot({ mode: 'external', providerName: 'ARCA', cuit: '20-12345678-9', pointOfSale: '0001' })
  assert.equal(snapshot.mode, 'external')
  assert.equal(snapshot.status, 'external_pending')
  assert.equal(snapshot.providerName, 'ARCA')
  assert.equal(snapshot.cuit, '20123456789')
  assert.equal(snapshot.pointOfSale, '0001')
})

test('fiscal: la gestión interna no se presenta como comprobante fiscal', () => {
  const snapshot = fiscalSnapshot({ mode: 'internal' })
  assert.equal(snapshot.status, 'not_applicable')
  assert.equal(snapshot.type, null)
  assert.equal(snapshot.cae, null)
})

test('fiscal: una modalidad desconocida vuelve a facturación externa segura', () => {
  const settings = normalizeFiscalSettings({ mode: 'inventado', cuit: 'abc' })
  assert.equal(settings.mode, 'external')
  assert.equal(settings.cuit, '')
})
