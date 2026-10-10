import assert from 'node:assert/strict'
import test from 'node:test'
import { assertArcaPointOfSale, hasValidCuitCheckDigit } from '../services/arca.js'

test('ARCA: valida el dígito verificador del CUIT', () => {
  assert.equal(hasValidCuitCheckDigit('20123456786'), true)
  assert.equal(hasValidCuitCheckDigit('20123456787'), false)
  assert.equal(hasValidCuitCheckDigit('20-12345678-6'), true)
})

test('ARCA: valida que el punto de venta exista para el CUIT', () => {
  const response = `
    <FEParamGetPtosVentaResult>
      <ResultGet>
        <PtoVenta><Nro>1</Nro></PtoVenta>
        <PtoVenta><Nro>0007</Nro></PtoVenta>
      </ResultGet>
    </FEParamGetPtosVentaResult>`

  assert.deepEqual(assertArcaPointOfSale(response, '0007'), [1, 7])
  assert.throws(
    () => assertArcaPointOfSale(response, '0002'),
    /no está habilitado para este CUIT en ARCA/,
  )
})
