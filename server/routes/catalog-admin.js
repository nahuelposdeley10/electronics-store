import express from 'express'
import { Category } from '../models/Category.js'
import { Brand } from '../models/Brand.js'
import { Variant } from '../models/Variant.js'
import { Product } from '../models/Product.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import {
  parsePagination,
  buildProductSearchFilter,
  escapeRegex,
} from '../lib/catalog-query.js'
import {
  ensureCatalogMeta,
  getValidCategoryKeys,
  slugify,
} from '../lib/catalog-meta.js'

const router = express.Router()

router.use(requireAuth)

const KEY_PATTERN = /^[a-z0-9_-]+$/

function publicCategory(c, used = 0) {
  return { key: c.key, name: c.name, active: c.active, productCount: used }
}

function publicBrand(b, used = 0) {
  return { name: b.name, active: b.active, productCount: used }
}

async function productCountBy(field) {
  const products = await Product.find().lean()
  const counts = new Map()
  for (const p of products) {
    const value = p[field]
    if (!value) continue
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return counts
}

/* ---------------- Categorías ---------------- */

router.get('/categories', requireRole('superadmin'), async (req, res) => {
  try {
    await ensureCatalogMeta()
    const [categories, used] = await Promise.all([
      Category.find().sort({ name: 1 }).lean(),
      productCountBy('category'),
    ])
    return res.json({
      items: categories.map((c) => publicCategory(c, used.get(c.key) || 0)),
    })
  } catch (error) {
    console.error('Categories error:', error)
    return res.status(500).json({ error: 'No se pudieron leer las categorías' })
  }
})

router.post('/categories', requireRole('superadmin'), async (req, res) => {
  const { name, key, active } = req.body || {}
  const cleanName = String(name || '').trim()
  if (!cleanName) {
    return res.status(400).json({ error: 'El nombre es requerido' })
  }
  const cleanKey = String(key || '').trim().toLowerCase().replace(/\s+/g, '-') || slugify(cleanName)
  if (!KEY_PATTERN.test(cleanKey)) {
    return res.status(400).json({ error: 'La clave usa minúsculas, números, guiones y guion bajo' })
  }

  try {
    await ensureCatalogMeta()
    const dup = await Category.findOne({
      $or: [{ key: cleanKey }, { name: { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' } }],
    })
    if (dup) {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre o clave' })
    }
    const category = await Category.create({
      key: cleanKey,
      name: cleanName,
      active: active === false ? false : true,
    })
    return res.status(201).json(publicCategory(category))
  } catch (error) {
    console.error('Categories create error:', error)
    return res.status(500).json({ error: 'No se pudo crear la categoría' })
  }
})

router.put('/categories/:key', requireRole('superadmin'), async (req, res) => {
  const { name, key, active } = req.body || {}
  const category = await Category.findOne({ key: req.params.key })
  if (!category) {
    return res.status(404).json({ error: 'Categoría no encontrada' })
  }

  const cleanName = name !== undefined ? String(name).trim() : category.name
  const cleanKey = key !== undefined ? String(key).trim().toLowerCase().replace(/\s+/g, '-') : category.key
  if (!cleanName) {
    return res.status(400).json({ error: 'El nombre es requerido' })
  }
  if (!KEY_PATTERN.test(cleanKey)) {
    return res.status(400).json({ error: 'La clave usa minúsculas, números, guiones y guion bajo' })
  }

  try {
    const dup = await Category.findOne({
      $or: [{ key: cleanKey }, { name: { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' } }],
    })
    if (dup && dup.key !== category.key) {
      return res.status(409).json({ error: 'Ya existe una categoría con ese nombre o clave' })
    }

    if (cleanKey !== category.key) {
      await Product.updateMany({ category: category.key }, { $set: { category: cleanKey } })
    }
    category.key = cleanKey
    category.name = cleanName
    if (active !== undefined) category.active = active === true
    await category.save()
    return res.json(publicCategory(category))
  } catch (error) {
    console.error('Categories update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar la categoría' })
  }
})

router.delete('/categories/:key', requireRole('superadmin'), async (req, res) => {
  const category = await Category.findOne({ key: req.params.key })
  if (!category) {
    return res.status(404).json({ error: 'Categoría no encontrada' })
  }
  try {
    const used = await Product.countDocuments({ category: category.key })
    if (used > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: ${used} producto(s) la usan`,
      })
    }
    await category.deleteOne()
    return res.json({ ok: true, key: category.key })
  } catch (error) {
    console.error('Categories delete error:', error)
    return res.status(500).json({ error: 'No se pudo eliminar la categoría' })
  }
})

/* ---------------- Marcas ---------------- */

router.get('/brands', requireRole('superadmin'), async (req, res) => {
  try {
    await ensureCatalogMeta()
    const [brands, used] = await Promise.all([
      Brand.find().sort({ name: 1 }).lean(),
      productCountBy('brand'),
    ])
    return res.json({
      items: brands.map((b) => publicBrand(b, used.get(b.name) || 0)),
    })
  } catch (error) {
    console.error('Brands error:', error)
    return res.status(500).json({ error: 'No se pudieron leer las marcas' })
  }
})

router.post('/brands', requireRole('superadmin'), async (req, res) => {
  const { name, active } = req.body || {}
  const cleanName = String(name || '').trim()
  if (!cleanName) {
    return res.status(400).json({ error: 'El nombre es requerido' })
  }

  try {
    await ensureCatalogMeta()
    const dup = await Brand.findOne({
      name: { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' },
    })
    if (dup) {
      return res.status(409).json({ error: 'Ya existe una marca con ese nombre' })
    }
    const brand = await Brand.create({ name: cleanName, active: active === false ? false : true })
    return res.status(201).json(publicBrand(brand))
  } catch (error) {
    console.error('Brands create error:', error)
    return res.status(500).json({ error: 'No se pudo crear la marca' })
  }
})

router.put('/brands/:name', requireRole('superadmin'), async (req, res) => {
  const { name, active } = req.body || {}
  const brand = await Brand.findOne({ name: req.params.name })
  if (!brand) {
    return res.status(404).json({ error: 'Marca no encontrada' })
  }

  const cleanName = name !== undefined ? String(name).trim() : brand.name
  if (!cleanName) {
    return res.status(400).json({ error: 'El nombre es requerido' })
  }

  try {
    const dup = await Brand.findOne({
      name: { $regex: `^${escapeRegex(cleanName)}$`, $options: 'i' },
    })
    if (dup && dup.name !== brand.name) {
      return res.status(409).json({ error: 'Ya existe una marca con ese nombre' })
    }

    if (cleanName !== brand.name) {
      await Product.updateMany({ brand: brand.name }, { $set: { brand: cleanName } })
    }
    brand.name = cleanName
    if (active !== undefined) brand.active = active === true
    await brand.save()
    return res.json(publicBrand(brand))
  } catch (error) {
    console.error('Brands update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar la marca' })
  }
})

router.delete('/brands/:name', requireRole('superadmin'), async (req, res) => {
  const brand = await Brand.findOne({ name: req.params.name })
  if (!brand) {
    return res.status(404).json({ error: 'Marca no encontrada' })
  }
  try {
    const used = await Product.countDocuments({ brand: brand.name })
    if (used > 0) {
      return res.status(409).json({
        error: `No se puede eliminar: ${used} producto(s) la usan`,
      })
    }
    await brand.deleteOne()
    return res.json({ ok: true, name: brand.name })
  } catch (error) {
    console.error('Brands delete error:', error)
    return res.status(500).json({ error: 'No se pudo eliminar la marca' })
  }
})

/* ---------------- Variantes ---------------- */

router.get('/variants', requireRole('superadmin'), async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    const q = String(req.query.q || '').trim()

    let filter = {}
    if (q) {
      const regex = new RegExp(escapeRegex(q), 'i')
      const ids = await Product.find({
        $or: [{ name: regex }, { brand: regex }],
      })
        .select('id')
        .lean()
      filter.$or = [{ name: regex }, { sku: regex }]
      if (ids.length) {
        filter.$or.push({ product: { $in: ids.map((p) => p.id) } })
      }
    }

    const [total, variants] = await Promise.all([
      Variant.countDocuments(filter),
      Variant.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    const products = await Product.find().lean()
    const productMap = new Map(products.map((p) => [p.id, p]))

    return res.json({
      items: variants.map((v) => {
        const product = productMap.get(v.product)
        return {
          id: v._id,
          product: v.product,
          productName: product?.name || '—',
          productBrand: product?.brand || '',
          name: v.name,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
        }
      }),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('Variants error:', error)
    return res.status(500).json({ error: 'No se pudieron leer las variantes' })
  }
})

router.post('/variants', requireRole('superadmin'), async (req, res) => {
  const { product, name, sku, price, stock } = req.body || {}
  const productId = Number(product)
  const variantName = String(name || '').trim()
  if (!productId || !variantName) {
    return res.status(400).json({ error: 'Producto y nombre de la variante son requeridos' })
  }

  try {
    const exists = await Product.findOne({ id: productId }).lean()
    if (!exists) {
      return res.status(400).json({ error: 'Producto no encontrado' })
    }
    const variant = await Variant.create({
      product: productId,
      name: variantName,
      sku: sku !== undefined && sku !== '' ? String(sku).trim() : '',
      price: price !== undefined && price !== '' ? Number(price) : 0,
      stock: stock !== undefined && stock !== '' ? Number(stock) : 0,
    })
    return res.status(201).json({
      id: variant._id,
      product: variant.product,
      productName: exists.name,
      productBrand: exists.brand,
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
    })
  } catch (error) {
    console.error('Variants create error:', error)
    return res.status(500).json({ error: 'No se pudo crear la variante' })
  }
})

router.put('/variants/:id', requireRole('superadmin'), async (req, res) => {
  const { product, name, sku, price, stock } = req.body || {}
  const variant = await Variant.findById(req.params.id)
  if (!variant) {
    return res.status(404).json({ error: 'Variante no encontrada' })
  }

  const productId = product !== undefined && product !== '' ? Number(product) : variant.product
  const variantName = name !== undefined ? String(name).trim() : variant.name
  if (!productId || !variantName) {
    return res.status(400).json({ error: 'Producto y nombre de la variante son requeridos' })
  }

  try {
    if (productId !== variant.product) {
      const exists = await Product.findOne({ id: productId }).lean()
      if (!exists) {
        return res.status(400).json({ error: 'Producto no encontrado' })
      }
      variant.product = productId
    }
    variant.name = variantName
    if (sku !== undefined) variant.sku = String(sku).trim()
    if (price !== undefined && price !== '') variant.price = Number(price)
    if (stock !== undefined && stock !== '') variant.stock = Number(stock)
    await variant.save()

    const products = await Product.find().lean()
    const productMap = new Map(products.map((p) => [p.id, p]))
    const productData = productMap.get(variant.product)
    return res.json({
      id: variant._id,
      product: variant.product,
      productName: productData?.name || '—',
      productBrand: productData?.brand || '',
      name: variant.name,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
    })
  } catch (error) {
    console.error('Variants update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar la variante' })
  }
})

router.delete('/variants/:id', requireRole('superadmin'), async (req, res) => {
  const variant = await Variant.findById(req.params.id)
  if (!variant) {
    return res.status(404).json({ error: 'Variante no encontrada' })
  }
  try {
    await variant.deleteOne()
    return res.json({ ok: true, id: variant._id })
  } catch (error) {
    console.error('Variants delete error:', error)
    return res.status(500).json({ error: 'No se pudo eliminar la variante' })
  }
})

/* ---------------- Precios ---------------- */

router.get('/prices', requireRole('superadmin'), async (req, res) => {
  try {
    const { page, limit } = parsePagination(req.query)
    const filter = buildProductSearchFilter(req.query.q)
    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort({ id: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])
    return res.json({
      items: products.map((p) => ({
        id: p.id,
        name: p.name,
        brand: p.brand,
        category: p.category,
        price: p.price,
        oldPrice: p.oldPrice,
        stock: p.stock,
        image: p.image,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('Prices error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los precios' })
  }
})

router.post('/prices', requireRole('superadmin'), async (req, res) => {
  const { productId, price, oldPrice } = req.body || {}
  const product = await Product.findOne({ id: Number(productId) })
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado' })
  }
  const cleanPrice = Number(price)
  if (!cleanPrice || cleanPrice <= 0) {
    return res.status(400).json({ error: 'El precio debe ser un número mayor a 0' })
  }

  try {
    product.price = Math.round(cleanPrice)
    product.oldPrice =
      oldPrice === '' || oldPrice === undefined || oldPrice === null ? null : Number(oldPrice) || null
    await product.save()
    return res.json({ id: product.id, price: product.price, oldPrice: product.oldPrice })
  } catch (error) {
    console.error('Prices update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar el precio' })
  }
})

router.post('/prices/bulk', requireRole('superadmin'), async (req, res) => {
  const { mode, value, category } = req.body || {}
  const modeValue = String(mode || 'percent')
  const number = Number(value)

  if (!Number.isFinite(number)) {
    return res.status(400).json({ error: 'El valor debe ser numérico' })
  }

  try {
    const filter = category && category !== 'todas' && category !== 'all' ? { category } : {}
    const products = await Product.find(filter)

    const apply = (price) => {
      let next
      if (modeValue === 'round') {
        const step = number > 0 ? number : 100
        next = Math.round(price / step) * step
      } else if (modeValue === 'set') {
        next = number
      } else {
        next = price * (1 + number / 100)
      }
      const rounded = Math.round(next)
      return Math.max(1, rounded)
    }

    for (let i = 0; i < products.length; i++) {
      const updated = apply(products[i].price)
      if (updated !== products[i].price) {
        products[i].price = updated
        await products[i].save()
      }
    }

    return res.json({ ok: true, updated: products.length })
  } catch (error) {
    console.error('Prices bulk error:', error)
    return res.status(500).json({ error: 'No se pudo aplicar el ajuste' })
  }
})

/* ---------------- Importar productos ---------------- */

router.post('/import/products', requireRole('superadmin'), async (req, res) => {
  const rows = Array.isArray(req.body?.products)
    ? req.body.products
    : Array.isArray(req.body)
      ? req.body
      : null

  if (!rows) {
    return res.status(400).json({ error: 'Enviá un arreglo de productos (clave "products")' })
  }
  if (rows.length > 500) {
    return res.status(400).json({ error: 'Máximo 500 productos por importación' })
  }

  try {
    const validKeys = await getValidCategoryKeys()
    const seen = new Set()
    const errors = []
    const valid = []

    for (let i = 0; i < rows.length; i++) {
      const raw = rows[i] || {}
      const name = String(raw.name || '').trim()
      const brand = String(raw.brand || '').trim()
      const category = String(raw.category || '').trim()
      const price = Number(raw.price)
      const index = i + 1

      if (!name) {
        errors.push({ index, error: 'falta "name"' })
        continue
      }
      if (!brand) {
        errors.push({ index, error: 'falta "brand"' })
        continue
      }
      if (!validKeys.has(category)) {
        errors.push({ index, error: `categoría inválida: "${category}"` })
        continue
      }
      if (!price || price <= 0) {
        errors.push({ index, error: 'precio inválido' })
        continue
      }

      const key = `${name}|${brand}|${category}`.toLowerCase()
      if (seen.has(key)) {
        errors.push({ index, error: 'duplicado dentro del archivo' })
        continue
      }
      seen.add(key)

      valid.push({
        name,
        brand,
        category,
        price,
        oldPrice: raw.oldPrice ? Number(raw.oldPrice) : null,
        stock: raw.stock !== undefined && raw.stock !== '' ? Number(raw.stock) : 0,
        rating: raw.rating !== undefined && raw.rating !== '' ? Number(raw.rating) : 0,
        freeShipping: raw.freeShipping === true || raw.freeShipping === 'true',
        badge: raw.badge ? String(raw.badge).trim() : null,
        image: raw.image ? String(raw.image).trim() : '',
        description: raw.description ? String(raw.description).trim() : '',
        specs: Array.isArray(raw.specs)
          ? raw.specs.map(String).map((s) => s.trim()).filter(Boolean)
          : raw.specs
            ? String(raw.specs).split(',').map((s) => s.trim()).filter(Boolean)
            : [],
      })
    }

    let created = 0
    for (const data of valid) {
      const last = await Product.findOne().sort({ id: -1 }).lean()
      await Product.create({ id: (last?.id || 0) + 1, ...data })
      created++
    }

    return res.status(201).json({ created, skipped: errors })
  } catch (error) {
    console.error('Import products error:', error)
    return res.status(500).json({ error: 'No se pudo importar los productos' })
  }
})

export default router