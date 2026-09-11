import { useEffect, useMemo, useState } from 'react'
import { useCatalog } from '../context/useCatalog'
import ProductCard from '../components/ProductCard'
import { formatARS } from '../data/format'
import { IconArrow, IconCheck, IconBolt } from '../components/Icons'

function Section({ title, items, onView, offer = false }) {
  return (
    <section className="home-section" aria-labelledby={`section-${title}`}>
      <div className="section-head">
        <h2 id={`section-${title}`}>{title}</h2>
        <span className="count-tag">{items.length} productos</span>
      </div>
      <div className="product-grid">
        {items.map((product) => (
          <ProductCard key={product.id} product={product} onView={onView} offer={offer} />
        ))}
      </div>
    </section>
  )
}

function GallerySection({ onView, brands }) {
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
    fetch('/api/categories')
      .then((res) => res.json())
      .then((result) => {
        if (alive) setCategories(result.categories || [])
      })
      .catch(() => {})
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
    fetch(`/api/products?${qs.toString()}`)
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
        <h2 id="section-galeria">Toda la galería</h2>
        <span className="count-tag">{data ? `${data.total} productos` : '…'}</span>
      </div>

      <div className="gallery-tools">
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
          <label className="gallery-select">
            <span>Marca</span>
            <select
              value={brand}
              onChange={(e) => resetPage(() => setBrand(e.target.value))}
            >
              <option value="all">Todas las marcas</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>

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
            {data.items.map((product) => (
              <ProductCard key={product.id} product={product} onView={onView} />
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

export default function Home({ onView }) {
  const { products, brands } = useCatalog()
  const [newsletter, setNewsletter] = useState(false)
  const [email, setEmail] = useState('')

  const topDeals = useMemo(() => {
    const onSale = products.filter(
      (p) => p.onSale && p.oldPrice && p.oldPrice > p.price,
    )
    return onSale.length > 0
      ? onSale.slice(0, 4)
      : [...products].sort((a, b) => (b.oldPrice ?? 0) - (a.oldPrice ?? 0)).slice(0, 4)
  }, [products])

  const newest = useMemo(() => {
    const newArrivals = products.filter((p) => p.badge === 'Nuevo')
    return newArrivals.length ? newArrivals : products.slice(2, 6)
  }, [products])

  const subscribe = (e) => {
    e.preventDefault()
    if (email) {
      setNewsletter(true)
      setEmail('')
      setTimeout(() => setNewsletter(false), 3000)
    }
  }

  return (
    <main className="home">
      <section className="hero-bay">
        <img
          className="bay-bg"
          src="https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=2000&q=80"
          alt=""
          aria-hidden="true"
          loading="eager"
          fetchPriority="high"
        />
        <div className="bay-shade" aria-hidden="true" />
        <div className="bay-inner">
          <div className="bay-copy">
            <span className="bay-eyebrow">
              <IconBolt />
              Galería de tecnología · Villa Urquiza
            </span>
            <h1>
              Tecnología de galería.<br />
              <span className="h1-tail">Precio de mostrador.</span>
            </h1>
            <p className="bay-lead">
              Notebooks, móviles, audio y gaming de marca oficial, hasta 12
              cuotas sin interés y servicio técnico propio. Retirás en Villa
              Urquiza o lo recibís en todo el país.
            </p>
            <div className="bay-actions">
              <button
                type="button"
                className="hero-btn"
                onClick={() =>
                  document.querySelector('#ofertas')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                Comprar ahora
                <IconArrow />
              </button>
              <ul className="bay-trust">
                <li><IconCheck /> Garantía oficial</li>
                <li><IconCheck /> Servicio técnico propio</li>
                <li><IconCheck /> Retiro en el local</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="bay-stats" aria-hidden="true">
          <div className="bay-stat">
            <strong>Hasta 12 cuotas</strong>
            <span>sin interés</span>
          </div>
          <div className="bay-stat">
            <strong>Envío gratis</strong>
            <span>en compras +$300.000</span>
          </div>
          <div className="bay-stat">
            <strong>Garantía oficial</strong>
            <span>y servicio técnico propio</span>
          </div>
        </div>
      </section>

      <div id="ofertas" className="anchor" />

      <Section title="Ofertas de la semana" items={topDeals} onView={onView} offer />

      <div className="band-shipping">
        <span className="stamp">ENVÍO GRATIS</span>
        <p>En compras superiores a {formatARS(300000)} · 24 a 48 hs en CABA y GBA</p>
      </div>

      <Section title="Recién llegados" items={newest} onView={onView} />

      <section className="gaming-bay">
        <div className="gaming-copy">
          <span className="gaming-kicker">Sala 04</span>
          <h2>GAMING</h2>
          <p>Consolas, periféricos y sillas para llevar tu juego al siguiente nivel.</p>
          <button
            type="button"
            className="hero-btn dark"
            onClick={() => document.querySelector('#ofertas')?.scrollIntoView({ behavior: 'smooth' })}
          >
            Ver gaming
            <IconArrow />
          </button>
        </div>
        <div className="gaming-media">
          <img
            className="gaming-img"
            src="https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=700&h=500&fit=crop"
            alt="Consola 4K con mando"
            loading="lazy"
          />
        </div>
      </section>

      <GallerySection onView={onView} brands={brands} />

      <section className="brands-strip" aria-label="Marcas oficiales">
        <h2>Marcas oficiales</h2>
        <div className="brands">
          {brands.map((brand) => (
            <span key={brand} className="brand-tag">
              {brand}
            </span>
          ))}
        </div>
      </section>

      <section className="newsletter-counter">
        <div className="nl-copy">
          <h2>Ofertas de la galería, por mail</h2>
          <p>Suscribite y enterate primero de descuentos, lanzamientos y stock restockeado.</p>
        </div>
        {newsletter ? (
          <div className="newsletter-ok">
            <IconCheck />
            Listo. Revisá tu correo: ahí llega la primera.
          </div>
        ) : (
          <form onSubmit={subscribe} className="newsletter-form">
            <input
              type="email"
              required
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-label="Tu correo electrónico"
            />
            <button type="submit">Suscribirme</button>
          </form>
        )}
      </section>
    </main>
  )
}