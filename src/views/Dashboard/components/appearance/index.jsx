import { useEffect, useRef, useState } from 'react'
import { apiPut } from '@/lib/api'
import { IconCheck, IconCross, IconRefresh } from '@/components/Icons'
import { APPEARANCE_DEFAULTS, normalizeAppearance, appearanceVariables } from '@/lib/appearance'
import { notifySiteSettingsChanged } from '@/lib/siteSettings'
import { useToast } from '@/context/useToast'
import { SettingsFetcher, ToggleRow } from '../common'
import { PreviewSocialFloat, PreviewStorefront } from '../settings/components/LiveStorePreview'
import './styles.css'

const COLORS = [['primary', 'Color principal', 'Botones de compra y detalles de marca.'], ['accent', 'Color de destaque', 'Ofertas y título de la portada.'], ['background', 'Fondo de la página', 'Superficie detrás de las secciones.']]
const SECTIONS = [['showHero', 'Portada principal'], ['showOffers', 'Ofertas de la semana'], ['showNewArrivals', 'Recién llegados'], ['showGaming', 'Bloque de gaming'], ['showBrands', 'Marcas'], ['showMarquee', 'Cinta superior'], ['showWhatsapp', 'Botón flotante de WhatsApp'], ['showInstagram', 'Botón flotante de Instagram']]
const PRESETS = [
  { name: 'Original', primary: '#d7261d', accent: '#ffc61a', background: '#f2f4f3' },
  { name: 'Océano', primary: '#175cd3', accent: '#8ce2df', background: '#eef4fa' },
  { name: 'Bosque', primary: '#236744', accent: '#e2cf89', background: '#f1f5ef' },
  { name: 'Ciruela', primary: '#773b96', accent: '#f3b9d4', background: '#f6f0f8' },
]
function ColorField({ label, hint, value, onChange }) {
  const [draft, setDraft] = useState(value)
  const [previousValue, setPreviousValue] = useState(value)
  if (value !== previousValue) {
    setPreviousValue(value)
    setDraft(value)
  }
  const normalizedDraft = draft.startsWith('#') ? draft : `#${draft}`
  const valid = /^#[0-9a-f]{6}$/i.test(normalizedDraft)

  const changeHex = (event) => {
    const nextDraft = event.target.value.replace(/\s/g, '').slice(0, 7)
    const nextColor = nextDraft.startsWith('#') ? nextDraft : `#${nextDraft}`
    setDraft(nextDraft)
    if (/^#[0-9a-f]{6}$/i.test(nextColor)) onChange(nextColor.toLowerCase())
  }

  return <div className="appearance-color">
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
  </div>
}

function AppearanceEditor({ settings }) {
  const [form, setForm] = useState(() => normalizeAppearance(settings.appearance))
  const [saved, setSaved] = useState(form)
  const [saving, setSaving] = useState(false)
  const [previewFocus, setPreviewFocus] = useState('hero')
  const [previewTarget, setPreviewTarget] = useState('appearance-showHero')
  const previewRef = useRef(null)
  const { showToast } = useToast()
  const dirty = JSON.stringify(form) !== JSON.stringify(saved)
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))
  const focusPreview = (target, zone = 'appearance') => {
    setPreviewFocus(zone)
    setPreviewTarget(target)
  }

  useEffect(() => {
    if (!previewTarget || !previewRef.current) return
    const target = previewRef.current.querySelector(`[data-appearance-target="${previewTarget}"]`)
    if (!target) return
    requestAnimationFrame(() => target.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' }))
  }, [previewTarget])
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
              {PRESETS.map(({ name, ...colors }) => <button type="button" key={name} onClick={() => { setForm((prev) => ({ ...prev, ...colors })); focusPreview('appearance-primary') }} aria-pressed={COLORS.every(([key]) => form[key] === colors[key])}>
                <i style={{ background: colors.primary }} aria-hidden="true" />{name}
              </button>)}
            </div>
            {COLORS.map(([key, label, hint]) => <div key={key} onFocusCapture={() => focusPreview(`appearance-${key}`)}><ColorField label={label} hint={hint} value={form[key]} onChange={(value) => set(key, value)} /></div>)}
          </fieldset>
          <fieldset disabled={saving}>
            <legend>Estilo del catálogo</legend>
            <div>
              <label className="inv-field" onFocusCapture={() => focusPreview('appearance-headingFont')}><span>Tipografía de títulos</span><select value={form.headingFont} onChange={(e) => set('headingFont', e.target.value)}><option value="anton">Anton · Impactante</option><option value="bebas">Bebas Neue · Editorial</option><option value="oswald">Oswald · Comercial</option><option value="space">Space Grotesk · Tecnológica</option><option value="archivo">Archivo · Moderna</option><option value="system">Sistema · Simple</option></select></label>
              <div className="appearance-background-options">
                <label className="inv-field" onFocusCapture={() => focusPreview('appearance-cardStyle')}><span>Estilo de las tarjetas</span><select value={form.productCardStyle} onChange={(e) => set('productCardStyle', e.target.value)}><option value="classic">Clásica · Con borde</option><option value="minimal">Limpia · Sin borde</option><option value="elevated">Elevada · Con sombra</option></select></label>
                <label className="inv-field" onFocusCapture={() => focusPreview('appearance-productGrid')}><span>Productos por fila</span><select value={form.productsPerRow} onChange={(e) => set('productsPerRow', Number(e.target.value))}><option value="3">3 productos · Grandes</option><option value="4">4 productos · Equilibrado</option><option value="5">5 productos · Compactos</option></select></label>
                <label className="inv-field" onFocusCapture={() => focusPreview('appearance-productGrid')}><span>Separación entre productos</span><select value={form.productSpacing} onChange={(e) => set('productSpacing', e.target.value)}><option value="comfortable">Cómoda</option><option value="compact">Compacta</option></select></label>
              </div>
            </div>
            <div>
              <label className="inv-field" onFocusCapture={() => focusPreview('appearance-cardStyle')}><span>Bordes de tarjetas y botones</span><select value={form.corners} onChange={(e) => set('corners', e.target.value)}><option value="classic">Suaves</option><option value="square">Rectos</option><option value="rounded">Redondeados</option></select></label>
              <label className="inv-field" onFocusCapture={() => focusPreview('appearance-imageFit')}><span>Fotos de productos</span><select value={form.imageFit} onChange={(e) => set('imageFit', e.target.value)}><option value="cover">Llenar el espacio (puede recortar)</option><option value="contain">Mostrar la foto completa</option></select></label>
              <label className="inv-field" onFocusCapture={() => focusPreview('appearance-heroButton')}><span>Texto del botón de portada</span><input required maxLength={40} value={form.heroButton} onChange={(e) => set('heroButton', e.target.value)} /><small>Siempre lleva al catálogo de productos.</small></label>
            </div>
          </fieldset>
          <fieldset disabled={saving}>
            <legend>Qué mostrar en la web</legend>
            <div>
              {SECTIONS.map(([key, label]) => <ToggleRow key={key} label={label} hint={form[key] ? 'Visible en la tienda' : 'Oculto en la tienda'} checked={form[key]} onChange={(on) => set(key, on)} onFocus={() => focusPreview(`appearance-${key}`)} disabled={saving} />)}
            </div>
          </fieldset>
          <div className="appearance-actions">
            <p role="status">{saving ? 'Publicando…' : dirty ? 'Tenés cambios sin publicar.' : 'El diseño está guardado.'}</p>
            <button className="primary-btn" disabled={!dirty || saving} type="submit"><IconCheck /> {saving ? 'Publicando…' : 'Publicar diseño'}</button>
            <button className="ghost-btn" disabled={!dirty || saving} type="button" onClick={() => setForm(saved)}><IconCross /> Descartar cambios</button>
            <button className="ghost-btn" disabled={saving} type="button" onClick={() => setForm({ ...APPEARANCE_DEFAULTS })}><IconRefresh /> Restaurar diseño original</button>
          </div>
          <p className="list-note">El diseño original también requiere publicar. Para cambiar el logo, entrá en Tienda online → Datos y contacto. La imagen de bienvenida y los anuncios están en Portada y mensajes.</p>
        </form>
        <aside className="appearance-preview-wrap" aria-label="Vista previa del diseño">
          <h2>Vista previa</h2><p>Ejemplo de colores, títulos y tarjetas. Los bloques se activan en tu tienda al publicar.</p>
          <div ref={previewRef} className="appearance-preview" style={appearanceVariables(form)}>
            <PreviewStorefront
              appearance={form}
              settings={settings}
              data={{
                ...settings.store,
                heroTitle: settings.hero?.title,
                heroAccent: settings.hero?.titleAccent,
                heroLead: settings.hero?.lead,
                gaming: settings.gaming,
              }}
              items={settings.general?.marquee || []}
              highlight={previewFocus}
              highlightTarget={previewTarget}
            />
            <PreviewSocialFloat
              appearance={form}
              instagram={Boolean(settings.store?.instagram)}
              highlightWhatsapp={previewTarget === 'appearance-showWhatsapp'}
              highlightInstagram={previewTarget === 'appearance-showInstagram'}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

export default function AppearanceScreen() {
  return <SettingsFetcher render={(settings) => <AppearanceEditor settings={settings} />} />
}
