import express from 'express'
import { Product } from '../models/Product.js'

const router = express.Router()

router.get('/products', async (req, res) => {
  try {
    const products = await Product.find().sort({ id: 1 }).lean()
    res.json(
      products.map((p) => ({
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
        emoji: p.emoji,
        image: p.image,
        description: p.description,
        specs: p.specs,
      })),
    )
  } catch (error) {
    console.error('Catalog error:', error)
    return res.status(500).json({ error: 'No se pudo leer el catálogo' })
  }
})

export default router