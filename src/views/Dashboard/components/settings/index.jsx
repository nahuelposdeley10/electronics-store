import { useState } from 'react'
import { apiPut, apiUpload, getSession } from '@/lib/api'
import { getSuperTenant } from '@/lib/tenant'
import { IconArrow, IconCross, IconEdit, IconPlus } from '@/components/Icons'
import mercadoPagoLogo from '@/assets/mercado-pago-logo.png'
import { useToast } from '@/context/useToast'
import { useConfirm } from '@/context/useConfirm'
import { SetImageField, SettingsFetcher, ToggleRow } from '../common'
import LiveStorePreview from './components/LiveStorePreview'

import { GAMING_DEFAULTS } from '@/lib/gaming'
import { notifySiteSettingsChanged } from '@/lib/siteSettings'

import './styles.css'

function PasswordInput({ label, value, onChange, ...rest }) {
  const [show, setShow] = useState(false)
  return (
    <label className="inv-field">
      <span>{label}</span>
      <div style={{ display: 'flex', gap: 4 }}>
        <input type={show ? 'text' : 'password'} value={value} onChange={onChange} {...rest} />
        <button type="button" className="nav-link" onClick={() => setShow(!show)} title={show ? 'Ocultar' : 'Mostrar'}>
          {show ? 'Ocultar' : 'Mostrar'}
        </button>
      </div>
    </label>
  )
}

function PaymentsScreen() {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const saveAll = async (methods, mercadopago, checkout, online) => {
    setSaving(true)
    try {
      await apiPut('/api/admin/settings', { section: 'payments', value: { methods, mercadopago, online } })
      await apiPut('/api/admin/settings', { section: 'checkout', value: checkout })
      notifySiteSettingsChanged()
      showToast('Medios de pago guardados.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <PaymentsScreenBody settings={settings} saving={saving} onSave={saveAll} />
      )}
    />
  )
}


function PaymentsScreenBody({ settings, saving, onSave }) {
  const { showToast } = useToast()
  const methods = settings.payments?.methods || { efectivo: true, tarjeta: true, transferencia: true }
  const mp = settings.payments?.mercadopago || {}
  const mpConfigured = Boolean(mp.accessToken && mp.webhookSecret)
  const online = settings.payments?.online !== false
  const checkout = settings.checkout || {}
  const session = typeof getSession === 'function' ? getSession() : { user: {} }
  const user = session?.user || {}
  const adminId =
    user.adminId || (user.role === 'superadmin' ? getSuperTenant() : user.id) || ''
  const webhookUrl = adminId
    ? `${window.location.origin}/api/webhooks/mercadopago?tenant=${adminId}`
    : ''
  const [form, setForm] = useState({
    online,
    efectivo: methods.efectivo !== false,
    tarjeta: methods.tarjeta !== false,
    transferencia: methods.transferencia !== false,
    statementDescriptor: checkout.statementDescriptor || 'TechStore',
    accessToken: mp.accessToken || '',
    publicKey: mp.publicKey || '',
    webhookSecret: mp.webhookSecret || '',
  })

  const [loadedForm] = useState(form)
  const toPayload = (f) => ({
    efectivo: f.efectivo !== false,
    tarjeta: f.tarjeta !== false,
    transferencia: f.transferencia !== false,
    statementDescriptor: f.statementDescriptor.trim() || 'TechStore',
    accessToken: f.accessToken.trim() || null,
    publicKey: f.publicKey.trim() || null,
    webhookSecret: f.webhookSecret.trim() || null,
    online: f.online,
  })
  const dirty = JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(loadedForm))

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const copyWebhook = () => {
    if (!webhookUrl) return
    navigator.clipboard?.writeText(webhookUrl).then(() => {
      showToast('URL del webhook copiada. Pegala en el panel de webhooks de MP con el evento "mercado_pago/payment".', 'success')
    })
  }

  const submit = (e) => {
    e.preventDefault()
    if (!dirty) return
    onSave(
      {
        efectivo: form.efectivo,
        tarjeta: form.tarjeta,
        transferencia: form.transferencia,
      },
      {
        accessToken: form.accessToken.trim() || null,
        publicKey: form.publicKey.trim() || null,
        webhookSecret: form.webhookSecret.trim() || null,
      },
      { statementDescriptor: form.statementDescriptor.trim() || 'TechStore' },
      form.online,
    )
  }

  const toggle = (key) => (on) => setForm((f) => ({ ...f, [key]: on }))

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Administración</span>
          <h1>Medios de pago</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Cada tienda usa su propia cuenta de Mercado Pago. La web cobra con MP y la webhook URL es única por negocio.
        </p>
      </div>

      <div className="set-card mp-status-card">
        <span className="mp-status-icon"><img src={mercadoPagoLogo} alt="Mercado Pago" /></span>
        <div>
        <strong>Estado de Mercado Pago</strong>
{!online ? (
        <p className="settings-warn">
          Pagos online desactivados por el súper admin — esta web usa "Pedir por WhatsApp".
          Podés dejar cargadas las credenciales igual: quedan guardadas para cuando se reactiven.
        </p>
      ) : mpConfigured ? (
        <p className="settings-ok">Configurado y activo</p>
      ) : (
        <p className="settings-warn">Pendiente de configurar — sin credenciales esta tienda no puede cobrar online.</p>
      )}
        </div>
      </div>

      <section className="mp-credentials-guide" aria-labelledby="mp-credentials-guide-title">
        <div className="mp-credentials-guide-head">
          <span className="mp-credentials-guide-icon"><img src={mercadoPagoLogo} alt="Mercado Pago" /></span>
          <div>
            <span className="dash-eyebrow">Antes de completar los campos</span>
            <h2 id="mp-credentials-guide-title">¿Dónde encuentro los datos de Mercado Pago?</h2>
            <p>Abrí tu aplicación en Mercado Pago Developers y copiá únicamente las credenciales de producción de tu propia cuenta.</p>
          </div>
        </div>
        <div className="mp-credentials-guide-steps">
          <div><b>1</b><span><strong>Access Token y Public Key</strong><small>Tu aplicación → Credenciales de producción. El Access Token empieza con <code>APP_USR-</code>.</small></span></div>
          <div><b>2</b><span><strong>Webhook Secret</strong><small>Tu aplicación → Webhooks → Configurar notificación → revelar clave secreta.</small></span></div>
        </div>
        <div className="mp-credentials-guide-actions">
          <a className="primary-btn" href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" rel="noopener noreferrer"><img src={mercadoPagoLogo} alt="" /> Abrir mis credenciales</a>
          <a className="ghost-btn" href="https://www.mercadopago.com.ar/developers/es/docs/links-and-debts/additional-content/your-integrations/notifications/webhooks?scope=prod" target="_blank" rel="noopener noreferrer">Ver guía de Webhooks <IconArrow /></a>
        </div>
        <p className="mp-credentials-safety">No compartas estas claves por mensajes ni las pegues en la tienda pública. Se guardan únicamente para procesar tus cobros.</p>
      </section>

      <form className="set-card set-form" onSubmit={submit}>
        {!online && (
          <p className="set-hint mp-paused-note">
            <strong>Pagos online apagados por el súper admin.</strong> Mientras tanto la web
            pide el pedido por <strong>WhatsApp</strong> usando el número de{" "}
            <em>Tienda online → Datos y contacto</em>. Igual podés cargar o editar estas credenciales: se
            guardan y quedan listas para cuando se vuelvan a activar los pagos online.
          </p>
        )}

        <h3>Webhook de Mercado Pago</h3>
        <p className="set-hint">
          En el panel de Mercado Pago, configurá la URL de notificación que copias abajo y elegí el evento{" "}
          <code>mercado_pago/payment</code>.
        </p>
        <div className="set-row">
          <label className="inv-field set-grow">
            <span>URL de webhook (solo leer)</span>
            <input value={webhookUrl} readOnly />
          </label>
          <button type="button" className="primary-btn" onClick={copyWebhook} disabled={!webhookUrl}>
            Copiar URL
          </button>
        </div>
        {mpConfigured && (
          <p className="set-hint">
            Verificá que la firma sea válida en <code>/api/webhooks/mercadopago</code> con tu <code>webhook secret</code>.
          </p>
        )}

        <h3>En la caja (panel)</h3>
        <div className="set-toggles">
          <ToggleRow label="Efectivo" hint="Pago en el local" checked={form.efectivo} onChange={toggle('efectivo')} />
          <ToggleRow label="Tarjeta" hint="Tarjeta de débito o crédito" checked={form.tarjeta} onChange={toggle('tarjeta')} />
          <ToggleRow label="Transferencia" hint="Transferencia bancaria" checked={form.transferencia} onChange={toggle('transferencia')} />
        </div>

        <h3>Credenciales de tu cuenta de Mercado Pago</h3>
        <div className="set-row">
          <PasswordInput
            label="Access Token (APP_USR-...)"
            value={form.accessToken}
            onChange={set('accessToken')}
            maxLength={300}
          />
          <PasswordInput
            label="Webhook Secret (desde el panel de MP)"
            value={form.webhookSecret}
            onChange={set('webhookSecret')}
            maxLength={300}
            placeholder="Pegá acá el secreto que te muestra Mercado Pago"
          />
        </div>
        <label className="inv-field">
          <span>Public Key (opcional)</span>
          <input value={form.publicKey} onChange={set('publicKey')} maxLength={300} />
        </label>
        <p className="set-hint">
          El Webhook Secret lo genera Mercado Pago, no esta app: entrá al panel de MP →{' '}
          <em>Configuraciones para tus cobros → Webhooks</em>, abrí tu webhook, copiá el{' '}
          <em>Secret</em> que te muestra y pegalo acá. Si la firma no verifica, es porque el
          secreto no coincide con el del webhook de esa tienda. Se guarda solo en la base de
          datos de esta tienda.
        </p>

        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving || !dirty}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}


function StoreScreen({ mode = 'business' }) {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const save = async (store, hero, gaming, general) => {
    setSaving(true)
    try {
      await apiPut('/api/admin/settings', { section: 'store', value: store })
      if (hero) await apiPut('/api/admin/settings', { section: 'hero', value: hero })
      if (gaming) await apiPut('/api/admin/settings', { section: 'gaming', value: gaming })
      if (general) await apiPut('/api/admin/settings', { section: 'general', value: general })
      notifySiteSettingsChanged()
      showToast(mode === 'content' ? 'Portada y textos guardados.' : 'Datos y contacto guardados.', 'success')
      return true
    } catch (err) {
      showToast(err.message, 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <StoreScreenBody key={mode} mode={mode} settings={settings} saving={saving} onSave={save} />
      )}
    />
  )
}


function StoreScreenBody({ settings, saving, onSave, mode = 'business' }) {
  const content = mode === 'content'
  const { showToast } = useToast()
  const store = settings.store || {}
  const hero = settings.hero || {}
  const general = settings.general || {}
  const { confirm } = useConfirm()
  const [form, setForm] = useState({
    name: store.name || '',
    tagline: store.tagline || '',
    logoUrl: store.logoUrl || '',
    coverUrl: store.coverUrl || '',
    phone: store.phone || '',
    whatsapp: store.whatsapp || '',
    instagram: store.instagram || '',
    email: store.email || '',
    addressFull: store.addressFull || '',
    addressShort: store.addressShort || '',
    hours: store.hours || '',
    band: store.band || '',
    heroTitle: hero.title || '',
    heroAccent: hero.titleAccent || '',
    heroLead: hero.lead || '',
    gaming: { ...GAMING_DEFAULTS, ...settings.gaming },
  })
  const [marquee, setMarquee] = useState(
    (Array.isArray(general.marquee) ? general.marquee : []).filter(Boolean),
  )
  const [counters, setCounters] = useState(
    (Array.isArray(general.headerCounters) && general.headerCounters.length === 4
      ? general.headerCounters
      : [
        { title: 'Cuotas', text: 'hasta 12 sin interés' },
        { title: 'Envío', text: 'a domicilio' },
        { title: 'Garantía', text: 'oficial' },
        { title: 'Retiro', text: 'en el local' },
      ]).map((counter) => ({ title: counter.title || '', text: counter.text || '' })),
  )
  const [loadedForm, setLoadedForm] = useState(form)
  const [loadedMarquee, setLoadedMarquee] = useState(marquee)
  const [loadedCounters, setLoadedCounters] = useState(counters)
  const [marqueeInput, setMarqueeInput] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [draft, setDraft] = useState('')
  const [previewFocus, setPreviewFocus] = useState(content ? 'marquee' : 'contact')
  const [previewTarget, setPreviewTarget] = useState(content ? 'marquee' : 'contact')
  const [uploading, setUploading] = useState(null)

  const toPayload = (f) => ({
    name: f.name.trim(),
    tagline: f.tagline.trim(),
    logoUrl: f.logoUrl,
    coverUrl: f.coverUrl,
    phone: f.phone.trim(),
    whatsapp: f.whatsapp.trim(),
    email: f.email.trim(),
    addressFull: f.addressFull.trim(),
    addressShort: f.addressShort.trim(),
    hours: f.hours.trim(),
    band: f.band.trim(),
    heroTitle: f.heroTitle.trim(),
    heroAccent: f.heroAccent.trim(),
    heroLead: f.heroLead.trim(),
    gaming: f.gaming,
  })
  const dirty = JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(loadedForm))
    || (content && JSON.stringify(marquee) !== JSON.stringify(loadedMarquee))
    || (content && JSON.stringify(counters) !== JSON.stringify(loadedCounters))

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const addMarquee = () => {
    const text = marqueeInput.trim()
    if (!text) return
    setMarquee((prev) => [...prev, text])
    setMarqueeInput('')
  }

  const removeMarquee = async (index) => {
    const ok = await confirm({
      title: 'Quitar mensaje',
      message: '¿Eliminar este mensaje de la cinta superior?',
      confirmLabel: 'Quitar',
    })
    if (ok) setMarquee((prev) => prev.filter((_, i) => i !== index))
  }

  const startEdit = (index) => {
    setEditingIndex(index)
    setDraft(marquee[index])
  }

  const saveEdit = (index) => {
    const text = draft.trim()
    if (text) setMarquee((prev) => prev.map((item, i) => (i === index ? text : item)))
    setEditingIndex(null)
    setDraft('')
  }

  const clearMarquee = async () => {
    if (!marquee.length) return
    const ok = await confirm({
      title: 'Vaciar cinta',
      message: '¿Quitar todos los mensajes de la cinta superior?',
      confirmLabel: 'Vaciar cinta',
    })
    if (ok) setMarquee([])
  }

  const uploadImage = async (which, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(which)
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('field', which)
      const res = await apiUpload('/api/admin/settings/media', fd)
      setForm((f) => which === 'gaming' ? { ...f, gaming: { ...f.gaming, imageUrl: res.gaming } } : { ...f, [`${which}Url`]: res[which] })
      showToast(
        which === 'gaming' ? 'Imagen cargada. Guardá los cambios para publicarla.' : `${which === 'logo' ? 'Logo' : 'Portada'} publicado en tu tienda.`,
        'success',
      )
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setUploading(null)
    }
  }

  const removeImage = (which) => {
    setForm((f) => ({ ...f, [`${which}Url`]: '' }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!dirty || saving || uploading) return
    const fields = content
      ? ['coverUrl', 'band']
      : ['name', 'tagline', 'logoUrl', 'phone', 'whatsapp', 'instagram', 'email', 'addressFull', 'addressShort', 'hours']
    const saved = await onSave(
      { ...store, ...Object.fromEntries(fields.map((key) => [key, form[key].trim()])) },
      content ? {
        ...hero,
        title: form.heroTitle.trim(),
        titleAccent: form.heroAccent.trim(),
        lead: form.heroLead.trim(),
      } : null,
      content ? form.gaming : null,
      content ? { ...general, marquee: marquee.filter(Boolean), headerCounters: counters } : null,
    )
    if (saved) {
      setLoadedForm(form)
      setLoadedMarquee(marquee)
      setLoadedCounters(counters)
    }
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Tienda online</span>
          <h1>{content ? 'Portada y mensajes' : 'Datos y contacto'}</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          {content ? 'Elegí la imagen de bienvenida y escribí los mensajes que ven tus clientes. Para cambiar colores u ocultar secciones, entrá en Tienda online → Colores y diseño.' : 'Presentá tu negocio y ayudá a tus clientes a contactarte. Estos datos aparecen en la cabecera, el pie de página, el mapa, WhatsApp e Instagram.'}
        </p>
      </div>

      <div className="settings-live-layout">
      <form className="set-card set-form" onSubmit={submit}>
        {content && <section onFocusCapture={() => { setPreviewFocus('marquee'); setPreviewTarget('marquee') }}>
        <h3>Mensajes de la cinta superior</h3>
        <p className="set-hint">Aparecen arriba de todo en la tienda. Podés agregar varios y se muestran en el mismo orden.</p>
        <div className="set-list">
          {marquee.map((item, index) => editingIndex === index ? (
            <div key={`edit-${index}`} className="set-inline-add">
              <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); saveEdit(index) }
                if (e.key === 'Escape') setEditingIndex(null)
              }} autoFocus placeholder="Mensaje…" />
              <button type="button" className="ghost-btn" onClick={() => saveEdit(index)}>Aplicar edición</button>
              <button type="button" className="ghost-btn" onClick={() => setEditingIndex(null)}>Cancelar</button>
            </div>
          ) : (
            <div key={`${item}-${index}`} className="set-chip">
              <span>{item}</span>
              <button type="button" className="x-btn" title="Editar este mensaje" aria-label={`Editar ${item}`} onClick={() => startEdit(index)}><IconEdit /></button>
              <button type="button" className="x-btn" title="Quitar este mensaje" aria-label={`Quitar ${item}`} onClick={() => removeMarquee(index)}><IconCross /></button>
            </div>
          ))}
          {!marquee.length && <p className="set-empty">Sin mensajes. La cinta queda oculta.</p>}
        </div>
        <div className="set-inline-add">
          <input aria-label="Nuevo mensaje de la cinta" value={marqueeInput} onChange={(e) => setMarqueeInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMarquee() } }} placeholder="Ej.: Retirá gratis en nuestro local" />
          <button type="button" className="ghost-btn" onClick={addMarquee} disabled={!marqueeInput.trim()}><IconPlus />Agregar</button>
          {marquee.length > 0 && <button type="button" className="ghost-btn" onClick={clearMarquee}>Vaciar cinta</button>}
        </div>
        {editingIndex !== null && <p className="set-hint">Aplicá o cancelá la edición antes de guardar.</p>}
        </section>}

        {content && <section onFocusCapture={() => setPreviewFocus('brand')}>
        <h3>Indicadores de la cabecera</h3>
        <p className="set-hint">Estos cuatro mensajes aparecen debajo de la cabecera: cuotas, envío, garantía y retiro.</p>
        <div className="set-row">
          {counters.map((counter, index) => (
            <div className="set-counter-editor" key={`counter-${index}`}>
              <label className="inv-field">
                <span>Título {index + 1}</span>
                <input value={counter.title} onFocus={() => { setPreviewFocus('brand'); setPreviewTarget(`counter-${index}`) }} onChange={(e) => setCounters((prev) => prev.map((item, i) => (i === index ? { ...item, title: e.target.value } : item)))} maxLength={40} />
              </label>
              <label className="inv-field">
                <span>Texto {index + 1}</span>
                <input value={counter.text} onFocus={() => { setPreviewFocus('brand'); setPreviewTarget(`counter-${index}`) }} onChange={(e) => setCounters((prev) => prev.map((item, i) => (i === index ? { ...item, text: e.target.value } : item)))} maxLength={80} />
              </label>
            </div>
          ))}
        </div>
        </section>}

        <section onFocusCapture={() => { setPreviewFocus(content ? 'hero' : 'contact'); setPreviewTarget(content ? 'hero-image' : 'contact') }}>
        <h3>{content ? 'Imagen de portada' : 'Logo del negocio'}</h3>
        <p className="set-hint">La vista previa muestra la imagen completa. Las imágenes se publican al subirlas; para quitarlas o cambiar los textos, guardá los cambios al final.</p>
        <div className={`set-contact-top-grid${content ? ' is-content' : ''}`}>
        <div className="set-row set-images">
          {!content && <SetImageField
            label="Logo"
            hint="Aparece en la cabecera y al pie de tu tienda. Recomendamos PNG con fondo transparente."
            value={form.logoUrl}
            uploading={uploading === 'logo'}
            onFile={(e) => uploadImage('logo', e)}
            onRemove={() => removeImage('logo')}
            onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-logo') }}
          />}
          {content && <SetImageField
            label="Portada"
            hint="Imagen de fondo de la bienvenida. Si la quitás, la portada se muestra solo con texto."
            value={form.coverUrl}
            uploading={uploading === 'cover'}
            onFile={(e) => uploadImage('cover', e)}
            onRemove={() => removeImage('cover')}
            wide
          />}
        </div>
        {!content && <div className="set-contact-identity-block">
        <h3>Identidad</h3>
        <div className="set-row set-contact-identity">
          <label className="inv-field">
            <span>Nombre de la tienda</span>
            <input value={form.name} onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-name') }} onChange={set('name')} required minLength={2} />
          </label>
          <label className="inv-field">
            <span>Frase corta (bajo el logo)</span>
            <input value={form.tagline} onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-tagline') }} onChange={set('tagline')} />
          </label>
        </div>

        </div>}
        </div>
        </section>

        {!content && <>
        <section onFocusCapture={() => setPreviewFocus('contact')}>
        <h3>Contacto</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>Teléfono fijo</span>
            <input value={form.phone} onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-phone') }} onChange={set('phone')} placeholder="11 5555 4294" />
          </label>
          <label className="inv-field">
            <span>WhatsApp (sin + ni espacios)</span>
            <input value={form.whatsapp} onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-whatsapp') }} onChange={set('whatsapp')} placeholder="5491155554294" />
          </label>
          <label className="inv-field">
            <span>Instagram</span>
            <input value={form.instagram} onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-instagram') }} onChange={set('instagram')} placeholder="https://instagram.com/tu-negocio" inputMode="url" />
            <small className="set-hint">Se muestra como enlace en el pie de tu tienda.</small>
          </label>
          <label className="inv-field">
            <span>Email</span>
            <input type="email" value={form.email} onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-email') }} onChange={set('email')} />
          </label>
        </div>
        </section>

        <section onFocusCapture={() => setPreviewFocus('contact')}>
        <h3>Ubicación y horarios</h3>
        <div className="set-row">
          <label className="inv-field set-grow">
            <span>Dirección completa (para el mapa)</span>
            <input value={form.addressFull} onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-address-full') }} onChange={set('addressFull')} />
          </label>
          <label className="inv-field">
            <span>Dirección corta (marcas de la tienda)</span>
            <input value={form.addressShort} onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-address-short') }} onChange={set('addressShort')} />
          </label>
        </div>
        <label className="inv-field">
          <span>Horarios de atención</span>
          <input value={form.hours} onFocus={() => { setPreviewFocus('contact'); setPreviewTarget('contact-hours') }} onChange={set('hours')} />
        </label>
        </section>
        </>}

        {content && <section onFocusCapture={() => { setPreviewFocus('hero'); setPreviewTarget('hero') }}>
        <h3>Bienvenida de la página de inicio</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>Título principal</span>
            <input value={form.heroTitle} onFocus={() => setPreviewTarget('hero-title')} onChange={set('heroTitle')} maxLength={160} />
          </label>
          <label className="inv-field">
            <span>Parte destacada del título</span>
            <input value={form.heroAccent} onFocus={() => setPreviewTarget('hero-accent')} onChange={set('heroAccent')} maxLength={160} />
          </label>
        </div>
        <label className="inv-field">
          <span>Texto de presentación</span>
          <textarea value={form.heroLead} onFocus={() => setPreviewTarget('hero-lead')} onChange={set('heroLead')} rows={3} maxLength={300} />
        </label>
        <p className="set-hint">
          Este texto aparece en la portada. Podés usar{' '}
          <code>{'{cuotas}'}</code> (máx. cuotas sin interés) y <code>{'{ciudad}'}</code>{' '}
          (dirección corta) dentro del texto.
        </p>

        </section>}
        {content && <section onFocusCapture={() => { setPreviewFocus('gaming'); setPreviewTarget('gaming') }}>
        <h3>Sección GAMING · Sala 04</h3>
        <p className="set-hint">Editá el bloque destacado de gaming del inicio. Podés mostrarlo u ocultarlo desde Colores y diseño. El botón lleva a las ofertas.</p>
        {[
          ['kicker', 'Etiqueta superior'], ['title', 'Título'],
          ['description', 'Descripción'], ['buttonText', 'Texto del botón'],
          ['imageAlt', 'Descripción de la imagen'],
        ].map(([key, label]) => (
          <label className="inv-field" key={key}>
            <span>{label}</span>
            <input value={form.gaming[key]} maxLength={300} onFocus={() => setPreviewTarget(`gaming-${key === 'buttonText' ? 'button' : key === 'imageAlt' ? 'image' : key}`)} onChange={(e) => setForm((f) => ({ ...f, gaming: { ...f.gaming, [key]: e.target.value } }))} />
          </label>
        ))}
        <SetImageField
          label="Imagen de gaming"
          hint="Subí una imagen y guardá los cambios para publicarla en este bloque."
          value={form.gaming.imageUrl}
          uploading={uploading === 'gaming'}
          onFile={(e) => uploadImage('gaming', e)}
          onRemove={() => setForm((f) => ({ ...f, gaming: { ...f.gaming, imageUrl: '' } }))}
          wide
        />

        </section>}
        {content && <section onFocusCapture={() => { setPreviewFocus('band'); setPreviewTarget('band') }}>
        <h3>Franja del pie de página</h3>
        <label className="inv-field">
          <span>Texto promocional</span>
          <textarea value={form.band} onFocus={() => setPreviewTarget('band')} onChange={set('band')} rows={2} />
        </label>
        </section>}

        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving || uploading !== null || !dirty}>
            {saving ? 'Guardando...' : content ? 'Guardar portada y textos' : 'Guardar datos y contacto'}
          </button>
        </div>
      </form>
      <LiveStorePreview variant={content ? 'content' : 'contact'} data={{ ...form, marquee, counters }} settings={{ ...settings, general: { ...settings.general, headerCounters: counters } }} appearance={settings.appearance} highlight={previewFocus} highlightTarget={previewTarget} />
      </div>
    </div>
  )
}


function GeneralScreen() {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const save = async (shipping) => {
    setSaving(true)
    try {
      await apiPut('/api/admin/settings', { section: 'shipping', value: shipping })
      showToast('Envíos guardados.', 'success')
      return true
    } catch (err) {
      showToast(err.message, 'error')
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <GeneralScreenBody settings={settings} saving={saving} onSave={save} />
      )}
    />
  )
}


function GeneralScreenBody({ settings, saving, onSave, mode = 'shipping' }) {
  const messages = mode === 'messages'
  const { confirm } = useConfirm()
  const shipping = settings.shipping || {}
  const general = settings.general || {}
  const [form, setForm] = useState({
    enabled: shipping.enabled !== false,
    cost: String(shipping.cost ?? 5999),
    freeThreshold: String(shipping.freeThreshold ?? 300000),
    label: shipping.label || 'Envío a domicilio',
  })
  const [marquee, setMarquee] = useState(
    (Array.isArray(general.marquee) ? general.marquee : []).filter(Boolean),
  )
  const [loadedForm, setLoadedForm] = useState(form)
  const [loadedMarquee, setLoadedMarquee] = useState(marquee)
  const [marqueeInput, setMarqueeInput] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [draft, setDraft] = useState('')
  const [previewFocus, setPreviewFocus] = useState(messages ? 'marquee' : 'shipping')

  const toPayload = (f, m) => ({
    enabled: f.enabled !== false,
    cost: Math.max(0, Number(f.cost) || 0),
    freeThreshold: Math.max(0, Number(f.freeThreshold) || 0),
    label: f.label.trim() || 'Envío a domicilio',
    marquee: m.filter(Boolean),
  })
  const dirty = JSON.stringify(toPayload(form, marquee)) !== JSON.stringify(toPayload(loadedForm, loadedMarquee))

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const addMarquee = () => {
    const text = marqueeInput.trim()
    if (!text) return
    setMarquee((prev) => [...prev, text])
    setMarqueeInput('')
  }

  const removeMarquee = async (index) => {
    const ok = await confirm({
      title: 'Quitar mensaje',
      message: '¿Eliminar este mensaje de la cinta superior?',
      confirmLabel: 'Quitar',
    })
    if (ok) setMarquee((prev) => prev.filter((_, i) => i !== index))
  }

  const startEdit = (index) => {
    setEditingIndex(index)
    setDraft(marquee[index])
  }

  const saveEdit = (index) => {
    const text = draft.trim()
    if (text) {
      setMarquee((prev) => prev.map((m, i) => (i === index ? text : m)))
    }
    setEditingIndex(null)
    setDraft('')
  }

  const clearMarquee = async () => {
    if (marquee.length === 0) return
    const ok = await confirm({
      title: 'Vaciar cinta',
      message: '¿Quitar todos los mensajes de la cinta superior?',
      confirmLabel: 'Vaciar cinta',
    })
    if (ok) setMarquee([])
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!dirty || saving) return
    const saved = await onSave(
      {
        ...shipping,
        enabled: form.enabled !== false,
        cost: Math.max(0, Number(form.cost) || 0),
        freeThreshold: Math.max(0, Number(form.freeThreshold) || 0),
        label: form.label.trim() || 'Envío a domicilio',
      },
      {
        ...general,
        marquee: marquee.filter(Boolean),
      },
    )
    if (saved) {
      setLoadedForm(form)
      setLoadedMarquee(marquee)
    }
  }

  return (
    <div className={messages ? 'set-messages' : 'dash-screen'}>
      {!messages && <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Tienda online</span>
          <h1>Envíos</h1>
        </div>
      </header>}

      <div className="dash-toolbar">
        <p className="list-note">
          {messages ? 'La cinta superior tiene su propio botón de guardar. Para mostrarla u ocultarla, usá Tienda online → Colores y diseño.' : 'Definí el costo de entrega y desde qué importe ofrecés envío gratis. Estos valores se aplican al carrito y al finalizar la compra.'}
        </p>
      </div>

      <div className="settings-live-layout">
      <form className="set-card set-form" onSubmit={submit} onFocusCapture={messages ? () => setPreviewFocus('marquee') : undefined}>
        {!messages && <>
        <h3>Envíos</h3>
        <div className="set-toggles">
          <ToggleRow
            label="Trabajo con envío a domicilio"
            hint={
              form.enabled
                ? 'Se cobra envío según el costo y el mínimo para envío gratis.'
                : 'Sin envío: el carrito y el checkout no suman envío.'
            }
            checked={form.enabled}
            onChange={(on) => setForm((f) => ({ ...f, enabled: on }))}
          />
        </div>
        <div className="set-row">
          <label className="inv-field">
            <span>Costo de envío (ARS)</span>
            <input type="number" min="0" value={form.cost} onChange={set('cost')} className="mono" disabled={!form.enabled} />
          </label>
          <label className="inv-field">
            <span>Envío gratis desde (ARS)</span>
            <input type="number" min="0" value={form.freeThreshold} onChange={set('freeThreshold')} className="mono" disabled={!form.enabled} />
          </label>
          <label className="inv-field">
            <span>Nombre del envío</span>
            <input value={form.label} onChange={set('label')} disabled={!form.enabled} />
          </label>
        </div>
        {form.enabled && <p className="set-hint">Si el costo es 0, el envío es siempre gratis.</p>}
        </>}

        {messages && <>
        <h3>Mensajes de la cinta superior</h3>
        <div className="set-list">
          {marquee.map((item, index) =>
            editingIndex === index ? (
              <div key={`edit-${index}`} className="set-inline-add">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); saveEdit(index) }
                    if (e.key === 'Escape') setEditingIndex(null)
                  }}
                  autoFocus
                  placeholder="Mensaje…"
                />
                <button type="button" className="ghost-btn" onClick={() => saveEdit(index)}>
                  Aplicar edición
                </button>
                <button type="button" className="ghost-btn" onClick={() => setEditingIndex(null)}>
                  Cancelar
                </button>
              </div>
            ) : (
              <div key={`${item}-${index}`} className="set-chip">
                <span>{item}</span>
                <button
                  type="button"
                  className="x-btn"
                  title="Editar este mensaje"
                  aria-label={`Editar ${item}`}
                  onClick={() => startEdit(index)}
                >
                  <IconEdit />
                </button>
                <button
                  type="button"
                  className="x-btn"
                  title="Eliminar este mensaje"
                  aria-label={`Quitar ${item}`}
                  onClick={() => removeMarquee(index)}
                >
                  <IconCross />
                </button>
              </div>
            ),
          )}
          {marquee.length === 0 && <p className="set-empty">Sin mensajes. La cinta queda oculta.</p>}
        </div>
        <p className="set-hint">
          El lápiz edita el mensaje y la X lo quita de la lista. Después usá «Guardar mensajes» para publicarlos.
        </p>
        <div className="set-inline-add">
          <input aria-label="Nuevo mensaje de la cinta" value={marqueeInput} onChange={(e) => setMarqueeInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addMarquee() } }} placeholder="Ej.: Retirá gratis en nuestro local" />
          <button type="button" className="ghost-btn" onClick={addMarquee} disabled={!marqueeInput.trim()}>
            <IconPlus />
            Agregar
          </button>
          {marquee.length > 0 && (
            <button type="button" className="ghost-btn" onClick={clearMarquee}>
              Vaciar cinta
            </button>
          )}
        </div>
        </>}

        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving || !dirty || (messages && (editingIndex !== null || Boolean(marqueeInput.trim())))}>
            {saving ? 'Guardando...' : messages ? 'Guardar mensajes' : 'Guardar envíos'}
          </button>
        </div>
        {messages && (editingIndex !== null || Boolean(marqueeInput.trim())) && <p className="set-hint">Aplicá la edición o agregá el mensaje a la lista antes de guardar.</p>}
      </form>
      <LiveStorePreview variant={messages ? 'messages' : 'shipping'} data={form} items={marquee} settings={settings} appearance={settings.appearance} highlight={previewFocus} />
      </div>
    </div>
  )
}

export { PaymentsScreen, PaymentsScreenBody, StoreScreen, StoreScreenBody, GeneralScreen, GeneralScreenBody }
