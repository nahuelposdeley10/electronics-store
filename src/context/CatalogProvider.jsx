import { useCallback, useEffect, useMemo, useState } from 'react'
import { CatalogContext } from './catalogContext'
import { getTenantHeaders } from '../lib/tenant.js'

const HEADERS = getTenantHeaders()

export default function CatalogProvider({ children }) {
  const [products, setProducts] = useState([])
  const [activeBrands, setActiveBrands] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=100', { headers: HEADERS })
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

  useEffect(() => {
    let alive = true
    fetch('/api/products?limit=100', { headers: HEADERS })
      .then((res) => res.json())
      .then((data) => {
        if (alive) {
          setProducts(data.items || [])
          setError('')
        }
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    fetch('/api/brands', { headers: HEADERS })
      .then((res) => res.json())
      .then((data) => {
        if (alive) setActiveBrands(data.brands || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

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
    <CatalogContext.Provider value={{ products, brands, loading, error, reload }}>
      {children}
    </CatalogContext.Provider>
  )
}