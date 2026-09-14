export function roundMoney(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function roundLine(unitPrice, quantity) {
  const unit = Number(unitPrice)
  const qty = Number(quantity)
  if (!Number.isFinite(unit) || !Number.isFinite(qty) || qty <= 0) return 0
  return roundMoney(unit * qty)
}