import express from 'express'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Purchase } from '../models/Purchase.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { tenantScopeOf, requireTenantIdOf } from '../lib/tenant.js'
import { roundMoney, roundLine } from '../lib/money.js'

const router = express.Router()

router.use(requireAuth)
router.use(requirePermission('reports.view'))

function requireTenant(req, res, next) {
  try {
    requireTenantIdOf(req)
    next()
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }
}

router.use(requireTenant)

function parseDays(query) {
  const days = parseInt(query.days, 10)
  if (Number.isFinite(days) && days > 0) {
    return { start: new Date(Date.now() - days * 86400000) }
  }
  return { start: null }
}

function dayKey(date) {
  const d = new Date(date)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function emptySeries(start, days) {
  if (!start || !Number.isFinite(days) || days <= 0) return null
  const series = []
  const today = new Date()
  today.setHours(23, 59, 59, 999)
  const cursor = new Date(start.getTime())
  cursor.setHours(0, 0, 0, 0)
  while (cursor <= today) {
    series.push({ date: dayKey(cursor), count: 0, total: 0 })
    cursor.setDate(cursor.getDate() + 1)
  }
  return series
}

function sumOrders(orders) {
  let total = 0
  let subtotal = 0
  let discount = 0
  let units = 0
  for (const order of orders) {
    total += roundMoney(order.total)
    subtotal += roundMoney(order.subtotal)
    discount += roundMoney(order.discount)
    for (const item of order.items) {
      units += item.quantity
    }
  }
  return { count: orders.length, total, subtotal, discount, units }
}

function productKey(adminId, productId) {
  return `${adminId ? String(adminId) : 'global'}:${productId}`
}

async function loadCatalog(scope) {
  const products = await Product.find(scope).lean()
  const byId = new Map()
  for (const p of products) byId.set(productKey(p.adminId, p.id), p)
  return byId
}

/* ---------------- Ventas ---------------- */

router.get('/sales', async (req, res) => {
  try {
    const scope = tenantScopeOf(req)
    const { start } = parseDays(req.query)
    const days = parseInt(req.query.days, 10)
    const filter = { status: 'approved', demo: { $ne: true }, ...scope, ...(start ? { createdAt: { $gte: start } } : {}) }
    const refundFilter = { status: 'refunded', demo: { $ne: true }, ...scope, ...(start ? { createdAt: { $gte: start } } : {}) }

    const [approved, refunded] = await Promise.all([
      Order.find(filter).lean(),
      Order.find(refundFilter).lean(),
    ])

    const totals = sumOrders(approved)
    const byPayment = new Map()
    const bySource = new Map()
    const seriesMap = new Map()

    for (const order of approved) {
      const payment = order.payment || 'unknown'
      const source = order.source || 'web'
      byPayment.set(payment, byPayment.get(payment) || { key: payment, count: 0, total: 0 })
      const p = byPayment.get(payment)
      p.count += 1
      p.total += order.total

      bySource.set(source, bySource.get(source) || { key: source, count: 0, total: 0 })
      const s = bySource.get(source)
      s.count += 1
      s.total += order.total

      const key = dayKey(order.createdAt)
      seriesMap.set(key, (seriesMap.get(key) || { date: key, count: 0, total: 0 }))
      const row = seriesMap.get(key)
      row.count += 1
      row.total += order.total
    }

    let filledSeries = emptySeries(start, days)
    if (filledSeries) {
      for (const row of filledSeries) {
        const hit = seriesMap.get(row.date)
        if (hit) {
          row.count = hit.count
          row.total = hit.total
        }
      }
    } else {
      filledSeries = [...seriesMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1))
    }

    const refundedTotals = sumOrders(refunded)

    return res.json({
      totals: {
        count: totals.count,
        total: totals.total,
        subtotal: totals.subtotal,
        discount: totals.discount,
        units: totals.units,
        avgTicket: totals.count ? roundMoney(totals.total / totals.count) : 0,
      },
      series: filledSeries,
      byPayment: [...byPayment.values()].sort((a, b) => b.total - a.total),
      bySource: [...bySource.values()].sort((a, b) => b.total - a.total),
      refunded: { count: refundedTotals.count, total: refundedTotals.total },
    })
  } catch (error) {
    console.error('Sales report error:', error)
    return res.status(500).json({ error: 'No se pudo generar el reporte de ventas' })
  }
})

/* ---------------- Productos ---------------- */

router.get('/products', async (req, res) => {
  try {
    const scope = tenantScopeOf(req)
    const { start } = parseDays(req.query)
    const filter = { status: 'approved', demo: { $ne: true }, ...scope, ...(start ? { createdAt: { $gte: start } } : {}) }
    const [orders, catalog] = await Promise.all([Order.find(filter).lean(), loadCatalog(scope)])

    const map = new Map()
    for (const order of orders) {
      const adminId = order.adminId ? String(order.adminId) : null
      for (const item of order.items) {
        const key = productKey(adminId, item.productId)
        const product = catalog.get(key)
        const row = map.get(key) || {
          adminId,
          productId: item.productId,
          name: item.name,
          brand: product?.brand || '',
          category: product?.category || '',
          stock: product?.stock ?? 0,
          costPrice: product?.costPrice || 0,
          units: 0,
          revenue: 0,
          avgPrice: 0,
        }
        row.units += item.quantity
        row.revenue += roundLine(item.unitPrice, item.quantity)
        row.avgPrice = roundMoney(row.revenue / row.units)
        map.set(key, row)
      }
    }

    const items = [...map.values()].sort((a, b) => b.units - a.units)
    return res.json({
      items,
      totals: {
        uniqueProducts: items.length,
        units: items.reduce((s, i) => s + i.units, 0),
        revenue: items.reduce((s, i) => s + i.revenue, 0),
      },
    })
  } catch (error) {
    console.error('Products report error:', error)
    return res.status(500).json({ error: 'No se pudo generar el reporte de productos' })
  }
})

/* ---------------- Ganancias ---------------- */

router.get('/profit', async (req, res) => {
  try {
    const scope = tenantScopeOf(req)
    const { start } = parseDays(req.query)
    const orderFilter = { status: 'approved', demo: { $ne: true }, ...scope, ...(start ? { createdAt: { $gte: start } } : {}) }
    const purchaseFilter = { ...scope, ...(start ? { createdAt: { $gte: start } } : {}) }

    const [orders, catalog, purchaseDocs] = await Promise.all([
      Order.find(orderFilter).lean(),
      loadCatalog(scope),
      Purchase.find(purchaseFilter).lean(),
    ])

    const byProduct = new Map()
    const seriesMap = new Map()
    let revenue = 0
    let cogs = 0
    let units = 0

    for (const order of orders) {
      const adminId = order.adminId ? String(order.adminId) : null
      const day = dayKey(order.createdAt)
      const dayRow = seriesMap.get(day) || { date: day, revenue: 0, cogs: 0 }
      for (const item of order.items) {
        const key = productKey(adminId, item.productId)
        const product = catalog.get(key)
        const costPrice = product?.costPrice || 0
        const row = byProduct.get(key) || {
          adminId,
          productId: item.productId,
          name: item.name,
          brand: product?.brand || '',
          units: 0,
          revenue: 0,
          costPrice,
          cogs: 0,
          profit: 0,
        }
        const lineRevenue = roundLine(item.unitPrice, item.quantity)
        const lineCogs = roundLine(costPrice, item.quantity)
        row.units += item.quantity
        row.revenue += lineRevenue
        row.cogs += lineCogs
        revenue += lineRevenue
        cogs += lineCogs
        units += item.quantity
        dayRow.revenue += lineRevenue
        dayRow.cogs += lineCogs
        byProduct.set(key, row)
      }
      seriesMap.set(day, dayRow)
    }

    const series = [...seriesMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1))

    const items = [...byProduct.values()].map((row) => ({
      ...row,
      profit: roundMoney(row.revenue - row.cogs),
      marginPct: row.revenue ? ((row.revenue - row.cogs) / row.revenue) * 100 : 0,
    }))
    items.sort((a, b) => b.revenue - a.revenue)

const spentOnPurchases = roundMoney(purchaseDocs.reduce((s, p) => s + p.total, 0))
  const profit = roundMoney(revenue - cogs)
    const marginPct = revenue ? (profit / revenue) * 100 : 0

    return res.json({
      totals: {
        revenue,
        cogs,
        profit,
        marginPct,
        units,
        spentOnPurchases,
        purchaseCount: purchaseDocs.length,
      },
      series,
      items,
    })
  } catch (error) {
    console.error('Profit report error:', error)
    return res.status(500).json({ error: 'No se pudo generar el reporte de ganancias' })
  }
})

/* ---------------- Stock ---------------- */

router.get('/stock', async (req, res) => {
  try {
    const scope = tenantScopeOf(req)
    const products = await Product.find(scope).lean()

    let units = 0
    let value = 0
    let costValue = 0
    const statusCounts = { ok: 0, bajo: 0, sin: 0 }

    for (const p of products) {
      const stock = p.stock || 0
      units += stock
      value += roundLine(p.price, stock)
      costValue += roundLine(p.costPrice || 0, stock)
      const min = p.minStock || 0
      if (stock <= 0) statusCounts.sin += 1
      else if (min > 0 && stock <= min) statusCounts.bajo += 1
      else statusCounts.ok += 1
    }

    const low = products
      .filter((p) => {
        const stock = p.stock || 0
        const min = p.minStock || 0
        return stock <= 0 || (min > 0 && stock <= min)
      })
      .map((p) => ({
        _id: p._id,
        id: p.id,
        adminId: p.adminId ? String(p.adminId) : null,
        name: p.name,
        brand: p.brand,
        price: p.price,
        stock: p.stock,
        minStock: p.minStock || 0,
        status: p.stock <= 0 ? 'sin' : 'bajo',
      }))
      .sort((a, b) => a.stock - b.stock)

    const topValue = [...products]
      .sort((a, b) => (b.stock || 0) * b.price - (a.stock || 0) * a.price)
      .slice(0, 10)
      .map((p) => ({ adminId: p.adminId ? String(p.adminId) : null, id: p.id, name: p.name, brand: p.brand, stock: p.stock, value: roundLine(p.price, p.stock || 0) }))

    return res.json({
      totals: { products: products.length, units, value, costValue, potentialProfit: roundMoney(value - costValue) },
      statusCounts,
      low,
      topValue,
    })
  } catch (error) {
    console.error('Stock report error:', error)
    return res.status(500).json({ error: 'No se pudo generar el reporte de stock' })
  }
})

/* ---------------- Clientes ---------------- */

router.get('/customers', async (req, res) => {
  try {
    const scope = tenantScopeOf(req)
    const { start } = parseDays(req.query)
    const filter = { status: 'approved', demo: { $ne: true }, ...scope, ...(start ? { createdAt: { $gte: start } } : {}) }
    const orders = await Order.find(filter).sort({ createdAt: 1 }).lean()

    const map = new Map()
    for (const order of orders) {
      const adminId = order.adminId ? String(order.adminId) : null
      const email = order.payerEmail ? String(order.payerEmail).trim().toLowerCase() : null
      const name = [order.payerName, order.payerSurname].filter(Boolean).join(' ').trim()
      const key = `${adminId || 'global'}:${email || name || 'sin-id'}`
      const row = map.get(key) || {
        adminId,
        key,
        email: email || '',
        name: name || (email ? 'Cliente web' : 'Sin identificar'),
        count: 0,
        total: 0,
        last: null,
        first: null,
      }
      row.count += 1
      row.total += roundMoney(order.total)
      const created = new Date(order.createdAt)
      if (!row.first || created < new Date(row.first)) row.first = order.createdAt
      if (!row.last || created > new Date(row.last)) row.last = order.createdAt
      map.set(key, row)
    }

    const items = [...map.values()]
      .map((row) => ({ ...row, avg: roundMoney(row.total / row.count) }))
      .sort((a, b) => b.total - a.total)

    return res.json({
      items,
      totals: {
        customers: items.filter((c) => c.key !== 'sin-id').length,
        total: items.reduce((s, c) => s + c.total, 0),
      },
    })
  } catch (error) {
    console.error('Customers report error:', error)
    return res.status(500).json({ error: 'No se pudo generar el reporte de clientes' })
  }
})

export default router
