import { formatARS } from '@/data/format'
import { appearanceVariables, normalizeAppearance } from '@/lib/appearance'
import './styles.css'

function PreviewShell({ title, appearance, children }) {
  const theme = normalizeAppearance(appearance)
  return <aside className="live-store-preview" aria-label={`Vista previa: ${title}`}>
    <div className="live-preview-head"><div><span>Vista previa</span><strong>{title}</strong></div><em><i aria-hidden="true" /> En vivo</em></div>
    <div className="live-preview-browser" style={appearanceVariables(theme)}>
      <div className="live-preview-browser-bar" aria-hidden="true"><i /><i /><i /><span>Tu tienda</span></div>
      {children}
    </div>
    <p>Se actualiza mientras editás. Guardá los cambios para publicarlos.</p>
  </aside>
}

function ContactPreview({ data, appearance }) {
  return <PreviewShell title="Cabecera y contacto" appearance={appearance}>
    <div className="live-preview-store-head">
      <div className="live-preview-logo">{data.logoUrl ? <img src={data.logoUrl} alt="" /> : <span>LOGO</span>}</div>
      <div><strong>{data.name || 'Nombre de tu tienda'}</strong><small>{data.tagline || 'Frase corta de tu negocio'}</small></div>
    </div>
    <div className="live-preview-contact">
      <span><small>WhatsApp</small>{data.whatsapp || 'Sin número'}</span><span><small>Teléfono</small>{data.phone || 'Sin teléfono'}</span>
      <span><small>Ubicación</small>{data.addressShort || 'Sin dirección'}</span><span><small>Horarios</small>{data.hours || 'Sin horarios'}</span>
    </div>
    <div className="live-preview-footer"><strong>{data.name || 'Tu tienda'}</strong><span>{data.email || data.phone || 'Datos de contacto'}</span></div>
  </PreviewShell>
}

function ContentPreview({ data, appearance }) {
  const theme = normalizeAppearance(appearance)
  const safeCover = String(data.coverUrl || '').replaceAll('"', '%22')
  const coverStyle = safeCover ? { backgroundImage: `linear-gradient(90deg, rgba(10,12,8,.9), rgba(10,12,8,.3)), url("${safeCover}")` } : undefined
  return <PreviewShell title="Página de inicio" appearance={theme}>
    {theme.showMarquee && <div className="live-preview-marquee"><span>Novedades de tu tienda</span><span>Compra segura</span></div>}
    {!theme.showHero && <div className="live-preview-empty">La portada está oculta desde Colores y diseño.</div>}
    {theme.showHero && <>
    <div className="live-preview-hero" style={coverStyle}>
      <span>Bienvenida</span><h3>{data.heroTitle || 'Título principal'} <em>{data.heroAccent || 'Texto destacado'}</em></h3>
      <p>{data.heroLead || 'Escribí una presentación breve para tu tienda.'}</p><button type="button" tabIndex={-1}>{theme.heroButton}</button>
    </div>
    <div className="live-preview-band">{data.band || 'Tu mensaje promocional aparecerá aquí'}</div>
    </>}
  </PreviewShell>
}

function MessagesPreview({ items, appearance }) {
  const visible = normalizeAppearance(appearance).showMarquee
  return <PreviewShell title="Cinta superior" appearance={appearance}>
    {!visible ? <div className="live-preview-empty">La cinta está oculta desde Colores y diseño.</div> : items.length ? <div className="live-preview-marquee">{items.map((item, index) => <span key={`${item}-${index}`}>{item}</span>)}</div> : <div className="live-preview-empty">La cinta quedará oculta porque no tiene mensajes.</div>}
    <div className="live-preview-store-placeholder"><strong>Tu tienda</strong><span>Los mensajes aparecen arriba de la cabecera.</span></div>
  </PreviewShell>
}

function ShippingPreview({ data, appearance }) {
  const subtotal = 120000
  const cost = Math.max(0, Number(data.cost) || 0)
  const threshold = Math.max(0, Number(data.freeThreshold) || 0)
  const free = data.enabled && (cost === 0 || (threshold > 0 && subtotal >= threshold))
  const shipping = data.enabled && !free ? cost : 0
  return <PreviewShell title="Carrito de compra" appearance={appearance}>
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

export default function LiveStorePreview({ variant, data = {}, items = [], appearance }) {
  if (variant === 'contact') return <ContactPreview data={data} appearance={appearance} />
  if (variant === 'content') return <ContentPreview data={data} appearance={appearance} />
  if (variant === 'messages') return <MessagesPreview items={items} appearance={appearance} />
  return <ShippingPreview data={data} appearance={appearance} />
}
