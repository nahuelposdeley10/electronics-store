import express from 'express'
import multer from 'multer'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Quote } from '../models/Quote.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { uploadToCloudinary } from '../services/cloudinary.js'
import { parsePagination, buildProductSearchFilter, escapeRegex, parseMulti } from '../lib/catalog-query.js'
import { getValidCategoryKeys } from '../lib/catalog-meta.js'
import { changeStock } from '../lib/stock.js'
import { currentShift } from '../lib/cash.js'
import { roundMoney, roundLine } from '../lib/money.js'
import { CashMovement } from '../models/CashMovement.js'
import { requireTenantIdOf } from '../lib/tenant.js'
import { allowedImageFilter } from '../lib/image-guard.js'
import { nextSequence, sequenceKey } from '../lib/counter.js'

const router = express.Router()

router.use(requireAuth)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: allowedImageFilter,
})

const PENDING_STATUSES = new Set(['pending', 'in_process'])
const REJECTED_STATUSES = new Set(['rejected', 'cancelled', 'charged_back'])

function requireTenantScope(req, res) {
  try {
    return { adminId: requireTenantIdOf(req) }
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message })
    return null
  }
}

router.get('/overview', async (req, res) => {
  try {
    const scope = requireTenantScope(req, res)
    if (!scope) return
    const [orders, dbProducts] = await Promise.all([
      Order.find(scope).sort({ createdAt: -1 }).lean(),
      Product.find(scope).lean(),
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

const VALID_ORDER_STATUSES = new Set([
  'approved',
  'pending',
  'in_process',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
])

router.get('/orders', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    const scope = requireTenantScope(req, res)
    if (!scope) return

    const statusFilter = {}
    if (req.query.status && VALID_ORDER_STATUSES.has(req.query.status)) {
      statusFilter.status = req.query.status
    } else if (req.query.group === 'approved') {
      statusFilter.status = 'approved'
    } else if (req.query.group === 'pending') {
      statusFilter.status = { $in: [...PENDING_STATUSES] }
    } else if (req.query.group === 'rejected') {
      statusFilter.status = { $in: [...REJECTED_STATUSES] }
    }

    const contextFilter = {}
    if (req.query.payment && req.query.payment !== 'all') {
      if (req.query.payment === 'web') contextFilter.source = 'web'
      else contextFilter.payment = req.query.payment
    }
    const fromDate = req.query.from ? new Date(`${req.query.from}T00:00:00`) : null
    const toDate = req.query.to ? new Date(`${req.query.to}T23:59:59.999`) : null
    const hasFrom = fromDate && !Number.isNaN(fromDate.getTime())
    const hasTo = toDate && !Number.isNaN(toDate.getTime())
    if (hasFrom || hasTo) {
      contextFilter.createdAt = {}
      if (hasFrom) contextFilter.createdAt.$gte = fromDate
      if (hasTo) contextFilter.createdAt.$lte = toDate
    }
    const q = String(req.query.q || '').trim()
    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i')
      const or = [
        { payerName: regex },
        { payerSurname: regex },
        { payerEmail: regex },
        { 'items.name': regex },
      ]
      if (/^[0-9a-f]{1,12}$/i.test(q)) {
        or.push({ $expr: { $regexMatch: { input: { $toString: '$_id' }, regex: `${q.toLowerCase()}$` } } })
      }
      contextFilter.$or = or
    }
    const base = { ...scope, ...contextFilter }

    const [total, approved, pending, rejected, refunded, orders] = await Promise.all([
      Order.countDocuments(base),
      Order.countDocuments({ ...base, status: 'approved' }),
      Order.countDocuments({ ...base, status: { $in: [...PENDING_STATUSES] } }),
      Order.countDocuments({ ...base, status: { $in: [...REJECTED_STATUSES] } }),
      Order.countDocuments({ ...base, status: 'refunded' }),
      Order.find({ ...base, ...statusFilter })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    return res.json({
      items: orders.map((o) => ({
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
        source: o.source,
        payment: o.payment,
        returnedAt: o.returnedAt,
        payer: {
          email: o.payerEmail,
          name: o.payerName,
          surname: o.payerSurname,
          fullName: [o.payerName, o.payerSurname].filter(Boolean).join(' ') || null,
          idType: o.payerIdType,
          idNumber: o.payerIdNumber,
        },
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      counts: { all: total, approved, pending, rejected, refunded },
    })
  } catch (error) {
    console.error('Orders error:', error)
    return res.status(500).json({ error: 'No se pudo leer las ventas' })
  }
})

router.get('/products', async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    const scope = requireTenantScope(req, res)
    if (!scope) return
    const filter = { ...buildProductSearchFilter(req.query.q), ...scope }

    const categories = parseMulti(req.query.category)
    if (categories) filter.category = { $in: categories }

    const brands = parseMulti(req.query.brand)
    if (brands) filter.brand = { $in: brands }

    const [approved, total, dbProducts] = await Promise.all([
      Order.find({ status: 'approved', ...scope }).lean(),
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
        costPrice: p.costPrice || 0,
        stock: p.stock,
        minStock: p.minStock || 0,
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

router.post('/products', requirePermission('catalog.manage'), upload.single('image'), async (req, res) => {
  const { name, brand, category, price, oldPrice, costPrice, stock, minStock, rating, freeShipping, badge, description, specs } = req.body || {}

  if (!name || !brand || !category || price === undefined || price === '') {
    return res.status(400).json({ error: 'Nombre, marca, categoría y precio son requeridos' })
  }
  if (!req.file) {
    return res.status(400).json({ error: 'La imagen es requerida (PNG, JPG o WEBP)' })
  }

  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }

  if (!(await getValidCategoryKeys({ tenant })).has(category)) {
    return res.status(400).json({ error: 'Categoría inválida' })
  }

  try {
    const image = await uploadToCloudinary(req.file)
    const lastId = (await Product.findOne({ adminId: tenant }).sort({ id: -1 }).lean())?.id || 0
    const product = await Product.create({
      adminId: tenant,
      id: await nextSequence(sequenceKey(tenant, 'product'), lastId),
      name: String(name).trim(),
      brand: String(brand).trim(),
      category,
      price: roundMoney(price),
      oldPrice: oldPrice ? roundMoney(oldPrice) : null,
      costPrice: costPrice !== '' ? roundMoney(costPrice) : 0,
      stock: stock !== '' ? Number(stock) : 0,
      minStock: minStock !== '' ? Number(minStock) : 0,
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
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo crear el producto' })
  }
})

router.put('/products/:id', requirePermission('catalog.manage'), upload.single('image'), async (req, res) => {
  const {
    name,
    brand,
    category,
    price,
    oldPrice,
    costPrice,
    stock,
    minStock,
    rating,
    freeShipping,
    badge,
    description,
    specs,
  } = req.body || {}

  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }

  const product = await Product.findOne({ id: Number(req.params.id), adminId: tenant })
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' })
  }

  const patch = {
    name: name !== undefined ? String(name).trim() : product.name,
    brand: brand !== undefined ? String(brand).trim() : product.brand,
    category: category !== undefined ? category : product.category,
    price: price !== undefined && price !== '' ? roundMoney(price) : product.price,
    oldPrice: oldPrice !== undefined && oldPrice !== '' ? roundMoney(oldPrice) : product.oldPrice,
    costPrice: costPrice !== undefined && costPrice !== '' ? Math.max(0, roundMoney(costPrice)) : product.costPrice,
    stock: stock !== undefined && stock !== '' ? Number(stock) : product.stock,
    minStock: minStock !== undefined && minStock !== '' ? Math.max(0, Number(minStock)) : product.minStock,
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
  if (!(await getValidCategoryKeys({ tenant })).has(patch.category)) {
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
      costPrice: product.costPrice || 0,
      stock: product.stock,
      minStock: product.minStock || 0,
      rating: product.rating,
      freeShipping: product.freeShipping,
      badge: product.badge,
      image: product.image,
      description: product.description,
      specs: product.specs,
    })
  } catch (error) {
    console.error('Products update error:', error)
    return res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo actualizar el producto' })
  }
})

router.delete('/products/:id', requirePermission('catalog.manage'), async (req, res) => {
  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }

  const product = await Product.findOne({ id: Number(req.params.id), adminId: tenant })
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

const POS_PAYMENTS = new Set(['efectivo', 'tarjeta', 'transferencia'])

router.post('/pos', requirePermission('pos.manage'), async (req, res) => {
  const { items, discount = 0, customer, payment } = req.body || {}

  const rows = (items || [])
    .map((row) => ({
      id: Number(row?.id),
      quantity: Math.floor(Number(row?.quantity)),
    }))
    .filter((row) => Number.isFinite(row.id) && row.quantity > 0)

  if (rows.length === 0) {
    return res.status(400).json({ error: 'Agregá al menos un producto a la venta' })
  }

  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }

  try {
    const ids = [...new Set(rows.map((row) => row.id))]
    const dbProducts = await Product.find({ id: { $in: ids }, adminId: tenant }).lean()
    const byId = new Map(dbProducts.map((p) => [p.id, p]))

    const lines = []
    for (const row of rows) {
      const product = byId.get(row.id)
      if (!product) {
        return res.status(400).json({ error: 'Algún producto ya no existe' })
      }
      if (product.stock < row.quantity) {
        return res.status(400).json({ error: `Stock insuficiente de "${product.name}" (queda ${product.stock})` })
      }
      lines.push({ product, quantity: row.quantity })
    }

    const subtotal = lines.reduce((sum, line) => sum + roundLine(line.product.price, line.quantity), 0)
    const parsedDiscount = Math.max(0, Math.min(Number(discount) || 0, subtotal))
    const total = roundMoney(subtotal - roundMoney(parsedDiscount))

    const order = await Order.create({
      adminId: tenant,
      items: lines.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        unitPrice: roundMoney(line.product.price),
        quantity: line.quantity,
      })),
      status: 'approved',
      source: 'pos',
      payment: POS_PAYMENTS.has(payment) ? payment : 'efectivo',
      subtotal,
      discount: parsedDiscount,
      shippingCost: 0,
      total,
      payerName: customer?.name || null,
    })

    for (const line of lines) {
      await changeStock({
        productId: line.product.id,
        delta: -line.quantity,
        type: 'venta',
        reason: 'Venta en mostrador (POS)',
        ref: String(order._id),
        createdBy: req.user?.email || null,
        adminId: tenant,
      })
    }

    if (order.payment === 'efectivo') {
      try {
        const open = await currentShift(tenant)
        if (open) {
          await CashMovement.create({
            adminId: tenant,
            shiftId: open._id,
            kind: 'venta',
            flow: 'in',
            amount: order.total,
            description: `Venta #${String(order._id).slice(-6).toUpperCase()}`,
            ref: String(order._id),
            by: req.user?.email || null,
          })
        }
      } catch (cashError) {
        console.error('Cash movement (venta) error:', cashError)
      }
    }

    return res.json({
      id: order._id,
      status: order.status,
      source: order.source,
      payment: order.payment,
      total: order.total,
      createdAt: order.createdAt,
    })
  } catch (error) {
    console.error('POS error:', error)
    return res.status(500).json({ error: 'No se pudo registrar la venta' })
  }
})

router.post('/orders/:id/return', requirePermission('sales.return'), async (req, res) => {
  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }

  try {
    const order = await Order.findById(req.params.id)
    if (!order || String(order.adminId || '') !== String(tenant)) {
      return res.status(404).json({ error: 'Venta no encontrada' })
    }
    if (order.status !== 'approved') {
      return res.status(400).json({ error: 'Solo se pueden devolver ventas aprobadas' })
    }

    order.status = 'refunded'
    order.returnedAt = new Date()
    await order.save()

    if (order.source === 'pos' || order.stockDeducted) {
      for (const item of order.items) {
        await changeStock({
          productId: item.productId,
          delta: item.quantity,
          type: 'devolucion',
          reason: 'Devolución de venta',
          ref: String(order._id),
          createdBy: req.user?.email || null,
          adminId: tenant,
        })
      }
    }

    if (order.payment === 'efectivo') {
      try {
        const open = await currentShift(tenant)
        if (open) {
          await CashMovement.create({
            adminId: tenant,
            shiftId: open._id,
            kind: 'devolucion',
            flow: 'out',
            amount: order.total,
            description: `Devolución #${String(order._id).slice(-6).toUpperCase()}`,
            ref: String(order._id),
            by: req.user?.email || null,
          })
        }
      } catch (cashError) {
        console.error('Cash movement (devolución) error:', cashError)
      }
    }

    return res.json({ id: order._id, status: order.status, returnedAt: order.returnedAt })
  } catch (error) {
    console.error('Return error:', error)
    return res.status(500).json({ error: 'No se pudo registrar la devolución' })
  }
})

const QUOTE_STATUSES = new Set(['draft', 'confirmed', 'cancelled'])

router.get('/quotes', async (req, res) => {
  try {
    const scope = requireTenantScope(req, res)
    if (!scope) return
    const { page, limit } = parsePagination(req.query)
    const filter = { ...scope }
    if (req.query.status && QUOTE_STATUSES.has(req.query.status)) {
      filter.status = req.query.status
    }
    if (req.query.q) {
      const safe = String(req.query.q).trim()
      if (safe) {
        const regex = new RegExp(safe.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
        filter.$or = [{ 'customer.name': regex }, { 'items.name': regex }, { note: regex }]
      }
    }

    const [total, quotes] = await Promise.all([
      Quote.countDocuments(filter),
      Quote.find(filter).sort({ number: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    ])

    return res.json({
      items: quotes,
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('Quotes error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los presupuestos' })
  }
})

router.post('/quotes', async (req, res) => {
  const { items, customer, discount = 0, note } = req.body || {}

  const rows = (items || [])
    .map((row) => ({
      id: Number(row?.id),
      quantity: Math.floor(Number(row?.quantity)),
    }))
    .filter((row) => Number.isFinite(row.id) && row.quantity > 0)

  if (rows.length === 0) {
    return res.status(400).json({ error: 'Agregá al menos un producto al presupuesto' })
  }

  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }

  try {
    const ids = [...new Set(rows.map((row) => row.id))]
    const dbProducts = await Product.find({ id: { $in: ids }, adminId: tenant }).lean()
    const byId = new Map(dbProducts.map((p) => [p.id, p]))

    const lineItems = rows
      .map((row) => ({ product: byId.get(row.id), quantity: row.quantity }))
      .filter((line) => line.product)

    if (lineItems.length === 0) {
      return res.status(400).json({ error: 'Algún producto ya no existe' })
    }

    const subtotal = lineItems.reduce((sum, line) => sum + roundLine(line.product.price, line.quantity), 0)
    const parsedDiscount = Math.max(0, Math.min(Number(discount) || 0, subtotal))
    const total = roundMoney(subtotal - roundMoney(parsedDiscount))

    const lastNumber = (await Quote.findOne({ adminId: tenant }).sort({ number: -1 }).select('number').lean())?.number || 1000
    const number = await nextSequence(sequenceKey(tenant, 'quote'), lastNumber)

    const quote = await Quote.create({
      adminId: tenant,
      number,
      status: 'draft',
      customer: {
        name: String(customer?.name || '').trim(),
        phone: String(customer?.phone || '').trim(),
        email: String(customer?.email || '').trim(),
      },
      items: lineItems.map((line) => ({
        productId: line.product.id,
        name: line.product.name,
        unitPrice: roundMoney(line.product.price),
        quantity: line.quantity,
      })),
      subtotal,
      discount: parsedDiscount,
      total,
      note: String(note || '').trim(),
    })

    return res.json(quote)
  } catch (error) {
    console.error('Quotes create error:', error)
    return res.status(500).json({ error: 'No se pudo crear el presupuesto' })
  }
})

router.put('/quotes/:id', async (req, res) => {
  const { status, customer, discount, note } = req.body || {}
  let tenant
  try {
    tenant = requireTenantIdOf(req)
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }

  try {
    const quote = await Quote.findOne({ _id: req.params.id, adminId: tenant })
    if (!quote) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' })
    }

    if (status !== undefined) {
      if (!QUOTE_STATUSES.has(status)) {
        return res.status(400).json({ error: 'Estado inválido' })
      }
      quote.status = status
    }
    if (customer !== undefined) {
      quote.customer.name = String(customer.name ?? quote.customer.name ?? '')
      quote.customer.phone = String(customer.phone ?? quote.customer.phone ?? '')
      quote.customer.email = String(customer.email ?? quote.customer.email ?? '')
    }
    if (note !== undefined) quote.note = String(note).trim()
    if (discount !== undefined) {
      const parsed = roundMoney(Math.max(0, Math.min(Number(discount) || 0, quote.subtotal)))
      quote.discount = parsed
      quote.total = roundMoney(quote.subtotal - parsed)
    }

    await quote.save()
    return res.json(quote)
  } catch (error) {
    console.error('Quotes update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar el presupuesto' })
  }
})

router.delete('/quotes/:id', requirePermission('quotes.delete'), async (req, res) => {
  try {
    const scope = requireTenantScope(req, res)
    if (!scope) return
    const quote = await Quote.findOneAndDelete({ _id: req.params.id, ...scope })
    if (!quote) {
      return res.status(404).json({ error: 'Presupuesto no encontrado' })
    }
    return res.json({ ok: true, id: quote._id })
  } catch (error) {
    console.error('Quotes delete error:', error)
    return res.status(500).json({ error: 'No se pudo eliminar el presupuesto' })
  }
})

export default router