import express from 'express'
import { Product } from '../models/Product.js'
import { parsePagination, buildProductSearchFilter } from '../lib/catalog-query.js'

const router = express.Router()

function toPublicProduct(p) {
  return {
    id: p.id,
    name: p.name,
    brand: p.brand,
    category: p.category,
    price: p.price,
    oldPrice: p.oldPrice,
    freeShipping: p.freeShipping,
    rating: p.rating,
    stock: p.stock,
    badge: p.badge,
    image: p.image,
    description: p.description,
    specs: p.specs,
  }
}

router.get('/products', async (req, res) => {
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
      items: products.map(toPublicProduct),
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

export default router