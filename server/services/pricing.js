import { Product } from '../models/Product.js'
import { Coupon } from '../models/Coupon.js'
import { loadActiveDiscounts, effectiveUnitPrice } from '../lib/discounts.js'

const FREE_SHIPPING_THRESHOLD = 300000
const SHIPPING_COST = 5999

export async function buildCart(items, coupon) {
  const rows = (items || [])
    .map((row) => ({
      id: Number(row?.id),
      quantity: Math.floor(Number(row?.quantity)),
    }))
    .filter((row) => Number.isFinite(row.id) && row.quantity > 0)

  const ids = [...new Set(rows.map((row) => row.id))]
  const dbProducts = await Product.find({ id: { $in: ids } }).lean()
  const byId = new Map(dbProducts.map((p) => [p.id, p]))

  const rules = await loadActiveDiscounts()

  const lineItems = rows
    .map((row) => {
      const product = byId.get(row.id)
      if (!product) return null
      const eff = effectiveUnitPrice(product, rules)
      return {
        product,
        quantity: row.quantity,
        unitPrice: eff.price,
        discountRate: eff.discountRate,
      }
    })
    .filter(Boolean)

  const subtotal = lineItems.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  )

  let discountRate = 0
  let couponCode = null
  if (coupon) {
    const doc = await Coupon.findOne({
      code: String(coupon).toUpperCase(),
      active: true,
    }).lean()
    if (doc) {
      discountRate = doc.percent
      couponCode = doc.code
    }
  }
  const discount = Math.round((subtotal * discountRate) / 100)

  const hasFreeShipping =
    lineItems.some((line) => line.product.freeShipping) ||
    subtotal >= FREE_SHIPPING_THRESHOLD
  const shippingCost =
    lineItems.length === 0 ? 0 : hasFreeShipping ? 0 : SHIPPING_COST

  const total = subtotal - discount + shippingCost

  return {
    lineItems,
    subtotal,
    discount,
    discountRate,
    coupon: couponCode,
    hasFreeShipping,
    shippingCost,
    total,
  }
}