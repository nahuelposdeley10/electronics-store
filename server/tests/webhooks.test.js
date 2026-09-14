import { createHmac } from 'node:crypto'
import { buildWebhookManifest, verifyWebhookSignature } from '../lib/webhook-signature.js'
import { canTransitionOrder, orderStatusForPayment } from '../lib/order-status.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

const SECRET = 'secret-de-prueba'
const paymentId = 'pay-123'
const requestId = 'req-456'
const ts = '1742505638683'

function sign({ paymentId, requestId, ts }) {
  const manifest = buildWebhookManifest({ paymentId, requestId, ts })
  return createHmac('sha256', SECRET).update(manifest).digest('hex')
}

const v1 = sign({ paymentId, requestId, ts })
const header = `ts=${ts},v1=${v1}`

check(
  verifyWebhookSignature({ xSignature: header, xRequestId: requestId, paymentId, secret: SECRET }),
  'firma válida de MP es aceptada',
)
check(
  !verifyWebhookSignature({ xSignature: header, xRequestId: requestId, paymentId: 'otro-777', secret: SECRET }),
  'firma no corresponde a otro data.id',
)
check(
  !verifyWebhookSignature({ xSignature: header, xRequestId: 'req-mal', paymentId, secret: SECRET }),
  'firma no corresponde a otro x-request-id',
)
check(
  !verifyWebhookSignature({ xSignature: header, xRequestId: requestId, paymentId, secret: 'otro-secreto' }),
  'firma no corresponde a otro secreto',
)
check(
  !verifyWebhookSignature({ xSignature: `ts=${ts},v1=abc`, xRequestId: requestId, paymentId, secret: SECRET }),
  'firma con v1 corrupto es rechazada (largo distinto)',
)
check(
  !verifyWebhookSignature({ xSignature: '', xRequestId: requestId, paymentId, secret: SECRET }),
  'header x-signature vacío es rechazado',
)
check(
  !verifyWebhookSignature({ xSignature: header, xRequestId: requestId, paymentId, secret: '' }),
  'sin secreto configurado no se verifica',
)

check(canTransitionOrder('pending', 'approved'), 'pending -> approved permitido')
check(canTransitionOrder('pending', 'rejected'), 'pending -> rejected permitido')
check(!canTransitionOrder('approved', 'pending'), 'approved no puede volver a pending')
check(!canTransitionOrder('approved', 'in_process'), 'approved no puede volver a in_process')
check(!canTransitionOrder('approved', 'cancelled'), 'approved no puede volver a cancelled')
check(canTransitionOrder('approved', 'refunded'), 'approved -> refunded permitido')
check(canTransitionOrder('approved', 'charged_back'), 'approved -> charged_back permitido')
check(!canTransitionOrder('pending', 'refunded'), 'pending -> refunded no permitido')
check(orderStatusForPayment('approved') === 'approved', 'status map approved -> approved')
check(orderStatusForPayment('desconocido') === 'pending', 'status desconocido -> pending')

console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
process.exit(exitCode)