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

export function installmentsFor(price) {
  const count = price >= 100000 ? 12 : price >= 50000 ? 6 : 3
  const value = Math.ceil(price / count)
  return { count, value }
}
