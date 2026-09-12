export const coupons = {
  BIENVENIDA10: 10,
  STORE15: 15,
}

export function formatARS(value) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(value)
}

const DEFAULT_STEPS = [
  { minPrice: 0, months: 3 },
  { minPrice: 50000, months: 6 },
  { minPrice: 100000, months: 12 },
]

export function installmentsFor(price, steps) {
  const list =
    Array.isArray(steps) && steps.length
      ? steps
          .map((s) => ({ minPrice: Number(s.minPrice) || 0, months: Number(s.months) || 3 }))
          .sort((a, b) => a.minPrice - b.minPrice)
      : DEFAULT_STEPS
  let count = list[0]?.months || 3
  for (const step of list) {
    if (price >= step.minPrice) count = step.months
  }
  const value = Math.ceil(price / count)
  return { count, value }
}
