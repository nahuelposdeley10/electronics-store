import express from 'express'
import { Product } from '../models/Product.js'
import { StockMovement } from '../models/StockMovement.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  parsePagination,
  buildProductSearchFilter,
  escapeRegex,
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

export default router