export const STATUS_MAP = {
  approved: 'approved',
  pending: 'pending',
  in_process: 'in_process',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'charged_back',
}

const ALLOWED_TRANSITIONS = {
  pending: ['pending', 'in_process', 'approved', 'rejected', 'cancelled'],
  in_process: ['in_process', 'approved', 'rejected', 'cancelled'],
  approved: ['approved', 'refunded', 'charged_back'],
  rejected: ['rejected', 'approved'],
  cancelled: ['cancelled', 'approved'],
  refunded: ['refunded', 'charged_back'],
  charged_back: ['charged_back', 'refunded'],
}

export function orderStatusForPayment(paymentStatus) {
  return STATUS_MAP[paymentStatus] || 'pending'
}

export function canTransitionOrder(current, next) {
  const allowed = ALLOWED_TRANSITIONS[current]
  return Boolean(allowed && allowed.includes(next))
}