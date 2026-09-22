import express from 'express'
import { Product } from '../models/Product.js'
import { Brand } from '../models/Brand.js'
import { Category } from '../models/Category.js'
import { Coupon } from '../models/Coupon.js'
import { ensureCatalogMeta } from '../lib/catalog-meta.js'
import {
  parsePagination,
  parseMulti,
  buildCatalogSort,
  buildPublicCatalogFilter,
} from '../lib/catalog-query.js'
import { publicTenantId } from '../lib/tenant.js'

const router = express.Router()

function toPublicProduct(p) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    oldPrice: p.oldPrice || null,
    freeShipping: p.freeShipping,
    rating: p.rating,
    stock: p.stock,
    badge: p.badge,
    onSale: !!p.onSale,
    image: p.image,
    description: p.description,
    specs: p.specs,
  }
}

router.get('/products', async (req, res) => {
  try {
    const tenant = await publicTenantId(req)
    const { page, limit } = parsePagination(req.query)
    const filter = { ...buildPublicCatalogFilter(req.query.q), adminId: tenant }

    const categories = parseMulti(req.query.category)
    if (categories) filter.$and.push({ category: { $in: categories } })

    const brands = parseMulti(req.query.brand)
    if (brands) filter.$and.push({ brand: { $in: brands } })

    const sort = buildCatalogSort(req.query.sort)

    const [total, products] = await Promise.all([
      Product.countDocuments(filter),
      Product.find(filter)
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
    ])

    return res.json({
      items: products.map((p) => toPublicProduct(p)),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (error) {
    console.error('Catalog error:', error)
    return res.status(500).json({ error: 'No se pudo leer el catálogo' })
  }
})

router.get('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id)
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: 'Identificador inválido' })
    }
    const tenant = await publicTenantId(req)
    const product = await Product.findOne({ id, adminId: tenant }).lean()
    if (!product) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }
    if (!product.brand || !product.category) {
      return res.status(404).json({ error: 'Producto no encontrado' })
    }
    return res.json(toPublicProduct(product))
  } catch (error) {
    console.error('Product detail error:', error)
    return res.status(500).json({ error: 'No se pudo leer el producto' })
  }
})

router.get('/coupons', async (req, res) => {
  try {
    const tenant = await publicTenantId(req)
    const coupons = await Coupon.find({ active: true, adminId: tenant }).sort({ createdAt: -1 }).lean()
    return res.json({
      items: coupons.map((c) => ({
        code: c.code,
        percent: c.percent,
        description: c.description || '',
      })),
    })
  } catch (error) {
    console.error('Coupons error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los cupones' })
  }
})

router.get('/categories', async (req, res) => {
  try {
    const tenant = await publicTenantId(req)
    if (tenant) await ensureCatalogMeta({ tenant })
    const categories = await Category.find({ active: true, adminId: tenant }).sort({ key: 1 }).lean()
    return res.json({
      categories: categories.map((c) => ({ key: c.key, name: c.name })),
    })
  } catch (error) {
    console.error('Categories error:', error)
    return res.status(500).json({ error: 'No se pudieron leer las categorías' })
  }
})

router.get('/brands', async (req, res) => {
  try {
    const tenant = await publicTenantId(req)
    if (tenant) await ensureCatalogMeta({ tenant })
    const brands = await Brand.find({ active: true, adminId: tenant }).sort({ name: 1 }).lean()
    return res.json({ brands: brands.map((b) => b.name) })
  } catch (error) {
    console.error('Brands error:', error)
    return res.status(500).json({ error: 'No se pudieron leer las marcas' })
  }
})

export default router