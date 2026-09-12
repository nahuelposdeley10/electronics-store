import express from 'express'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Purchase } from '../models/Purchase.js'
import { requireAuth } from '../middleware/auth.js'

const router = express.Router()

router.use(requireAuth)

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
    total += order.total
    subtotal += order.subtotal
    discount += order.discount
    for (const item of order.items) {
      units += item.quantity
    }
  }
  return { count: orders.length, total, subtotal, discount, units }
}

async function loadCatalog() {
  const products = await Product.find().lean()
  const byId = new Map()
  for (const p of products) byId.set(p.id, p)
  return byId
}

/* ---------------- Ventas ---------------- */

router.get('/sales', async (req, res) => {
  try {
    const { start } = parseDays(req.query)
    const days = parseInt(req.query.days, 10)
    const filter = { status: 'approved', demo: { $ne: true }, ...(start ? { createdAt: { $gte: start } } : {}) }
    const refundFilter = { status: 'refunded', demo: { $ne: true }, ...(start ? { createdAt: { $gte: start } } : {}) }

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
        avgTicket: totals.count ? totals.total / totals.count : 0,
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
    const { start } = parseDays(req.query)
    const filter = { status: 'approved', demo: { $ne: true }, ...(start ? { createdAt: { $gte: start } } : {}) }
    const [orders, catalog] = await Promise.all([Order.find(filter).lean(), loadCatalog()])

    const map = new Map()
    for (const order of orders) {
      for (const item of order.items) {
        const row = map.get(item.productId) || {
          productId: item.productId,
          name: item.name,
          brand: catalog.get(item.productId)?.brand || '',
          category: catalog.get(item.productId)?.category || '',
          stock: catalog.get(item.productId)?.stock ?? 0,
          costPrice: catalog.get(item.productId)?.costPrice || 0,
          units: 0,
          revenue: 0,
          avgPrice: 0,
        }
        row.units += item.quantity
        row.revenue += item.unitPrice * item.quantity
        row.avgPrice = row.revenue / row.units
        map.set(row.productId, row)
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
    const { start } = parseDays(req.query)
    const orderFilter = { status: 'approved', demo: { $ne: true }, ...(start ? { createdAt: { $gte: start } } : {}) }
    const purchaseFilter = { ...(start ? { createdAt: { $gte: start } } : {}) }

    const [orders, catalog, purchaseDocs] = await Promise.all([
      Order.find(orderFilter).lean(),
      loadCatalog(),
      Purchase.find(purchaseFilter).lean(),
    ])

    const byProduct = new Map()
    const seriesMap = new Map()
    let revenue = 0
    let cogs = 0
    let units = 0

    for (const order of orders) {
      const day = dayKey(order.createdAt)
      const dayRow = seriesMap.get(day) || { date: day, revenue: 0, cogs: 0 }
      for (const item of order.items) {
        const costPrice = catalog.get(item.productId)?.costPrice || 0
        const row = byProduct.get(item.productId) || {
          productId: item.productId,
          name: item.name,
          brand: catalog.get(item.productId)?.brand || '',
          units: 0,
          revenue: 0,
          costPrice,
          cogs: 0,
          profit: 0,
        }
        const lineRevenue = item.unitPrice * item.quantity
        const lineCogs = costPrice * item.quantity
        row.units += item.quantity
        row.revenue += lineRevenue
        row.cogs += lineCogs
        revenue += lineRevenue
        cogs += lineCogs
        units += item.quantity
        dayRow.revenue += lineRevenue
        dayRow.cogs += lineCogs
        byProduct.set(row.productId, row)
      }
      seriesMap.set(day, dayRow)
    }

    const series = [...seriesMap.values()].sort((a, b) => (a.date < b.date ? -1 : 1))

    const items = [...byProduct.values()].map((row) => ({
      ...row,
      profit: row.revenue - row.cogs,
      marginPct: row.revenue ? ((row.revenue - row.cogs) / row.revenue) * 100 : 0,
    }))
    items.sort((a, b) => b.revenue - a.revenue)

    const spentOnPurchases = purchaseDocs.reduce((s, p) => s + p.total, 0)
    const profit = revenue - cogs
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
    const products = await Product.find().lean()
    let units = 0
    let value = 0
    let costValue = 0
    const statusCounts = { ok: 0, bajo: 0, sin: 0 }

    for (const p of products) {
      const stock = p.stock || 0
      units += stock
      value += stock * p.price
      costValue += stock * (p.costPrice || 0)
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
      .map((p) => ({ id: p.id, name: p.name, brand: p.brand, stock: p.stock, value: (p.stock || 0) * p.price }))

    return res.json({
      totals: { products: products.length, units, value, costValue, potentialProfit: value - costValue },
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
    const { start } = parseDays(req.query)
    const filter = { status: 'approved', demo: { $ne: true }, ...(start ? { createdAt: { $gte: start } } : {}) }
    const orders = await Order.find(filter).sort({ createdAt: 1 }).lean()

    const map = new Map()
    for (const order of orders) {
      const email = order.payerEmail ? String(order.payerEmail).trim().toLowerCase() : null
      const name = [order.payerName, order.payerSurname].filter(Boolean).join(' ').trim()
      const key = email || name || 'sin-id'
      const row = map.get(key) || {
        key,
        email: email || '',
        name: name || (email ? 'Cliente web' : 'Sin identificar'),
        count: 0,
        total: 0,
        last: null,
        first: null,
      }
      row.count += 1
      row.total += order.total
      const created = new Date(order.createdAt)
      if (!row.first || created < new Date(row.first)) row.first = order.createdAt
      if (!row.last || created > new Date(row.last)) row.last = order.createdAt
      map.set(key, row)
    }

    const items = [...map.values()]
      .map((row) => ({ ...row, avg: row.total / row.count }))
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