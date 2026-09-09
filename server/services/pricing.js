import { products } from '../../src/data/products.js'
import { coupons } from '../../src/data/format.js'

const FREE_SHIPPING_THRESHOLD = 300000
const SHIPPING_COST = 5999

export function buildCart(items, coupon) {
  const lineItems = (items || [])
    .map((row) => {
      const product = products.find((p) => p.id === Number(row?.id))
      const quantity = Math.floor(Number(row?.quantity))
      return { product, quantity }
    })
    .filter((line) => line.product && line.quantity > 0)

  const subtotal = lineItems.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  )

  const discountRate = coupon && coupons[coupon] ? coupons[coupon] : 0
  const discount = Math.round((subtotal * discountRate) / 100)

  const hasFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD
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