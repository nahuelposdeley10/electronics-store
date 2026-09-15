import { Product } from '../models/Product.js'
import { Coupon } from '../models/Coupon.js'
import { getSettings } from '../lib/settings.js'
import { roundMoney, roundLine } from '../lib/money.js'

export async function buildCart(items, coupon, tenant = null) {
  const { shipping } = await getSettings({ tenant })
  const shippingEnabled = shipping?.enabled !== false
  const shippingCostSetting = Number(shipping?.cost)
  const shippingFreeThreshold = Number(shipping?.freeThreshold)
  const shippingLabel = String(shipping?.label || 'Envío a domicilio')
  const SHIPPING_COST = shippingEnabled && shippingCostSetting > 0 ? shippingCostSetting : 0
  const FREE_SHIPPING_THRESHOLD =
    shippingFreeThreshold > 0 ? shippingFreeThreshold : Infinity
  const rows = (items || [])
    .map((row) => ({
      id: Number(row?.id),
      quantity: Math.floor(Number(row?.quantity)),
    }))
    .filter((row) => Number.isFinite(row.id) && row.quantity > 0)

  const ids = [...new Set(rows.map((row) => row.id))]
  const productFilter = tenant ? { id: { $in: ids }, adminId: tenant } : { id: { $in: ids }, adminId: null }
  const dbProducts = await Product.find(productFilter).lean()
  const byId = new Map(dbProducts.map((p) => [p.id, p]))

  const lineItems = rows
    .map((row) => {
      const product = byId.get(row.id)
      if (!product) return null
      const unitPrice = roundMoney(product.price)
      return {
        product,
        quantity: row.quantity,
        unitPrice,
        lineTotal: roundLine(unitPrice, row.quantity),
      }
    })
    .filter(Boolean)

  const subtotal = lineItems.reduce(
    (sum, line) => sum + line.lineTotal,
    0,
  )

  let discountRate = 0
  let couponCode = null
  if (coupon) {
    const couponFilter = tenant
      ? { code: String(coupon).toUpperCase(), active: true, adminId: tenant }
      : { code: String(coupon).toUpperCase(), active: true, adminId: null }
    const doc = await Coupon.findOne(couponFilter).lean()
    if (doc) {
      discountRate = doc.percent
      couponCode = doc.code
    }
  }
  const discount = roundMoney((subtotal * discountRate) / 100)

  const hasFreeShipping =
    shippingEnabled &&
    (lineItems.some((line) => line.product.freeShipping) ||
      subtotal >= FREE_SHIPPING_THRESHOLD)
  const shippingCost = roundMoney(
    lineItems.length === 0 ? 0 : hasFreeShipping ? 0 : SHIPPING_COST,
  )

  const total = roundMoney(subtotal - discount + shippingCost)

  return {
    lineItems,
    subtotal,
    discount,
    discountRate,
    coupon: couponCode,
    hasFreeShipping,
    shippingEnabled,
    shippingCost,
    shippingLabel,
    total,
  }
}