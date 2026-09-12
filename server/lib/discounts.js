import { Discount } from '../models/Discount.js'

const CACHE_TTL = 30000
let cache = { rules: [], at: 0 }

export async function loadActiveDiscounts(force = false) {
  const now = Date.now()
  if (!force && now - cache.at < CACHE_TTL) {
    return cache.rules
  }
  const rules = await Discount.find({ active: true }).lean()
  cache = { rules, at: now }
  return rules
}

export function discountRateFor(product, rules) {
  let rate = 0
  for (const rule of rules) {
    let matches = false
    if (rule.scope === 'global') {
      matches = true
    } else if (rule.scope === 'category') {
      matches = rule.target === product.category
    } else if (rule.scope === 'brand') {
      matches = rule.target === product.brand
    } else if (rule.scope === 'product') {
      matches = String(rule.target) === String(product.id)
    }
    if (matches && rule.percent > rate) {
      rate = rule.percent
    }
  }
  return rate
}

export function effectiveUnitPrice(product, rules) {
  const rate = discountRateFor(product, rules)
  return {
    price: rate > 0 ? Math.round((product.price * (100 - rate)) / 100) : product.price,
    discountRate: rate,
  }
}

export async function clearDiscountCache() {
  cache = { rules: [], at: 0 }
}

export async function applyDiscountsToProduct(product) {
  const rules = await loadActiveDiscounts()
  return effectiveUnitPrice(product, rules)
}