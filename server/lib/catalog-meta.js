import { Category } from '../models/Category.js'
import { Brand } from '../models/Brand.js'
import { Product } from '../models/Product.js'

export const LEGACY_CATEGORIES = [
  { key: 'audio', name: 'Audio' },
  { key: 'moviles', name: 'Móviles' },
  { key: 'computacion', name: 'Computación' },
  { key: 'wearables', name: 'Wearables' },
  { key: 'entretenimiento', name: 'Entretenimiento' },
  { key: 'perifericos', name: 'Periféricos' },
  { key: 'fotografia', name: 'Fotografía' },
]

export function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export async function getValidCategoryKeys() {
  const count = await Category.countDocuments()
  if (count === 0) {
    return new Set(LEGACY_CATEGORIES.map((c) => c.key))
  }
  const docs = await Category.find({}).lean()
  return new Set(docs.map((d) => d.key))
}

export async function ensureCatalogMeta() {
  const categoryCount = await Category.countDocuments()
  if (categoryCount === 0) {
    await Category.insertMany(LEGACY_CATEGORIES)
  }

  const brandCount = await Brand.countDocuments()
  if (brandCount === 0) {
    const names = await Product.distinct('brand')
    const seen = new Set()
    const brandDocs = []
    for (const name of names) {
      const clean = String(name || '').trim()
      const norm = clean.toLowerCase()
      if (clean && !seen.has(norm)) {
        seen.add(norm)
        brandDocs.push({ name: clean })
      }
    }
    if (brandDocs.length) await Brand.insertMany(brandDocs)
  }
}