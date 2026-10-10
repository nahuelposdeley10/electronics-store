import test from 'node:test'
import assert from 'node:assert/strict'
import { canTransitionOrder, orderStatusForPayment } from '../lib/order-status.js'

test('Mercado Pago: mapea los estados conocidos sin confundir aprobaciones', () => {
  for (const status of ['approved', 'pending', 'in_process', 'rejected', 'cancelled', 'refunded', 'charged_back']) {
    assert.equal(orderStatusForPayment(status), status)
  }
  assert.equal(orderStatusForPayment('unknown'), 'pending')
  assert.equal(orderStatusForPayment(undefined), 'pending')
})

test('Mercado Pago: una orden pendiente puede aprobarse o rechazarse', () => {
  assert.equal(canTransitionOrder('pending', 'approved'), true)
  assert.equal(canTransitionOrder('pending', 'rejected'), true)
  assert.equal(canTransitionOrder('pending', 'in_process'), true)
})

test('Mercado Pago: una orden aprobada no vuelve a pendiente o rechazada', () => {
  assert.equal(canTransitionOrder('approved', 'pending'), false)
  assert.equal(canTransitionOrder('approved', 'rejected'), false)
  assert.equal(canTransitionOrder('approved', 'refunded'), true)
  assert.equal(canTransitionOrder('approved', 'charged_back'), true)
})

test('Mercado Pago: rechaza transiciones desconocidas', () => {
  assert.equal(canTransitionOrder('invalid', 'approved'), false)
  assert.equal(canTransitionOrder('pending', 'invalid'), false)
})