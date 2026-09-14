import { useEffect, useState } from 'react'
import ProductCard from '@/components/ProductCard'
import SearchSelect from '@/components/SearchSelect'
import { getTenantHeaders } from '@/lib/tenant'

import './styles.css'

export default function GallerySection({ onView, brands }) {
  const [page, setPage] = useState(1)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState([])
  const [category, setCategory] = useState('all')
  const [brand, setBrand] = useState('all')
  const [sort, setSort] = useState('relevance')

  useEffect(() => {
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
  }, [])

  const hasFilters = category !== 'all' || brand !== 'all' || sort !== 'relevance'

  const resetPage = (update) => {
    setPage(1)
    if (update) update()
  }

  const clearFilters = () => {
    setPage(1)
    setCategory('all')
    setBrand('all')
    setSort('relevance')
  }

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(page), limit: '12' })
    if (category !== 'all') qs.set('category', category)
    if (brand !== 'all') qs.set('brand', brand)
    if (sort !== 'relevance') qs.set('sort', sort)
    fetch(`/api/products?${qs.toString()}`, { headers: getTenantHeaders() })
      .then((res) => res.json())
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
  }, [page, category, brand, sort])

  return (
    <section className="home-section gallery-section">
      <div className="section-head">
        <h2 id="section-galeria" data-reveal="sweep">
          Toda la galería
        </h2>
        <span className="count-tag">{data ? `${data.total} productos` : '…'}</span>
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
          {categories.map((c) => (
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
      ) : loading && !data ? (
        <p className="gallery-note">Cargando la galería…</p>
      ) : data.items.length === 0 ? (
        <p className="gallery-note">No hay productos con esos filtros.</p>
      ) : (
        <>
          <div className="product-grid">
            {data.items.map((product, i) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={onView}
                revealDelay={i * 45}
              />
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="gallery-pager">
              <button
                type="button"
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1 || loading}
              >
                ← Anterior
              </button>
              <span className="mono">
                Página {data.page} de {data.totalPages} · {data.total} productos
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= data.totalPages || loading}
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