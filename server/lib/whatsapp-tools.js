import mongoose from 'mongoose'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { buildCart } from '../services/pricing.js'

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
function safeProduct(product) {
  return {
    id: product.id,
    name: product.name,
    brand: product.brand,
    category: product.category,
    price: product.price,
    oldPrice: product.oldPrice || null,
    stock: product.stock,
    freeShipping: product.freeShipping === true,
    image: product.image || null,
    description: String(product.description || '').slice(0, 500),
    specs: Array.isArray(product.specs) ? product.specs.slice(0, 12) : [],
  }
}

export async function searchProducts({ tenant, query = '', category, maxPrice, inStockOnly = true, limit = 8 } = {}) {
  if (!tenant || !mongoose.Types.ObjectId.isValid(tenant)) throw new Error('Tenant inválido para buscar productos')
  const filter = { adminId: tenant }
  const terms = String(query || '').trim().split(/\s+/).filter(Boolean).slice(0, 6)
  if (terms.length) {
    filter.$and = terms.map((term) => {
      const expression = new RegExp(escapeRegex(term), 'i')
      return { $or: [{ name: expression }, { brand: expression }, { category: expression }, { description: expression }, { specs: expression }] }
    })
  }
  if (category) filter.category = new RegExp(`^${escapeRegex(category)}$`, 'i')
  if (Number.isFinite(Number(maxPrice))) filter.price = { $lte: Math.max(0, Number(maxPrice)) }
  if (inStockOnly !== false) filter.stock = { $gt: 0 }
  const safeLimit = Math.min(20, Math.max(1, Number(limit) || 8))
  const products = await Product.find(filter).sort({ onSale: -1, stock: -1, price: 1 }).limit(safeLimit).lean()
  return { items: products.map(safeProduct), total: products.length }
}

export async function getOrderStatus({ tenant, orderId, refreshToken } = {}) {
  if (!tenant || !mongoose.Types.ObjectId.isValid(tenant)) throw new Error('Tenant inválido para consultar la orden')
  if (!mongoose.Types.ObjectId.isValid(orderId) || !String(refreshToken || '').trim()) {
    return { found: false, reason: 'order_id_and_refresh_token_required' }
  }
  const order = await Order.findOne({
    _id: orderId,
    adminId: tenant,
    refreshToken: String(refreshToken).trim(),
  }).select('_id status total paymentId createdAt items').lean()
  if (!order) return { found: false }
  return {
    found: true,
    id: String(order._id),
    status: order.status,
    total: order.total,
    paymentId: order.paymentId,
    createdAt: order.createdAt,
    items: (order.items || []).map((item) => ({ name: item.name, quantity: item.quantity, unitPrice: item.unitPrice })),
  }
}

export async function quoteWhatsappCart({ tenant, items, coupon } = {}) {
  const cart = await buildCart(items, coupon, tenant)
  return {
    items: cart.lineItems.map((line) => ({
      id: line.product.id,
      name: line.product.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      stock: line.product.stock,
    })),
    subtotal: cart.subtotal,
    discount: cart.discount,
    shippingCost: cart.shippingCost,
    shippingLabel: cart.shippingLabel,
    total: cart.total,
    coupon: cart.coupon,
    hasFreeShipping: cart.hasFreeShipping,
  }
}
