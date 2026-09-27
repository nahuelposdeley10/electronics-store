import { useEffect, useState } from 'react'
import { apiPut } from '@/lib/api'
import { APPEARANCE_DEFAULTS, normalizeAppearance, appearanceVariables } from '@/lib/appearance'
import { notifySiteSettingsChanged } from '@/lib/siteSettings'
import { useToast } from '@/context/useToast'
import { SettingsFetcher, ToggleRow } from '../common'
import './styles.css'

const COLORS = [['primary', 'Color principal', 'Botones de compra y detalles de marca.'], ['accent', 'Color de destaque', 'Ofertas y título de la portada.'], ['background', 'Fondo de la página', 'Superficie detrás de las secciones.']]
const SECTIONS = [['showHero', 'Portada principal'], ['showOffers', 'Ofertas de la semana'], ['showNewArrivals', 'Recién llegados'], ['showGaming', 'Bloque de gaming'], ['showBrands', 'Marcas'], ['showMarquee', 'Cinta superior'], ['showWhatsapp', 'Botón flotante de WhatsApp']]
const PRESETS = [
  { name: 'Original', primary: '#d7261d', accent: '#ffc61a', background: '#f2f4f3' },
  { name: 'Océano', primary: '#175cd3', accent: '#8ce2df', background: '#eef4fa' },
  { name: 'Bosque', primary: '#236744', accent: '#e2cf89', background: '#f1f5ef' },
  { name: 'Ciruela', primary: '#773b96', accent: '#f3b9d4', background: '#f6f0f8' },
]
const PREVIEW_PRODUCTS = [
  ['Auriculares Bluetooth', '$ 49.990'],
  ['Parlante portátil', '$ 74.900'],
  ['Smartwatch deportivo', '$ 89.990'],
  ['Teclado mecánico', '$ 64.500'],
  ['Cámara Wi-Fi', '$ 92.000'],
]

function ColorField({ label, hint, value, onChange }) {
  const [draft, setDraft] = useState(value)
  const normalizedDraft = draft.startsWith('#') ? draft : `#${draft}`
  const valid = /^#[0-9a-f]{6}$/i.test(normalizedDraft)

  useEffect(() => setDraft(value), [value])

  const changeHex = (event) => {
    const nextDraft = event.target.value.replace(/\s/g, '').slice(0, 7)
    const nextColor = nextDraft.startsWith('#') ? nextDraft : `#${nextDraft}`
    setDraft(nextDraft)
    if (/^#[0-9a-f]{6}$/i.test(nextColor)) onChange(nextColor.toLowerCase())
  }

  return <label className="appearance-color">
    <span><strong>{label}</strong><small>{hint}</small></span>
    <input aria-label={`Elegir ${label.toLowerCase()}`} type="color" value={value} onChange={(event) => onChange(event.target.value)} />
    <input
      className="appearance-hex"
      aria-label={`${label} en hexadecimal`}
      aria-invalid={!valid}
      inputMode="text"
      maxLength={7}
      placeholder="#000000"
      spellCheck="false"
      value={draft}
      onChange={changeHex}
      onBlur={() => { if (!valid) setDraft(value) }}
    />
  </label>
}

function AppearanceEditor({ settings }) {
  const [form, setForm] = useState(() => normalizeAppearance(settings.appearance))
  const [saved, setSaved] = useState(form)
  const [saving, setSaving] = useState(false)
  const { showToast } = useToast()
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const submit = async (event) => {
    event.preventDefault()
    if (!dirty || saving) return
    setSaving(true)
    try {
      const result = await apiPut('/api/admin/settings', { section: 'appearance', value: form })
      const next = normalizeAppearance(result)
      setForm(next)
      setSaved(next)
      notifySiteSettingsChanged()
      showToast('Diseño publicado. Tu tienda ya usa esta personalización.', 'success')
    } catch (error) {
      showToast(error.message, 'error')
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className="dash-screen">
      <header className="dash-head"><div><span className="dash-eyebrow">Tienda online · Solo administradores</span><h1>Colores y diseño</h1></div></header>
      <p className="list-note">Dale identidad a tu web. Probá los cambios en la vista previa y publicalos cuando estés listo. El catálogo siempre queda disponible.</p>
      <div className="appearance-layout">
        <form onSubmit={submit} className="appearance-form">
          <fieldset disabled={saving}>
            <legend>Colores de tu marca</legend>
            <div className="appearance-presets">
              {PRESETS.map(({ name, ...colors }) => <button type="button" key={name} onClick={() => setForm((prev) => ({ ...prev, ...colors }))} aria-pressed={COLORS.every(([key]) => form[key] === colors[key])}>
                <i style={{ background: colors.primary }} aria-hidden="true" />{name}
              </button>)}
            </div>
            {COLORS.map(([key, label, hint]) => <ColorField key={key} label={label} hint={hint} value={form[key]} onChange={(value) => set(key, value)} />)}
          </fieldset>
          <fieldset disabled={saving}>
            <legend>Estilo del catálogo</legend>
            <label className="inv-field"><span>Tipografía de títulos</span><select value={form.headingFont} onChange={(e) => set('headingFont', e.target.value)}><option value="anton">Anton · Impactante</option><option value="bebas">Bebas Neue · Editorial</option><option value="oswald">Oswald · Comercial</option><option value="space">Space Grotesk · Tecnológica</option><option value="archivo">Archivo · Moderna</option><option value="system">Sistema · Simple</option></select></label>
            <div className="appearance-background-options">
              <label className="inv-field"><span>Estilo de las tarjetas</span><select value={form.productCardStyle} onChange={(e) => set('productCardStyle', e.target.value)}><option value="classic">Clásica · Con borde</option><option value="minimal">Limpia · Sin borde</option><option value="elevated">Elevada · Con sombra</option></select></label>
              <label className="inv-field"><span>Productos por fila</span><select value={form.productsPerRow} onChange={(e) => set('productsPerRow', Number(e.target.value))}><option value="3">3 productos · Grandes</option><option value="4">4 productos · Equilibrado</option><option value="5">5 productos · Compactos</option></select></label>
              <label className="inv-field"><span>Separación entre productos</span><select value={form.productSpacing} onChange={(e) => set('productSpacing', e.target.value)}><option value="comfortable">Cómoda</option><option value="compact">Compacta</option></select></label>
            </div>
            <label className="inv-field"><span>Bordes de tarjetas y botones</span><select value={form.corners} onChange={(e) => set('corners', e.target.value)}><option value="classic">Suaves</option><option value="square">Rectos</option><option value="rounded">Redondeados</option></select></label>
            <label className="inv-field"><span>Fotos de productos</span><select value={form.imageFit} onChange={(e) => set('imageFit', e.target.value)}><option value="cover">Llenar el espacio (puede recortar)</option><option value="contain">Mostrar la foto completa</option></select></label>
            <label className="inv-field"><span>Texto del botón de portada</span><input required maxLength={40} value={form.heroButton} onChange={(e) => set('heroButton', e.target.value)} /><small>Siempre lleva al catálogo de productos.</small></label>
          </fieldset>
          <fieldset disabled={saving}>
            <legend>Qué mostrar en la web</legend>
            {SECTIONS.map(([key, label]) => <ToggleRow key={key} label={label} hint={form[key] ? 'Visible en la tienda' : 'Oculto en la tienda'} checked={form[key]} onChange={(on) => set(key, on)} disabled={saving} />)}
          </fieldset>
          <div className="appearance-actions">
            <p role="status">{saving ? 'Publicando…' : dirty ? 'Tenés cambios sin publicar.' : 'El diseño está guardado.'}</p>
            <button className="primary-btn" disabled={!dirty || saving} type="submit">{saving ? 'Publicando…' : 'Publicar diseño'}</button>
            <button className="ghost-btn" disabled={!dirty || saving} type="button" onClick={() => setForm(saved)}>Descartar cambios</button>
            <button className="ghost-btn" disabled={saving} type="button" onClick={() => setForm({ ...APPEARANCE_DEFAULTS })}>Restaurar diseño original</button>
          </div>
          <p className="list-note">El diseño original también requiere publicar. Para cambiar el logo, entrá en Tienda online → Datos y contacto. La imagen de bienvenida y los anuncios están en Portada y mensajes.</p>
        </form>
        <aside className="appearance-preview-wrap" aria-label="Vista previa del diseño">
          <h2>Vista previa</h2><p>Ejemplo de colores, títulos y tarjetas. Los bloques se activan en tu tienda al publicar.</p>
          <div className="appearance-preview" style={appearanceVariables(form)}>
            {form.showMarquee && <div className="appearance-preview-strip">{settings.general?.marquee?.[0] || 'Novedades de tu tienda'}</div>}
            <div className="appearance-preview-brand">{settings.store?.logoUrl && <img src={settings.store.logoUrl} alt="" />}<span>{settings.store?.name || 'Tu tienda'}</span></div>
            {form.showHero && <div className="appearance-preview-hero" style={settings.store?.coverUrl ? { backgroundImage: `linear-gradient(90deg, rgba(10,12,8,.92), rgba(10,12,8,.35)), url(${JSON.stringify(settings.store.coverUrl)})` } : undefined}><h3>{settings.hero?.title || 'Tu próxima compra'} <span>{settings.hero?.titleAccent || 'está acá.'}</span></h3><p>{settings.hero?.lead || settings.store?.tagline || 'Tecnología elegida para vos.'}</p><span className="appearance-preview-button">{form.heroButton}</span></div>}
            {!form.showHero && <div className="appearance-preview-hidden">Portada oculta</div>}
            <div className="appearance-preview-catalog"><div className="appearance-preview-catalog-head"><h3>Catálogo</h3><span>{form.productsPerRow} por fila</span></div><div className="appearance-preview-products">{PREVIEW_PRODUCTS.slice(0, form.productsPerRow).map(([name, price], index) => <div className="appearance-preview-card" key={name}><img className="appearance-preview-photo" src="/images/products/default.svg" alt="" style={{ objectPosition: `${50 + (index - 2) * 4}% center` }} /><strong>{name}</strong><span>{price}</span><span className="appearance-preview-button">Agregar</span></div>)}</div></div>
            <div className="appearance-preview-sections">
              {form.showOffers && <span>Ofertas</span>}{form.showNewArrivals && <span>Recién llegados</span>}{form.showGaming && <span>Gaming</span>}{form.showBrands && <span>Marcas</span>}
              {![form.showOffers, form.showNewArrivals, form.showGaming, form.showBrands].some(Boolean) && <small>Secciones destacadas ocultas</small>}
            </div>
            {form.showWhatsapp && <div className="appearance-preview-whatsapp" title="WhatsApp">WA</div>}
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function AppearanceScreen() {
  return <SettingsFetcher render={(settings) => <AppearanceEditor settings={settings} />} />
}
