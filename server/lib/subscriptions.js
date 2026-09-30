export const subscriptionDefaults = { plan: '', price: 0, dueDate: '', status: 'unconfigured', revision: 0 }

export function subscriptionToday(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
}

function invalid(message) { throw Object.assign(new Error(message), { status: 400 }) }

function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) invalid('Fecha inválida')
  const parsed = new Date(value + 'T00:00:00Z')
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) invalid('Fecha inválida')
  return value
}

function amount(value, min = 0) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > 100000000) invalid('Importe inválido')
  return Math.round((value + Number.EPSILON) * 100) / 100
}

export function subscriptionSummary(raw, today = subscriptionToday()) {
  const { plan, price, dueDate, status, revision } = { ...subscriptionDefaults, ...raw }
  const effectiveStatus = ['active', 'trial'].includes(status) && dueDate && dueDate < today ? 'overdue' : status
  return { plan, price, dueDate, status, revision, effectiveStatus, currency: 'ARS' }
}

export function validateSubscription(body) {
  const plan = typeof body?.plan === 'string' ? body.plan.trim() : ''
  if (!plan || plan.length > 80) invalid('Ingresá un plan de hasta 80 caracteres')
  if (!['trial', 'active', 'paused', 'cancelled'].includes(body.status)) invalid('Estado inválido')
  return { plan, price: amount(body.price), dueDate: date(body.dueDate), status: body.status }
}

export function validateSubscriptionPayment(body, current, recordedBy) {
  if (!current.plan) invalid('Configurá primero el plan de la suscripción')
  if (typeof body?.requestId !== 'string' || !/^[a-zA-Z0-9-]{16,80}$/.test(body.requestId)) invalid('Identificador de pago inválido')
  if (!['transferencia', 'efectivo', 'otro'].includes(body.method)) invalid('Medio de pago inválido')
  const paidAt = date(body.paidAt)
  const dueDate = date(body.dueDate)
  if (paidAt > subscriptionToday()) invalid('El pago no puede tener fecha futura')
  if (dueDate < paidAt || (current.dueDate && dueDate < current.dueDate)) invalid('El vencimiento no puede retroceder ni ser anterior al pago')
  if (typeof body.reference !== 'string' || body.reference.length > 200) invalid('Referencia inválida (máximo 200 caracteres)')
  return { requestId: body.requestId, amount: amount(body.amount, 0.01), paidAt, dueDate, method: body.method, reference: body.reference.trim(), plan: current.plan, recordedBy }
}
