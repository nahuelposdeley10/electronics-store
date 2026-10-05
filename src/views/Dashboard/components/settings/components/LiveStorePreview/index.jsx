import { useEffect, useRef } from 'react'
import { formatARS } from '@/data/format'
import { DEMO_PRODUCTS } from '@/data/demoCatalog.js'
import { appearanceVariables, normalizeAppearance } from '@/lib/appearance'
import { IconInstagram } from '@/components/Icons'
import './styles.css'

function PreviewShell({ title, appearance, children, highlightTarget, social }) {
  const theme = normalizeAppearance(appearance)
  const browserRef = useRef(null)
  useEffect(() => {
    if (!highlightTarget || !browserRef.current) return
    const target = browserRef.current.querySelector(`[data-preview-target="${highlightTarget}"], [data-appearance-target="${highlightTarget}"]`)
      || browserRef.current.parentElement?.querySelector(`[data-preview-target="${highlightTarget}"], [data-appearance-target="${highlightTarget}"]`)
    if (!target) return
    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }))
  }, [highlightTarget])
  return <aside className="live-store-preview" aria-label={`Vista previa: ${title}`}>
    <div className="live-preview-head"><div><span>Vista previa</span><strong>{title}</strong></div><em><i aria-hidden="true" /> En vivo</em></div>
    <div className="live-preview-browser" style={appearanceVariables(theme)}>
      <div className="live-preview-browser-bar" aria-hidden="true"><i /><i /><i /><span>Tu tienda</span></div>
      <div ref={browserRef} className="live-preview-scroll">{children}</div>
      <PreviewSocialFloat appearance={appearance} instagram={social?.instagram} highlightWhatsapp={social?.highlightWhatsapp} highlightInstagram={social?.highlightInstagram} />
    </div>
    <p>Se actualiza mientras editás. Guardá los cambios para publicarlos.</p>
  </aside>
}

function ContactPreview({ data, appearance, settings, highlight, highlightTarget }) {
  return <PreviewShell title="Cabecera y contacto" appearance={appearance} highlightTarget={highlightTarget} social={{ instagram: Boolean(data?.instagram), highlightWhatsapp: highlightTarget === 'contact-whatsapp', highlightInstagram: highlightTarget === 'contact-instagram' }}>
    <PreviewStorefront data={data} settings={settings} appearance={appearance} highlight={highlight} highlightTarget={highlightTarget} />
    <PreviewFocus title="Datos de contacto" highlightTarget={highlightTarget} items={[
      { target: 'contact-phone', text: data.phone || 'Sin teléfono' },
      { target: 'contact-email', text: data.email || 'Sin email' },
      { target: 'contact-address-full', text: data.addressFull || 'Sin dirección completa' },
      { target: 'contact-address-short', text: data.addressShort || 'Sin dirección corta' },
      { target: 'contact-hours', text: data.hours || 'Sin horarios' },
    ]} />
  </PreviewShell>
}

function ContentPreview({ data, appearance, settings, highlight, highlightTarget }) {
  const theme = normalizeAppearance(appearance)
  return <PreviewShell title="Página de inicio" appearance={theme} highlightTarget={highlightTarget} social={{ instagram: Boolean(settings?.store?.instagram), highlightWhatsapp: highlight === 'whatsapp' }}>
    <PreviewStorefront data={data} items={data.marquee} settings={settings} appearance={theme} highlight={highlight} highlightTarget={highlightTarget} />
  </PreviewShell>
}

function PreviewStorefront({ data = {}, appearance, settings, items = [], highlight, highlightTarget }) {
  const source = { ...(settings?.store || {}), ...data }
  const hero = { ...(settings?.hero || {}), ...data }
  const cover = String(source.coverUrl || '').trim()
  const gaming = data.gaming || settings?.gaming || {}
  const headerCounters = Array.isArray(data.counters) && data.counters.length === 4
    ? data.counters
    : (Array.isArray(settings?.general?.headerCounters) && settings.general.headerCounters.length === 4
      ? settings.general.headerCounters
      : [
        { title: 'Cuotas', text: 'hasta 12 sin interés' },
        { title: 'Envío', text: 'a domicilio' },
        { title: 'Garantía', text: 'oficial' },
        { title: 'Retiro', text: 'en el local' },
      ])
  const marquee = items.length ? items : (settings?.general?.marquee?.length ? settings.general.marquee : ['Novedades de tu tienda', 'Compra segura', 'Envíos a todo el país'])
  const heroStyle = cover
    ? { backgroundImage: `linear-gradient(90deg, rgba(10,12,8,.9), rgba(10,12,8,.3)), url("${cover.replaceAll('"', '%22')}")` }
    : undefined
  const zoneFocus = (zone, ownTarget = zone) => highlight === zone && (!highlightTarget || highlightTarget === ownTarget) ? ' is-preview-focus' : ''
  const appearanceFocus = (target, className = 'is-preview-focus') => highlightTarget === target ? ` ${className}` : ''

  return <div className={`preview-storefront preview-focus-zone${appearanceFocus('appearance-background')}`} data-appearance-target="appearance-background">
    {appearance.showMarquee && <div data-preview-target="marquee" data-appearance-target="appearance-showMarquee" className={`preview-marquee preview-focus-zone${zoneFocus('marquee')}${appearanceFocus('appearance-showMarquee')}`}>{marquee.map((item) => <span key={item}>{item}</span>)}</div>}
    <header className="preview-store-header">
      <div className={`preview-fascia preview-focus-zone${zoneFocus('brand')}`}>
        <div className="preview-brand">
          <span data-preview-target="contact-logo" className={`preview-brand-chip${highlightTarget === 'contact-logo' ? ' is-preview-media-focus' : ''}`}>{source.logoUrl ? <img src={source.logoUrl} alt="" /> : 'BNP'}</span>
          <span><strong data-preview-target="contact-name" className={highlightTarget === 'contact-name' ? 'is-preview-text-focus' : ''}>{source.name || 'Nombre de tu tienda'}</strong><small data-preview-target="contact-tagline" className={highlightTarget === 'contact-tagline' ? 'is-preview-text-focus' : ''}>{source.tagline || 'Frase corta de tu negocio'}</small></span>
        </div>
        <div className="preview-search">Buscá producto, marca o categoría…</div>
        <div className="preview-nav">Inicio <span>Carrito</span></div>
      </div>
      <div className={`preview-counters preview-focus-zone${zoneFocus('brand')}`}>{headerCounters.map((counter, index) => <span key={`${counter.title}-${index}`} className={highlightTarget === `counter-${index}` ? 'is-preview-text-focus' : ''} data-preview-target={`counter-${index}`}><b>{counter.title}</b> {counter.text}</span>)}</div>
    </header>

    {appearance.showHero ? <section data-preview-target="hero-image" data-appearance-target="appearance-showHero" className={`preview-hero preview-focus-zone${zoneFocus('hero', 'hero-image')}${appearanceFocus('appearance-showHero')}`} style={heroStyle}>
      <div><span>BIENVENIDA</span><h3 data-appearance-target="appearance-headingFont" className={`${highlightTarget === 'hero-title' ? 'is-preview-text-focus' : ''}${appearanceFocus('appearance-headingFont', 'is-preview-text-focus')}`}><span data-preview-target="hero-title">{hero.heroTitle || hero.title || 'Tecnología de galería.'}</span><em className={`${highlightTarget === 'hero-accent' ? 'is-preview-text-focus' : ''}${appearanceFocus('appearance-accent', 'is-preview-text-focus')}`} data-preview-target="hero-accent" data-appearance-target="appearance-accent">{hero.heroAccent || hero.titleAccent || 'Precio de mostrador.'}</em></h3><p className={highlightTarget === 'hero-lead' ? 'is-preview-text-focus' : ''} data-preview-target="hero-lead">{hero.heroLead || hero.lead || 'Escribí una presentación breve para tu tienda.'}</p><button type="button" tabIndex={-1} data-appearance-target="appearance-heroButton" className={appearanceFocus('appearance-heroButton', 'is-preview-text-focus')}>{appearance.heroButton}</button></div>
    </section> : <div data-appearance-target="appearance-showHero" className={`live-preview-empty${appearanceFocus('appearance-showHero')}`}>La portada está oculta desde Colores y diseño.</div>}

    {appearance.showOffers ? <PreviewProductSection title="Ofertas de la semana" products={DEMO_PRODUCTS.slice(0, 2)} appearance={appearance} highlight={highlight} appearanceTarget="appearance-showOffers" highlightTarget={highlightTarget} /> : <div data-appearance-target="appearance-showOffers" className={`live-preview-empty${appearanceFocus('appearance-showOffers')}`}>Ofertas de la semana está oculta desde Colores y diseño.</div>}
    {appearance.showNewArrivals ? <PreviewProductSection title="Recién llegados" products={DEMO_PRODUCTS.slice(2)} appearance={appearance} highlight={highlight} appearanceTarget="appearance-showNewArrivals" highlightTarget={highlightTarget} /> : <div data-appearance-target="appearance-showNewArrivals" className={`live-preview-empty${appearanceFocus('appearance-showNewArrivals')}`}>Recién llegados está oculta desde Colores y diseño.</div>}
    {appearance.showGaming ? <section data-preview-target="gaming" data-appearance-target="appearance-showGaming" className={`preview-gaming preview-focus-zone${zoneFocus('gaming')}${appearanceFocus('appearance-showGaming')}`}><div><span className={highlightTarget === 'gaming-kicker' ? 'is-preview-text-focus' : ''} data-preview-target="gaming-kicker">{gaming.kicker || 'Sala 04'}</span><h3 className={highlightTarget === 'gaming-title' ? 'is-preview-text-focus' : ''} data-preview-target="gaming-title">{gaming.title || 'GAMING'}</h3><p className={highlightTarget === 'gaming-description' ? 'is-preview-text-focus' : ''} data-preview-target="gaming-description">{gaming.description || 'Consolas, periféricos y sillas para llevar tu juego al siguiente nivel.'}</p><button className={highlightTarget === 'gaming-button' ? 'is-preview-text-focus' : ''} type="button" tabIndex={-1} data-preview-target="gaming-button">{gaming.buttonText || 'Ver gaming'} </button></div>{gaming.imageUrl && <img className={highlightTarget === 'gaming-image' ? 'is-preview-media-focus' : ''} data-preview-target="gaming-image" src={gaming.imageUrl} alt={gaming.imageAlt || 'Imagen de gaming'} />}</section> : <div data-appearance-target="appearance-showGaming" className={`live-preview-empty${appearanceFocus('appearance-showGaming')}`}>Gaming está oculto desde Colores y diseño.</div>}
    {appearance.showBrands ? <div data-appearance-target="appearance-showBrands" className={`preview-brands preview-focus-zone${zoneFocus('brands')}${appearanceFocus('appearance-showBrands')}`}><strong>Marcas oficiales</strong><span>Ejemplo Tech</span><span>Ejemplo Mobile</span><span>Ejemplo Audio</span></div> : <div data-appearance-target="appearance-showBrands" className={`live-preview-empty${appearanceFocus('appearance-showBrands')}`}>Marcas está oculto desde Colores y diseño.</div>}
    {appearance.showMarquee ? <div data-preview-target="band" data-appearance-target="appearance-showMarquee" className={`preview-band preview-focus-zone${zoneFocus('band')}${appearanceFocus('appearance-showMarquee')}`}>{source.band || 'Tu mensaje promocional aparecerá aquí'}</div> : <div data-appearance-target="appearance-showMarquee" className={`live-preview-empty${appearanceFocus('appearance-showMarquee')}`}>La cinta superior y la franja inferior están ocultas desde Colores y diseño.</div>}
    <footer className={`preview-footer preview-focus-zone${zoneFocus('footer')}`}><strong>{source.name || 'Tu tienda'}</strong><span>{source.email || source.phone || 'Datos de contacto'}</span><small>Catálogo · Envíos · Contacto</small></footer>
  </div>
}

function PreviewSocialFloat({ appearance, instagram, highlightWhatsapp, highlightInstagram }) {
  if (!appearance.showInstagram && !appearance.showWhatsapp && !highlightInstagram && !highlightWhatsapp) return null
  return <div className="preview-social-float" aria-label="Redes sociales">
    {appearance.showInstagram && instagram ? <span data-preview-target="contact-instagram" data-appearance-target="appearance-showInstagram" className={`preview-social-btn preview-instagram${highlightInstagram ? ' preview-focus-zone is-preview-focus' : ''}`} aria-label="Instagram"><IconInstagram /></span> : highlightInstagram ? <span data-appearance-target="appearance-showInstagram" className="preview-social-btn preview-social-placeholder preview-focus-zone is-preview-focus" aria-label="Instagram oculto">IG</span> : null}
    {appearance.showWhatsapp ? <span data-preview-target="contact-whatsapp" data-appearance-target="appearance-showWhatsapp" className={`preview-social-btn preview-whatsapp${highlightWhatsapp ? ' preview-focus-zone is-preview-focus' : ''}`} aria-label="WhatsApp">
      <svg viewBox="0 0 32 32" width="16" height="16" fill="currentColor" aria-hidden="true">
        <path d="M16 2C8.3 2 2 8.3 2 16c0 2.5.7 4.8 1.9 6.9L2 30l7.3-1.9c2 .9 4.3 1.9 6.7 1.9 7.7 0 14-6.3 14-14S23.7 2 16 2zm6.9 20.2c-.3.8-1.7 1.6-2.5 1.7-.6.1-1.3.2-4-.8-1.7-.6-3.1-1.6-4.4-2.9-1.3-1.3-2.4-2.8-3-4.6-.6-1.6-.5-3-.3-3.8.2-.8 1-1.7 1.8-1.9.4-.1.7-.1 1 .1.3.1.7.9 1 1.5.3.8.7 1.6.8 1.7.1.1.2.3 0 .6-.1.3-.2.4-.5.7l-.6.6c-.2.2-.4.4-.2.8.2.4.9 1.5 1.9 2.4 1.3 1.2 2.4 1.6 2.8 1.8.3.1.6.1.8-.1.2-.2.9-1 1.1-1.4.2-.4.5-.3.8-.2.3.1 1.8.9 2.1 1 .3.1.5.2.6.4.1.2.1 1-.2 1.8z" />
      </svg>
    </span> : highlightWhatsapp ? <span data-appearance-target="appearance-showWhatsapp" className="preview-social-btn preview-social-placeholder preview-focus-zone is-preview-focus" aria-label="WhatsApp oculto">WA</span> : null}
  </div>
}

function PreviewProductSection({ title, products, appearance, highlight, appearanceTarget, highlightTarget }) {
  const primarySection = appearanceTarget === 'appearance-showOffers'
  return <section data-appearance-target={appearanceTarget} className={`preview-products preview-focus-zone${highlight === 'catalog' ? ' is-preview-focus' : ''}${highlightTarget === appearanceTarget ? ' is-preview-focus' : ''}`}><div className="preview-section-head"><h3>{title}</h3><span>{products.length} productos</span></div><div data-appearance-target={primarySection ? 'appearance-productGrid' : undefined} className={`preview-product-grid${primarySection && highlightTarget === 'appearance-productGrid' ? ' preview-focus-zone is-preview-focus' : ''}`}>{products.map((product, index) => <article key={product.id} data-appearance-target={primarySection && index === 0 ? 'appearance-cardStyle' : undefined} className={`preview-product-card${primarySection && index === 0 && highlightTarget === 'appearance-cardStyle' ? ' is-preview-focus' : ''}`}><div data-appearance-target={primarySection && index === 0 ? 'appearance-imageFit' : undefined} className={`preview-product-image${primarySection && index === 0 && highlightTarget === 'appearance-imageFit' ? ' is-preview-media-focus' : ''}`}><img src={product.image} alt="" /><span>Ejemplo</span></div><small>{product.brand}</small><strong>{product.name}</strong><b>{formatARS(product.price)}</b><button type="button" tabIndex={-1} data-appearance-target={primarySection && index === 0 ? 'appearance-primary' : undefined} className={primarySection && index === 0 && highlightTarget === 'appearance-primary' ? 'is-preview-text-focus' : ''} style={{ background: appearance.primary }}>Agregar</button></article>)}</div></section>
}

function MessagesPreview({ items, appearance, settings }) {
  const visible = normalizeAppearance(appearance).showMarquee
  return <PreviewShell title="Cinta superior" appearance={appearance} highlightTarget="marquee" social={{ instagram: Boolean(settings?.store?.instagram) }}>
    <PreviewStorefront data={{}} settings={settings} items={items} appearance={appearance} highlight="marquee" highlightTarget="marquee" />
    {!visible && <PreviewFocus title="Cinta superior" items={['Está oculta desde Colores y diseño']} />}
    {visible && !items.length && <PreviewFocus title="Cinta superior" items={['Sin mensajes: la cinta quedará oculta']} />}
  </PreviewShell>
}

function ShippingPreview({ data, appearance, settings }) {
  const subtotal = 120000
  const cost = Math.max(0, Number(data.cost) || 0)
  const threshold = Math.max(0, Number(data.freeThreshold) || 0)
  const free = data.enabled && (cost === 0 || (threshold > 0 && subtotal >= threshold))
  const shipping = data.enabled && !free ? cost : 0
  return <PreviewShell title="Carrito de compra" appearance={appearance} social={{ instagram: Boolean(settings?.store?.instagram) }}>
    <PreviewStorefront data={{}} settings={settings} appearance={appearance} />
    <PreviewFocus title="Envíos" items={[data.enabled ? data.label || 'Envío a domicilio' : 'Envío a domicilio desactivado', data.enabled ? `Costo: ${formatARS(cost)}` : 'El carrito no suma envío', data.enabled && threshold > 0 ? `Gratis desde ${formatARS(threshold)}` : 'Sin mínimo configurado']} />
    <div className="live-preview-cart">
      <span className="live-preview-cart-title">Resumen</span>
      <div><span>Productos</span><strong>{formatARS(subtotal)}</strong></div>
      <div><span>{data.enabled ? (data.label || 'Envío a domicilio') : 'Retiro / entrega'}</span><strong>{data.enabled ? (free ? 'Gratis' : formatARS(cost)) : 'Sin envío'}</strong></div>
      <div className="live-preview-total"><span>Total</span><strong>{formatARS(subtotal + shipping)}</strong></div>
      {data.enabled && threshold > subtotal && cost > 0 && <p>Faltan {formatARS(threshold - subtotal)} para tener envío gratis.</p>}
      {free && <p className="is-success">Este pedido tiene envío gratis.</p>}
      {!data.enabled && <p>El carrito no ofrecerá envío a domicilio.</p>}
    </div>
  </PreviewShell>
}

function PreviewFocus({ title, items, highlightTarget }) {
  return <div className="preview-focus"><strong>{title}</strong><div>{items.map((item, index) => {
    const target = typeof item === 'string' ? null : item.target
    const text = typeof item === 'string' ? item : item.text
    return <span key={`${text}-${index}`} data-preview-target={target || undefined} className={target && highlightTarget === target ? 'is-preview-text-focus' : ''}>{text}</span>
  })}</div></div>
}

export default function LiveStorePreview({ variant, data = {}, items = [], settings, appearance, highlight, highlightTarget }) {
  if (variant === 'contact') return <ContactPreview data={data} settings={settings} appearance={appearance} highlight={highlight} highlightTarget={highlightTarget} />
  if (variant === 'content') return <ContentPreview data={data} settings={settings} appearance={appearance} highlight={highlight} highlightTarget={highlightTarget} />
  if (variant === 'messages') return <MessagesPreview items={items} settings={settings} appearance={appearance} />
  return <ShippingPreview data={data} settings={settings} appearance={appearance} />
}

export { PreviewSocialFloat, PreviewStorefront }
