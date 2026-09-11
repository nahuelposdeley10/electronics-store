import express from 'express'
import multer from 'multer'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { uploadToCloudinary } from '../services/cloudinary.js'
import { parsePagination, buildProductSearchFilter } from '../lib/catalog-query.js'
import { getValidCategoryKeys } from '../lib/catalog-meta.js'

const router = express.Router()

router.use(requireAuth)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'))
  },
})

const PENDING_STATUSES = new Set(['pending', 'in_process'])
const REJECTED_STATUSES = new Set(['rejected', 'cancelled', 'charged_back'])

router.get('/overview', async (req, res) => {
  try {
    const [orders, dbProducts] = await Promise.all([
      Order.find().sort({ createdAt: -1 }).lean(),
      Product.find().lean(),
    ])

    const approved = orders.filter((o) => o.status === 'approved')
    const revenue = approved.reduce((sum, o) => sum + (o.total || 0), 0)
    const salesCount = approved.length
    const avgTicket = salesCount ? Math.round(revenue / salesCount) : 0

    const startToday = new Date()
    startToday.setHours(0, 0, 0, 0)
    const todays = orders.filter((o) => new Date(o.createdAt) >= startToday)
    const todaysApproved = todays.filter((o) => o.status === 'approved')

    const statusCounts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1
      return acc
    }, {})

    const byProduct = new Map()
    for (const order of approved) {
      for (const item of order.items) {
        const current = byProduct.get(item.productId) || { units: 0, revenue: 0 }
        current.units += item.quantity
        current.revenue += item.quantity * item.unitPrice
        byProduct.set(item.productId, current)
      }
    }

    const bestSellers = [...byProduct.entries()]
      .map(([productId, agg]) => {
        const product = dbProducts.find((p) => p.id === Number(productId))
        if (!product) return null
        return {
          ...agg,
          productId,
          name: product.name,
          brand: product.brand,
        }
      })
      .filter(Boolean)
      .sort((a, b) => b.units - a.units)
      .slice(0, 4)

    return res.json({
      counts: {
        all: orders.length,
        salesCount,
        pendingCount: orders.filter((o) => PENDING_STATUSES.has(o.status)).length,
        rejectedCount: orders.filter((o) => REJECTED_STATUSES.has(o.status)).length,
      },
      revenue,
      avgTicket,
      today: {
        revenue: todaysApproved.reduce((sum, o) => sum + o.total, 0),
        orders: todaysApproved.length,
      },
      statusCounts,
      recentOrders: orders.slice(0, 6).map((o) => ({
        id: o._id,
        status: o.status,
        total: o.total,
        itemsCount: o.items.reduce((sum, i) => sum + i.quantity, 0),
        createdAt: o.createdAt,
      })),
      bestSellers,
    })
  } catch (error) {
    console.error('Overview error:', error)
    return res.status(500).json({ error: 'No se pudo leer el panel' })
  }
})

router.get('/orders', async (req, res) => {
  try {
    const filter = req.query.status ? { status: req.query.status } : {}
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()

    return res.json(
      orders.map((o) => ({
        id: o._id,
        status: o.status,
        coupon: o.coupon,
        subtotal: o.subtotal,
        discount: o.discount,
        shippingCost: o.shippingCost,
        total: o.total,
        paymentId: o.paymentId,
        items: o.items,
        createdAt: o.createdAt,
        payer: {
          email: o.payerEmail,
          name: o.payerName,
          surname: o.payerSurname,
          fullName: [o.payerName, o.payerSurname].filter(Boolean).join(' ') || null,
          idType: o.payerIdType,
          idNumber: o.payerIdNumber,
        },
      })),
    )
  } catch (error) {
    console.error('Orders error:', error)
    return res.status(500).json({ error: 'No se pudo leer las ventas' })
  }
})

router.get('/products', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    const filter = buildProductSearchFilter(req.query.q)
    const [approved, total, dbProducts] = await Promise.all([
      Order.find({ status: 'approved' }).lean(),
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])
    const sold = new Map()
    for (const order of approved) {
      for (const item of order.items) {
        sold.set(item.productId, (sold.get(item.productId) || 0) + item.quantity)
      }
    }

    return res.json({
      items: dbProducts.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        oldPrice: p.oldPrice,
        stock: p.stock,
        rating: p.rating,
        freeShipping: p.freeShipping,
        badge: p.badge,
        image: p.image,
        description: p.description,
        specs: p.specs,
        soldUnits: sold.get(p.id) || 0,
        revenue: (sold.get(p.id) || 0) * p.price,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('Products error:', error)
    return res.status(500).json({ error: 'No se pudo leer los productos' })
  }
})

router.post('/products', requireRole('superadmin'), upload.single('image'), async (req, res) => {
  const { name, brand, category, price, oldPrice, stock, rating, freeShipping, badge, description, specs } = req.body || {}

  if (!name || !brand || !category || price === undefined || price === '') {
    return res.status(400).json({ error: 'Nombre, marca, categoría y precio son requeridos' })
  }
  if (!(await getValidCategoryKeys()).has(category)) {
    return res.status(400).json({ error: 'Categoría inválida' })
  }
  if (!req.file) {
    return res.status(400).json({ error: 'La imagen es requerida (PNG, JPG o WEBP)' })
  }

  try {
    const image = await uploadToCloudinary(req.file)
    const last = await Product.findOne().sort({ id: -1 }).lean()
    const product = await Product.create({
      id: (last?.id || 0) + 1,
      name: String(name).trim(),
      brand: String(brand).trim(),
      category,
      price: Number(price),
      oldPrice: oldPrice ? Number(oldPrice) : null,
      stock: stock !== '' ? Number(stock) : 0,
      rating: rating !== '' ? Number(rating) : 0,
      freeShipping: freeShipping === 'true' || freeShipping === true,
      badge: badge ? String(badge).trim() : null,
      image,
      description: description ? String(description).trim() : '',
      specs: specs
        ? String(specs)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [],
    })

    return res.status(201).json({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      stock: product.stock,
      image: product.image,
    })
  } catch (error) {
    console.error('Products create error:', error)
    return res.status(500).json({ error: 'No se pudo crear el producto' })
  }
})

router.put('/products/:id', requireRole('superadmin'), upload.single('image'), async (req, res) => {
  const {
    name,
    brand,
    category,
    price,
    oldPrice,
    stock,
    rating,
    freeShipping,
    badge,
    description,
    specs,
  } = req.body || {}

  const product = await Product.findOne({ id: Number(req.params.id) })
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' })
  }

  const patch = {
    name: name !== undefined ? String(name).trim() : product.name,
    brand: brand !== undefined ? String(brand).trim() : product.brand,
    category: category !== undefined ? category : product.category,
    price: price !== undefined && price !== '' ? Number(price) : product.price,
    oldPrice: oldPrice !== undefined && oldPrice !== '' ? Number(oldPrice) : null,
    stock: stock !== undefined && stock !== '' ? Number(stock) : product.stock,
    rating: rating !== undefined && rating !== '' ? Number(rating) : product.rating,
    freeShipping:
      freeShipping === 'true' || freeShipping === true || (freeShipping === undefined && product.freeShipping),
    badge: badge !== undefined ? String(badge).trim() || null : product.badge,
    description: description !== undefined ? String(description).trim() : product.description,
    specs:
      specs !== undefined
        ? String(specs)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : product.specs,
  }

  if (!patch.name || !patch.brand || !patch.price) {
    return res.status(400).json({ error: 'Nombre, marca, categoría y precio son requeridos' })
  }
  if (!(await getValidCategoryKeys()).has(patch.category)) {
    return res.status(400).json({ error: 'Categoría inválida' })
  }

  try {
    if (req.file) patch.image = await uploadToCloudinary(req.file)
    Object.assign(product, patch)
    await product.save()

    return res.json({
      id: product.id,
      name: product.name,
      brand: product.brand,
      category: product.category,
      price: product.price,
      oldPrice: product.oldPrice,
      stock: product.stock,
      rating: product.rating,
      freeShipping: product.freeShipping,
      badge: product.badge,
      image: product.image,
      description: product.description,
      specs: product.specs,
    })
  } catch (error) {
    console.error('Products update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar el producto' })
  }
})

router.delete('/products/:id', requireRole('superadmin'), async (req, res) => {
  const product = await Product.findOne({ id: Number(req.params.id) })
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' })
  }

  try {
    await product.deleteOne()
    return res.json({ ok: true, id: product.id })
  } catch (error) {
    console.error('Products delete error:', error)
    return res.status(500).json({ error: 'No se pudo eliminar el producto' })
  }
})

export default router