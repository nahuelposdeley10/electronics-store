import { useEffect, useMemo, useState } from 'react'
import ProductCard from '@/components/ProductCard'
import SearchSelect from '@/components/SearchSelect'
import { getTenantHeaders, getTenantSlug } from '@/lib/tenant'

import './styles.css'

const readStoredFilters = (key) => {
  try {
    const stored = sessionStorage.getItem(key)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export default function GallerySection({ onView, brands, demoProducts = [] }) {
  const isDemo = demoProducts.length > 0
  const filterStorageKey = `storefront-gallery-filters:${getTenantSlug() || 'global'}`
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState(() => readStoredFilters(filterStorageKey).category || 'all')
  const [brand, setBrand] = useState(() => readStoredFilters(filterStorageKey).brand || 'all')
  const [sort, setSort] = useState(() => readStoredFilters(filterStorageKey).sort || 'relevance')
  const demoData = useMemo(() => {
    let items = demoProducts
    if (category !== 'all') items = items.filter((product) => product.category === category)
    if (brand !== 'all') items = items.filter((product) => product.brand === brand)
    if (sort === 'price_asc') items = [...items].sort((a, b) => a.price - b.price)
    if (sort === 'price_desc') items = [...items].sort((a, b) => b.price - a.price)
    return { items, page: 1, total: items.length, totalPages: 1 }
  }, [demoProducts, category, brand, sort])

  useEffect(() => {
    if (isDemo) return undefined
    let alive = true
    fetch('/api/categories', { headers: getTenantHeaders() })
      .then((res) => res.json())
      .then((result) => {
        if (alive) setCategories(result.categories || [])
      })
      .catch((err) => console.warn('No se pudieron cargar las categorías', err))
    return () => {
      alive = false
    }
  }, [isDemo])

  const hasFilters = category !== 'all' || brand !== 'all' || sort !== 'relevance'

  const resetPage = (update) => {
    setPage(1)
    setLoading(true)
    setError('')
    if (update) update()
  }

  const clearFilters = () => {
    setPage(1)
    setLoading(true)
    setError('')
    setCategory('all')
    setBrand('all')
    setSort('relevance')
  }

  useEffect(() => {
    try {
      sessionStorage.setItem(filterStorageKey, JSON.stringify({ category, brand, sort }))
    } catch {
      // La navegación sigue funcionando aunque el navegador bloquee el storage.
    }
  }, [filterStorageKey, category, brand, sort])

  useEffect(() => {
    if (isDemo) {
      return undefined
    }
    let alive = true
    const qs = new URLSearchParams({ page: String(page), limit: '12' })
    if (category !== 'all') qs.set('category', category)
    if (brand !== 'all') qs.set('brand', brand)
    if (sort !== 'relevance') qs.set('sort', sort)
    fetch(`/api/products?${qs.toString()}`, { headers: getTenantHeaders() })
      .then((res) => {
        if (!res.ok) throw new Error('No se pudieron cargar los productos')
        return res.json()
      })
      .then((result) => {
        if (alive) setData(result)
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
  }, [page, category, brand, sort, isDemo, demoProducts])

  const visibleData = isDemo ? demoData : data

  const visibleCategories = isDemo
    ? [...new Set(demoProducts.map((product) => product.category))].map((key) => ({
      key,
      name: key.charAt(0).toUpperCase() + key.slice(1),
    }))
    : categories

  return (
    <section id="catalogo" className="home-section gallery-section">
      <div className="section-head">
        <h2 id="section-galeria" data-reveal="sweep">
          Toda la galería
        </h2>
        <span className="count-tag">{visibleData ? `${visibleData.total} productos` : '…'}</span>
      </div>

      <div className="gallery-tools" data-reveal="up">
        <div className="gallery-chips" role="group" aria-label="Filtrar por categoría">
          <button
            type="button"
            className={`gallery-chip${category === 'all' ? ' active' : ''}`}
            onClick={() => resetPage(() => setCategory('all'))}
          >
            Todas
          </button>
          {visibleCategories.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`gallery-chip${category === c.key ? ' active' : ''}`}
              onClick={() => resetPage(() => setCategory(c.key))}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className="gallery-meta">
          <SearchSelect
            id="home-brand-filter"
            label="Marca"
            value={brand}
            onChange={(v) => resetPage(() => setBrand(v))}
            allLabel="Todas las marcas"
            allValue="all"
            options={brands.map((b) => ({ value: b, label: b }))}
          />

          <div className="gallery-sort" role="group" aria-label="Ordenar por precio">
            <button
              type="button"
              className={`sort-btn${sort === 'relevance' ? ' active' : ''}`}
              onClick={() => resetPage(() => setSort('relevance'))}
            >
              Relevancia
            </button>
            <button
              type="button"
              className={`sort-btn${sort === 'price_asc' ? ' active' : ''}`}
              onClick={() => resetPage(() => setSort('price_asc'))}
            >
              Menor precio
            </button>
            <button
              type="button"
              className={`sort-btn${sort === 'price_desc' ? ' active' : ''}`}
              onClick={() => resetPage(() => setSort('price_desc'))}
            >
              Mayor precio
            </button>
          </div>

          {hasFilters && (
            <button type="button" className="gallery-clear" onClick={clearFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {error ? (
        <p className="gallery-note">{error}</p>
      ) : loading && !visibleData ? (
        <div className="catalog-skeleton-grid" role="status" aria-label="Cargando productos" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div className="catalog-skeleton-card" key={i}>
              <span className="catalog-skeleton-media" />
              <span className="catalog-skeleton-line short" />
              <span className="catalog-skeleton-line" />
              <span className="catalog-skeleton-line price" />
            </div>
          ))}
        </div>
      ) : visibleData.items.length === 0 ? (
        <p className="gallery-note">No hay productos con esos filtros.</p>
      ) : (
        <>
          <div className="product-grid">
            {visibleData.items.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={onView}
                demo={isDemo}
                revealDelay={i * 45}
              />
            ))}
          </div>
          {visibleData.totalPages > 1 && (
            <div className="gallery-pager">
              <button
                type="button"
                onClick={() => {
                  setLoading(true)
                  setPage((p) => p - 1)
                }}
                disabled={page <= 1 || loading}
              >
                ← Anterior
              </button>
              <span className="mono">
                Página {visibleData.page} de {visibleData.totalPages} · {visibleData.total} productos
              </span>
              <button
                type="button"
                onClick={() => {
                  setLoading(true)
                  setPage((p) => p + 1)
                }}
                disabled={page >= visibleData.totalPages || loading}
              >
                Siguiente →
              </button>
            </div>
          )}
        </>
      )}
    </section>
  )
}
