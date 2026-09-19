export const DEFAULT_CATALOG_LIMIT = 12
export const MAX_CATALOG_LIMIT = 100

export function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function parsePagination(query = {}) {
  const page = Math.max(1, parseInt(query.page, 10) || 1)
  const limit = Math.min(
    MAX_CATALOG_LIMIT,
    Math.max(1, parseInt(query.limit, 10) || DEFAULT_CATALOG_LIMIT),
  )
  return { page, limit }
}

export function buildProductSearchFilter(q) {
  const term = String(q || '').trim()
  if (!term) return {}
  const regex = new RegExp(escapeRegex(term), 'i')
  return { $or: [{ name: regex }, { brand: regex }, { category: regex }] }
}

export function parseMulti(value) {
  if (value === undefined || value === null || value === '') return null
  const list = String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
  return list.length ? [...new Set(list)] : null
}

export function buildCatalogSort(value) {
  if (value === 'price_desc') return { price: -1, id: 1 }
  if (value === 'price_asc') return { price: 1, id: 1 }
  return { id: 1 }
}

export function buildAdminSort(value) {
  if (value === 'az') return { name: 1, id: 1 }
  if (value === 'za') return { name: -1, id: -1 }
  return { id: -1 }
}