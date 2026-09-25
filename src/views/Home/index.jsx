import { useEffect, useMemo, useRef, useState } from 'react'
import { useCatalog } from '@/context/useCatalog'
import ProductCard from '@/components/ProductCard'
import { formatARS } from '@/data/format'
import { useSiteSettings, mergeSettings } from '@/lib/siteSettings'
import { IconArrow, IconCheck, IconBolt } from '@/components/Icons'
import GallerySection from './components/GallerySection'

import './styles.css'

function Section({ title, items, onView, offer = false }) {
  return (
    <section className="home-section" aria-labelledby={`section-${title}`}>
      <div className="section-head">
        <h2 id={`section-${title}`} data-reveal="sweep">
          {title}
        </h2>
        <span className="count-tag">{items.length} productos</span>
      </div>
      <div className="product-grid">
        {items.map((product, i) => (
          <ProductCard
            key={product.id}
            product={product}
            onView={onView}
            offer={offer}
            revealDelay={i * 55}
          />
        ))}
      </div>
    </section>
  )
}

export default function Home({ onView }) {
  const { products, brands } = useCatalog()
  const settings = mergeSettings(useSiteSettings())
  const maxMonths = Math.max(
    ...((settings.general.installments && settings.general.installments.length
      ? settings.general.installments
      : [{ months: 12 }]
    ).map((s) => Number(s.months) || 1)),
  )
  const freeThreshold = settings.shipping.freeThreshold
  const shippingEnabled = settings.shipping.enabled !== false
  const heroTitle = settings.hero.title || 'Tecnología de galería.'
  const heroAccent = settings.hero.titleAccent || 'Precio de mostrador.'
  const heroLead = String(settings.hero.lead || '')
    .replace(/\{cuotas\}/g, String(maxMonths))
    .replace(/\{ciudad\}/g, settings.store.addressShort)
    .trim()
  const [bayLive, setBayLive] = useState(false)
  const heroRef = useRef(null)
  const stageRef = useRef(null)

  useEffect(() => {
    const el = heroRef.current
    if (!el || typeof IntersectionObserver === 'undefined') return undefined
    const io = new IntersectionObserver(
      ([entry]) => setBayLive(entry.isIntersecting),
      { rootMargin: '120px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || document.documentElement.classList.contains('anim-off')) {
      return undefined
    }
    let ticking = false
    const update = () => {
      ticking = false
      stage.style.transform = `translate3d(0, ${Math.min(window.scrollY * 0.22, 150)}px, 0)`
    }
    const onScroll = () => {
      if (!ticking) {
        ticking = true
        window.requestAnimationFrame(update)
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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

  return (
    <main className="home">
      <section ref={heroRef} className={bayLive ? 'hero-bay bay-live' : 'hero-bay'}>
        <div className="bay-stage" ref={stageRef}>
          {settings.store.coverUrl && (
            <img
              className="bay-bg"
              src={settings.store.coverUrl}
              alt=""
              aria-hidden="true"
              loading="eager"
              fetchPriority="high"
            />
          )}
          <div className="bay-shade" aria-hidden="true" />
        </div>
        <div className="bay-inner">
          <div className="bay-copy">
            <span className="bay-eyebrow">
              <IconBolt />
              {settings.store.name} · {settings.store.addressShort}
            </span>
            <h1>
              {heroTitle}
              <br />
              <span className="h1-tail">{heroAccent}</span>
            </h1>
            <p className="bay-lead">{heroLead}</p>
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
            <strong>Hasta {maxMonths} cuotas</strong>
            <span>sin interés</span>
          </div>
          {shippingEnabled ? (
            <div className="bay-stat">
              <strong>Envío gratis</strong>
              <span>en compras +{formatARS(freeThreshold)}</span>
            </div>
          ) : (
            <div className="bay-stat">
              <strong>Retiro en el local</strong>
              <span>siempre gratis</span>
            </div>
          )}
          <div className="bay-stat">
            <strong>Garantía oficial</strong>
            <span>y servicio técnico propio</span>
          </div>
        </div>
      </section>

      <div id="ofertas" className="anchor" />

      <Section title="Ofertas de la semana" items={topDeals} onView={onView} offer />

      {shippingEnabled ? (
        <div className="band-shipping" data-reveal="up">
          <span className="stamp">ENVÍO GRATIS</span>
          <p>
            En compras superiores a {formatARS(freeThreshold)} · {settings.shipping.label}
          </p>
        </div>
      ) : (
        <div className="band-shipping" data-reveal="up">
          <span className="stamp">RETIRO GRATIS</span>
          <p>Retirá en el local · {settings.store.addressShort}</p>
        </div>
      )}

      <Section title="Recién llegados" items={newest} onView={onView} />

      <section className="gaming-bay" data-reveal="up">
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
        <h2 data-reveal="sweep">Marcas oficiales</h2>
        <div className="brands">
          {brands.map((brand, i) => (
            <span
              key={brand}
              className="brand-tag"
              data-reveal="up"
              style={{ '--reveal-delay': `${i * 45}ms` }}
            >
              {brand}
            </span>
          ))}
        </div>
      </section>
    </main>
  )
}