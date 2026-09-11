import { useCallback, useEffect, useMemo, useState } from 'react'
import { CatalogContext } from './catalogContext'

export default function CatalogProvider({ children }) {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    try {
      const res = await fetch('/api/products?limit=100')
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
    fetch('/api/products?limit=100')
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
    return () => {
      alive = false
    }
  }, [])

  const brands = useMemo(
    () => [...new Set(products.map((p) => p.brand))].sort((a, b) => a.localeCompare(b, 'es')),
    [products],
  )

  return (
    <CatalogContext.Provider value={{ products, brands, loading, error, reload }}>
      {children}
    </CatalogContext.Provider>
  )
}