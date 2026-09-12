import express from 'express'
import { Product } from '../models/Product.js'
import { StockMovement } from '../models/StockMovement.js'
import { Purchase } from '../models/Purchase.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  parsePagination,
  buildProductSearchFilter,
  escapeRegex,
  parseMulti,
} from '../lib/catalog-query.js'
import { changeStock } from '../lib/stock.js'

const router = express.Router()

router.use(requireAuth)

const MOVEMENT_TYPES = new Set(['venta', 'compra', 'ajuste', 'devolucion', 'inventario'])

function stockStatus(product) {
  const stock = Number(product.stock) || 0
  const min = Number(product.minStock) || 0
  if (stock <= 0) return 'sin'
  if (min > 0 && stock <= min) return 'bajo'
  return 'ok'
}

/* ---------------- Stock actual ---------------- */

router.get('/stock', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    const filter = buildProductSearchFilter(req.query.q)

    const categories = parseMulti(req.query.category)
    if (categories) filter.category = { $in: categories }

    const brands = parseMulti(req.query.brand)
    if (brands) filter.brand = { $in: brands }

    if (req.query.low === '1' || req.query.low === 'true') {
      filter.$expr = { $lte: ['$stock', '$minStock'] }
    }

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ category: 1, brand: 1, name: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    return res.json({
      items: products.map((p) => ({
        _id: p._id,
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        image: p.image,
        stock: p.stock,
        minStock: p.minStock,
        status: stockStatus(p),
      })),
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Inventory stock error:', error)
    return res.status(500).json({ error: 'No se pudo leer el stock' })
  }
})

/* ---------------- Movimientos ---------------- */

router.get('/movements', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    const filter = {}

    if (MOVEMENT_TYPES.has(req.query.type)) {
      filter.type = req.query.type
    }

    const term = String(req.query.q || '').trim()
    if (term) {
      filter.productName = new RegExp(escapeRegex(term), 'i')
    }

    const [total, movements] = await Promise.all([
      StockMovement.countDocuments(filter),
      StockMovement.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    return res.json({
      items: movements.map((m) => ({
        id: String(m._id),
        productId: m.productId,
        productName: m.productName,
        delta: m.delta,
        type: m.type,
        reason: m.reason,
        ref: m.ref,
        stockBefore: m.stockBefore,
        stockAfter: m.stockAfter,
        createdBy: m.createdBy,
        createdAt: m.createdAt,
      })),
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Inventory movements error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los movimientos' })
  }
})

/* ---------------- Ajustes de stock ---------------- */

router.post('/adjustments', requireRole('superadmin'), async (req, res) => {
  try {
    const { productId, delta, reason } = req.body || {}

    const id = Number(productId)
    const qty = Math.round(Number(delta))
    const cleanReason = String(reason || '').trim()

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Elegí un producto' })
    }
    if (!Number.isFinite(qty) || qty === 0) {
      return res.status(400).json({ error: 'La cantidad debe ser distinta de cero' })
    }
    if (cleanReason.length < 3) {
      return res.status(400).json({ error: 'Contá el motivo del ajuste' })
    }

    const movement = await changeStock({
      productId: id,
      delta: qty,
      type: 'ajuste',
      reason: cleanReason,
      createdBy: req.user?.email || null,
    })

    if (!movement) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    const product = await Product.findOne({ id }).lean()
    return res.json({
      ok: true,
      movement: {
        id: String(movement._id),
        productId: movement.productId,
        productName: movement.productName,
        delta: movement.delta,
        reason: movement.reason,
        type: movement.type,
        stockBefore: movement.stockBefore,
        stockAfter: movement.stockAfter,
        createdAt: movement.createdAt,
      },
      stock: product ? product.stock : null,
    })
  } catch (error) {
    console.error('Adjustment error:', error)
    return res.status(500).json({ error: 'No se pudo registrar el ajuste' })
  }
})

/* ---------------- Stock mínimo ---------------- */

router.put('/min-stock', requireRole('superadmin'), async (req, res) => {
  try {
    const { productId, minStock } = req.body || {}

    const id = Number(productId)
    const min = Math.max(0, Math.round(Number(minStock)))

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Elegí un producto' })
    }
    if (!Number.isFinite(Number(minStock))) {
      return res.status(400).json({ error: 'El mínimo debe ser un número' })
    }

    const product = await Product.findOneAndUpdate(
      { id },
      { $set: { minStock: min } },
      { returnDocument: 'after' },
    ).lean()

    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }

    return res.json({ id: product.id, minStock: product.minStock, status: stockStatus(product) })
  } catch (error) {
    console.error('Min stock error:', error)
    return res.status(500).json({ error: 'No se pudo guardar el stock mínimo' })
  }
})

/* ---------------- Inventario físico ---------------- */

router.post('/physical', requireRole('superadmin'), async (req, res) => {
  try {
    const counts = (req.body?.counts || [])
      .map((row) => ({
        productId: Number(row?.productId),
        units: Math.max(0, Math.round(Number(row?.units))),
      }))
      .filter((row) => Number.isFinite(row.productId))
    const note = String(req.body?.note || '').trim()

    if (counts.length === 0) {
      return res.status(400).json({ error: 'Conté al menos un producto' })
    }

    const results = []
    let updated = 0

    for (const row of counts) {
      const product = await Product.findOne({ id: row.productId })
      const units = Number.isFinite(Number(row.units)) ? row.units : -1
      if (!product || units < 0) continue

      const delta = units - product.stock
      if (delta === 0) {
        results.push({
          productId: product.id,
          name: product.name,
          stockBefore: product.stock,
          units,
          delta: 0,
          status: 'igual',
        })
        continue
      }

      const movement = await changeStock({
        productId: product.id,
        delta,
        type: 'inventario',
        reason: note || 'Conteo físico',
        createdBy: req.user?.email || null,
      })

      updated += movement ? 1 : 0
      results.push({
        productId: product.id,
        name: product.name,
        stockBefore: movement ? movement.stockBefore : product.stock,
        units,
        delta: movement ? movement.delta : 0,
        status: movement ? (delta > 0 ? 'sobra' : 'falta') : 'sin-cambio',
      })
    }

    return res.json({ ok: true, updated, results })
  } catch (error) {
    console.error('Physical inventory error:', error)
    return res.status(500).json({ error: 'No se pudo guardar el inventario físico' })
  }
})

/* ---------------- Compras a proveedores ---------------- */

router.get('/purchases', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    const filter = {}
    const term = String(req.query.q || '').trim()
    if (term) {
      filter.supplier = new RegExp(escapeRegex(term), 'i')
    }

    const [total, purchases] = await Promise.all([
      Purchase.countDocuments(filter),
      Purchase.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    return res.json({
      items: purchases.map((p) => ({
        id: String(p._id),
        number: p.number,
        supplier: p.supplier,
        invoice: p.invoice,
        items: p.items.map((i) => ({
          productId: i.productId,
          name: i.name,
          quantity: i.quantity,
          cost: i.cost,
          total: i.total,
        })),
        total: p.total,
        createdBy: p.createdBy,
        createdAt: p.createdAt,
      })),
      page,
      pageSize: limit,
      total,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error) {
    console.error('Purchases read error:', error)
    return res.status(500).json({ error: 'No se pudieron leer las compras' })
  }
})

router.post('/purchases', requireRole('superadmin'), async (req, res) => {
  try {
    const supplier = String(req.body?.supplier || '').trim()
    const invoice = String(req.body?.invoice || '').trim()
    const items = (req.body?.items || [])
      .map((row) => ({
        productId: Number(row?.productId),
        quantity: Math.floor(Number(row?.quantity)),
        cost: Number(row?.cost),
      }))
      .filter((row) => Number.isFinite(row.productId) && row.quantity > 0 && Number.isFinite(row.cost) && row.cost >= 0)

    if (supplier.length < 2) {
      return res.status(400).json({ error: 'Nombrá el proveedor' })
    }
    if (items.length === 0) {
      return res.status(400).json({ error: 'Agregá al menos un producto a la compra' })
    }

    const ids = [...new Set(items.map((row) => row.productId))]
    const dbProducts = await Product.find({ id: { $in: ids } }).lean()
    const byId = new Map(dbProducts.map((p) => [p.id, p]))
    if (byId.size !== ids.length) {
      return res.status(400).json({ error: 'Algún producto ya no existe' })
    }

    const reference = `${supplier}${invoice ? ` · Fact. ${invoice}` : ''}`
    const last = await Purchase.findOne().sort({ number: -1 }).lean()
    const number = (last?.number || 0) + 1

    const lines = []
    let total = 0
    for (const row of items) {
      const product = byId.get(row.productId)
      const lineTotal = row.quantity * row.cost
      total += lineTotal
      lines.push({
        productId: product.id,
        name: product.name,
        quantity: row.quantity,
        cost: row.cost,
        total: lineTotal,
      })
    }

    const purchase = await Purchase.create({
      number,
      supplier,
      invoice,
      items: lines,
      total,
      createdBy: req.user?.email || null,
    })

    const logged = []
    for (const row of items) {
      const product = byId.get(row.productId)
      if (Number.isFinite(row.cost) && product.costPrice !== row.cost) {
        await Product.updateOne({ id: product.id }, { $set: { costPrice: row.cost } })
      }
      const movement = await changeStock({
        productId: product.id,
        delta: row.quantity,
        type: 'compra',
        reason: reference,
        ref: String(number),
        createdBy: req.user?.email || null,
      })
      logged.push({
        productId: product.id,
        delta: movement ? movement.delta : 0,
        stockAfter: movement ? movement.stockAfter : product.stock,
      })
    }

    return res.status(201).json({
      ok: true,
      purchase: {
        id: String(purchase._id),
        number: purchase.number,
        supplier: purchase.supplier,
        invoice: purchase.invoice,
        items: lines,
        total: purchase.total,
        createdAt: purchase.createdAt,
      },
      logged,
    })
  } catch (error) {
    console.error('Purchase create error:', error)
    return res.status(500).json({ error: 'No se pudo registrar la compra' })
  }
})

export default router