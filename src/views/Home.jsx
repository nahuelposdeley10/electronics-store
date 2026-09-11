import { useMemo, useState } from 'react'
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

export default function Home({ onView }) {
  const { products, brands } = useCatalog()
  const [newsletter, setNewsletter] = useState(false)
  const [email, setEmail] = useState('')

  const topDeals = useMemo(
    () => [...products].sort((a, b) => (b.oldPrice ?? 0) - (a.oldPrice ?? 0)).slice(0, 4),
    [products],
  )

  const newest = useMemo(() => {
    const newArrivals = products.filter((p) => p.badge === 'Nuevo')
    return newArrivals.length ? newArrivals : products.slice(2, 6)
  }, [products])

  const featured = useMemo(
    () => products.filter((p) => p.freeShipping).slice(0, 8),
    [products],
  )

  const shelf = topDeals.slice(0, 4)

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
        <div className="bay-light" aria-hidden="true" />
        <div className="bay-inner">
          <div className="bay-copy">
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

          <div className="bay-shelf">
            <div className="shelf-light" aria-hidden="true">
              <IconBolt />
            </div>
            <div className="shelf-cases">
              {shelf.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  className="shelf-item"
                  onClick={() => onView(product)}
                  aria-label={`Ver ${product.name}`}
                >
                  <span className="shelf-num">0{product.id}</span>
                  <img className="shelf-img" src={product.image} alt="" loading="lazy" />
                  <span className="shelf-tag">
                    <strong>{formatARS(product.price)}</strong>
                  </span>
                </button>
              ))}
            </div>
            <div className="shelf-plank" aria-hidden="true" />
            <div className="shelf-note" aria-hidden="true">
              <IconBolt /> Ofertas de la semana · verificadas por el técnico
            </div>
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

      <Section title="Lo más vendido" items={featured} onView={onView} />

      <Section title="Toda la galería" items={products} onView={onView} />

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