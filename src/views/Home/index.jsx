import { useEffect, useMemo, useRef, useState } from 'react'
import { useCatalog } from '@/context/useCatalog'
import ProductCard from '@/components/ProductCard'
import { formatARS } from '@/data/format'
import { useSiteSettings, mergeSettings } from '@/lib/siteSettings'
import { IconArrow, IconCheck, IconBolt } from '@/components/Icons'
import { DEMO_BRANDS, DEMO_PRODUCTS, DEMO_SECTION_SIZE } from '@/data/demoCatalog.js'
import GallerySection from './components/GallerySection'

import './styles.css'

function Section({ title, items, onView, offer = false, demo = false }) {
  return (
    <section className="home-section" aria-labelledby={`section-${title}`}>
      <div className="section-head">
        <h2 id={`section-${title}`}>
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
            demo={demo}
            revealDelay={i * 55}
          />
        ))}
      </div>
    </section>
  )
}

export default function Home({ onView }) {
  const { products, brands } = useCatalog()
  const showingDemoCatalog = products.length === 0
  const visibleProducts = showingDemoCatalog ? DEMO_PRODUCTS : products
  const visibleBrands = showingDemoCatalog ? DEMO_BRANDS : brands
  const settings = mergeSettings(useSiteSettings())
  const appearance = settings.appearance
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
  }, [appearance.showHero])

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
  }, [appearance.showHero])

  const topDeals = useMemo(() => {
    const onSale = visibleProducts.filter(
      (p) => p.onSale && p.oldPrice && p.oldPrice > p.price,
    )
    return onSale.length > 0
      ? { title: 'Ofertas de la semana', items: onSale.slice(0, DEMO_SECTION_SIZE), demo: false }
      : { title: 'Ofertas de la semana', items: DEMO_PRODUCTS.slice(0, DEMO_SECTION_SIZE), demo: true }
  }, [visibleProducts])

  const newest = useMemo(() => {
    const newArrivals = visibleProducts.filter((p) => p.badge === 'Nuevo')
    return newArrivals.length
      ? { title: 'Recién llegados', items: newArrivals.slice(0, DEMO_SECTION_SIZE), demo: false }
      : { title: 'Recién llegados', items: DEMO_PRODUCTS.slice(DEMO_SECTION_SIZE, DEMO_SECTION_SIZE * 2), demo: true }
  }, [visibleProducts])
  const showOffersSection = appearance.showOffers || topDeals.demo
  const showNewArrivalsSection = appearance.showNewArrivals || newest.demo

  return (
    <main className="home">
      {appearance.showHero && <section ref={heroRef} className={bayLive ? 'hero-bay bay-live' : 'hero-bay'}>
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
                  document.querySelector('#catalogo')?.scrollIntoView({ behavior: 'smooth' })
                }
              >
                {appearance.heroButton}
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
      </section>}

      {showingDemoCatalog && <aside className="catalog-demo-notice" role="status">
        <strong>Vista de ejemplo</strong>
        <span>Esta tienda todavía no tiene productos cargados. Estos artículos muestran cómo se verá tu catálogo y no se pueden comprar.</span>
      </aside>}

      <div id="ofertas" className="anchor" />

      {showOffersSection && <Section title={topDeals.title} items={topDeals.items} onView={onView} offer demo={topDeals.demo} />}

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

      {showNewArrivalsSection && <Section title={newest.title} items={newest.items} onView={onView} demo={newest.demo} />}

      {appearance.showGaming && <section className="gaming-bay" data-reveal="up">
        <div className="gaming-copy">
          <span className="gaming-kicker">{settings.gaming.kicker}</span>
          <h2>{settings.gaming.title}</h2>
          <p>{settings.gaming.description}</p>
          <button
            type="button"
            className="hero-btn dark"
            onClick={() => document.querySelector('#ofertas')?.scrollIntoView({ behavior: 'smooth' })}
          >
            {settings.gaming.buttonText}
            <IconArrow />
          </button>
        </div>
        {settings.gaming.imageUrl && <div className="gaming-media">
          <img
            className="gaming-img"
            src={settings.gaming.imageUrl || undefined}
            alt={settings.gaming.imageAlt}
            loading="lazy"
          />
        </div>}
      </section>}

      <GallerySection onView={onView} brands={visibleBrands} demoProducts={showingDemoCatalog ? DEMO_PRODUCTS : []} />

      {appearance.showBrands && <section className="brands-strip" aria-label="Marcas oficiales">
        <h2 data-reveal="sweep">Marcas oficiales</h2>
        <div className="brands">
          {visibleBrands.map((brand, i) => (
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
      </section>}
    </main>
  )
}
