import { Product } from '../models/Product.js'
import { coupons } from '../../src/data/format.js'

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

  const lineItems = rows
    .map((row) => ({ product: byId.get(row.id), quantity: row.quantity }))
    .filter((line) => line.product)

  const subtotal = lineItems.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  )

  const discountRate = coupon && coupons[coupon] ? coupons[coupon] : 0
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
    coupon: discountRate ? coupon : null,
    hasFreeShipping,
    shippingCost,
    total,
  }
}