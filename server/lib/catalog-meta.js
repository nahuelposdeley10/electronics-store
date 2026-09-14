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

function tenantFilter(tenant) {
  return tenant ? { adminId: tenant } : { adminId: null }
}

export async function getValidCategoryKeys({ tenant } = {}) {
  const filter = tenantFilter(tenant)
  const count = await Category.countDocuments(filter)
  if (count === 0) {
    return new Set(LEGACY_CATEGORIES.map((c) => c.key))
  }
  const docs = await Category.find(filter).lean()
  return new Set(docs.map((d) => d.key))
}

export async function ensureCatalogMeta({ tenant } = {}) {
  const filter = tenantFilter(tenant)
  const categoryCount = await Category.countDocuments(filter)
  if (categoryCount === 0) {
    await Category.insertMany(
      LEGACY_CATEGORIES.map((c) => ({ ...filter, ...c })),
    )
  }

  const brandCount = await Brand.countDocuments(filter)
  if (brandCount === 0) {
    const names = await Product.distinct('brand', filter)
    const seen = new Set()
    const brandDocs = []
    for (const name of names) {
      const clean = String(name || '').trim()
      const norm = clean.toLowerCase()
      if (clean && !seen.has(norm)) {
        seen.add(norm)
        brandDocs.push({ ...filter, name: clean })
      }
    }
    if (brandDocs.length) await Brand.insertMany(brandDocs)
  }
}