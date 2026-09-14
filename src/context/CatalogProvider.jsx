import { useCallback, useEffect, useMemo, useState } from 'react'
import { CatalogContext } from './catalogContext'
import { getTenantHeaders } from '../lib/tenant.js'

const HEADERS = getTenantHeaders()
const CATALOG_URL = '/api/products?limit=100'

export default function CatalogProvider({ children }) {
  const [products, setProducts] = useState([])
  const [activeBrands, setActiveBrands] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [brandsError, setBrandsError] = useState('')

  const loadProducts = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true)
    try {
      const res = await fetch(CATALOG_URL, { headers: HEADERS })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo leer el catálogo')
      setProducts(data.items || [])
      setError('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadBrands = useCallback(async () => {
    try {
      const res = await fetch('/api/brands', { headers: HEADERS })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudieron leer las marcas')
      setActiveBrands(data.brands || [])
      setBrandsError('')
    } catch (err) {
      setBrandsError(err.message)
    }
  }, [])

  const reload = useCallback(() => loadProducts(), [loadProducts])

  const search = useCallback(async (query) => {
    const q = String(query || '').trim()
    const url = q ? `/api/products?q=${encodeURIComponent(q)}&limit=100` : CATALOG_URL
    const res = await fetch(url, { headers: HEADERS })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'No se pudo realizar la búsqueda')
    return data.items || []
  }, [])

  useEffect(() => {
    const after = (fn) => Promise.resolve().then(fn)
    void Promise.all([after(() => loadProducts({ silent: true })), after(loadBrands)])
  }, [loadProducts, loadBrands])

  const brands = useMemo(() => {
    const fromProducts = [
      ...new Set(products.map((p) => p.brand).filter(Boolean)),
    ]
    if (!activeBrands) return fromProducts.sort((a, b) => a.localeCompare(b, 'es'))
    const byName = new Map(activeBrands.map((name) => [name.toLowerCase(), name]))
    return fromProducts
      .filter((brand) => byName.has(brand.toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'es'))
  }, [products, activeBrands])

  return (
    <CatalogContext.Provider
      value={{ products, brands, loading, error, brandsError, reload, search }}
    >
      {children}
    </CatalogContext.Provider>
  )
}