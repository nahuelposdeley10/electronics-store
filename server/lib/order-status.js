export const STATUS_MAP = {
  approved: 'approved',
  pending: 'pending',
  in_process: 'in_process',
  rejected: 'rejected',
  cancelled: 'cancelled',
  refunded: 'refunded',
  charged_back: 'charged_back',
}

export function orderStatusForPayment(paymentStatus) {
  return STATUS_MAP[paymentStatus] || 'pending'
}