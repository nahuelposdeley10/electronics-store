import { useState } from 'react'
import { apiPut, apiUpload } from '@/lib/api'
import { IconCross, IconEdit, IconPlus } from '@/components/Icons'
import { SetImageField, SettingsFetcher, SettingsNote, ToggleRow } from '../common'

import './styles.css'

function PaymentsScreen() {
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const saveAll = async (payments, checkout) => {
    setSaving(true)
    setNote('')
    try {
      await apiPut('/api/admin/settings', { section: 'payments', value: payments })
      await apiPut('/api/admin/settings', { section: 'checkout', value: checkout })
      setNote('Medios de pago guardados.')
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <PaymentsScreenBody
          settings={settings}
          saving={saving}
          note={note}
          onSave={saveAll}
        />
      )}
    />
  )
}


function PaymentsScreenBody({ settings, saving, note, onSave }) {
  const methods = settings.payments?.methods || { efectivo: true, tarjeta: true, transferencia: true }
  const [form, setForm] = useState({
    efectivo: methods.efectivo !== false,
    tarjeta: methods.tarjeta !== false,
    transferencia: methods.transferencia !== false,
    statementDescriptor: settings.checkout?.statementDescriptor || 'TechStore',
  })

  const toggle = (key) => (on) => setForm((f) => ({ ...f, [key]: on }))

  const submit = (e) => {
    e.preventDefault()
    onSave(
      { methods: { efectivo: form.efectivo, tarjeta: form.tarjeta, transferencia: form.transferencia } },
      { statementDescriptor: form.statementDescriptor.trim() || 'TechStore' },
    )
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">ConfiguraciÃ³n</span>
          <h1>MÃ©todos de pago</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          QuÃ© medios podÃ©s cobrar desde la caja del panel. La web siempre cobra con Mercado Pago.
        </p>
      </div>

      <SettingsNote text={note} />

      <form className="set-card" onSubmit={submit}>
        <h3>En la caja (panel)</h3>
        <div className="set-toggles">
          <ToggleRow label="Efectivo" hint="Pago en el local" checked={form.efectivo} onChange={toggle('efectivo')} />
          <ToggleRow label="Tarjeta" hint="Tarjeta de dÃ©bito o crÃ©dito" checked={form.tarjeta} onChange={toggle('tarjeta')} />
          <ToggleRow label="Transferencia" hint="Transferencia bancaria" checked={form.transferencia} onChange={toggle('transferencia')} />
        </div>

        <h3>Mercado Pago</h3>
        <label className="inv-field">
          <span>Descriptor en el resumen (statement descriptor)</span>
          <input value={form.statementDescriptor} onChange={(e) => setForm((f) => ({ ...f, statementDescriptor: e.target.value }))} maxLength={32} />
        </label>
        <p className="set-hint">
          El texto que ven tus clientes en el resumen de la tarjeta al pagar por la web.
        </p>

        <div className="set-card set-info">
          <strong>Credenciales de Mercado Pago</strong>
          <p>
            La access token y la public key se leen del archivo <code>.env</code> del servidor
            (variables <code>MP_ACCESS_TOKEN</code> y <code>MP_PUBLIC_KEY</code>). No se guardan en
            la base de datos por seguridad.
          </p>
        </div>

        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Guardandoâ€¦' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}


function StoreScreen() {
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const save = async (store, hero) => {
    setSaving(true)
    setNote('')
    try {
      await apiPut('/api/admin/settings', { section: 'store', value: store })
      if (hero) await apiPut('/api/admin/settings', { section: 'hero', value: hero })
      setNote('Datos del negocio guardados.')
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <StoreScreenBody settings={settings} saving={saving} note={note} onSave={save} />
      )}
    />
  )
}


function StoreScreenBody({ settings, saving, note, onSave }) {
  const store = settings.store || {}
  const hero = settings.hero || {}
  const [form, setForm] = useState({
    name: store.name || '',
    tagline: store.tagline || '',
    logoUrl: store.logoUrl || '',
    coverUrl: store.coverUrl || '',
    phone: store.phone || '',
    whatsapp: store.whatsapp || '',
    email: store.email || '',
    addressFull: store.addressFull || '',
    addressShort: store.addressShort || '',
    hours: store.hours || '',
    band: store.band || '',
    heroTitle: hero.title || '',
    heroAccent: hero.titleAccent || '',
    heroLead: hero.lead || '',
  })
  const [uploading, setUploading] = useState(null)
  const [imageResult, setImageResult] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const uploadImage = async (which, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(which)
    setImageResult('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('field', which)
      const res = await apiUpload('/api/admin/settings/media', fd)
      setForm((f) => ({ ...f, [`${which}Url`]: res[which] }))
      setImageResult(
        `${which === 'logo' ? 'Logo' : 'Portada'} actualizado. Guardalo con los demÃ¡s cambios.`,
      )
    } catch (err) {
      setImageResult(err.message)
    } finally {
      setUploading(null)
    }
  }

  const removeImage = (which) => {
    setImageResult('')
    setForm((f) => ({ ...f, [`${which}Url`]: '' }))
  }

  const submit = (e) => {
    e.preventDefault()
    onSave(
      { ...form, phone: form.phone.trim(), email: form.email.trim() },
      {
        title: form.heroTitle.trim(),
        titleAccent: form.heroAccent.trim(),
        lead: form.heroLead.trim(),
      },
    )
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">ConfiguraciÃ³n</span>
          <h1>Datos del negocio</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Estos datos se muestran en la tienda: cabecera, pie de pÃ¡gina, mapa, portada y botÃ³n de WhatsApp.
        </p>
      </div>

      <SettingsNote text={note} />
      <SettingsNote text={imageResult} />

      <form className="set-card set-form" onSubmit={submit}>
        <h3>Logo y portada</h3>
        <div className="set-row set-images">
          <SetImageField
            label="Logo"
            hint="Aparece en el header y el pie de la tienda. PNG con fondo transparente recomendado."
            value={form.logoUrl}
            uploading={uploading === 'logo'}
            onFile={(e) => uploadImage('logo', e)}
            onRemove={() => removeImage('logo')}
          />
          <SetImageField
            label="Portada"
            hint="Imagen de fondo del hero de inicio. Si no hay, el hero queda sin imagen."
            value={form.coverUrl}
            uploading={uploading === 'cover'}
            onFile={(e) => uploadImage('cover', e)}
            onRemove={() => removeImage('cover')}
            wide
          />
        </div>

        <h3>Identidad</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>Nombre de la tienda</span>
            <input value={form.name} onChange={set('name')} required minLength={2} />
          </label>
          <label className="inv-field">
            <span>Frase corta (bajo el logo)</span>
            <input value={form.tagline} onChange={set('tagline')} />
          </label>
        </div>

        <h3>Contacto</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>TelÃ©fono fijo</span>
            <input value={form.phone} onChange={set('phone')} placeholder="11 5555 4294" />
          </label>
          <label className="inv-field">
            <span>WhatsApp (sin + ni espacios)</span>
            <input value={form.whatsapp} onChange={set('whatsapp')} placeholder="5491155554294" />
          </label>
          <label className="inv-field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} />
          </label>
        </div>

        <h3>UbicaciÃ³n y horarios</h3>
        <div className="set-row">
          <label className="inv-field set-grow">
            <span>DirecciÃ³n completa (para el mapa)</span>
            <input value={form.addressFull} onChange={set('addressFull')} />
          </label>
          <label className="inv-field">
            <span>DirecciÃ³n corta (marcas de la tienda)</span>
            <input value={form.addressShort} onChange={set('addressShort')} />
          </label>
        </div>
        <label className="inv-field">
          <span>Horarios de atenciÃ³n</span>
          <input value={form.hours} onChange={set('hours')} />
        </label>

        <h3>Hero de inicio</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>TÃ­tulo principal</span>
            <input value={form.heroTitle} onChange={set('heroTitle')} maxLength={160} />
          </label>
          <label className="inv-field">
            <span>Remate del tÃ­tulo</span>
            <input value={form.heroAccent} onChange={set('heroAccent')} maxLength={160} />
          </label>
        </div>
        <label className="inv-field">
          <span>Texto de presentaciÃ³n</span>
          <textarea value={form.heroLead} onChange={set('heroLead')} rows={3} maxLength={300} />
        </label>
        <p className="set-hint">
          GuardÃ¡ el texto que se muestra en el hero del inicio. PodÃ©s usar{' '}
          <code>{'{cuotas}'}</code> (mÃ¡x. cuotas sin interÃ©s) y <code>{'{ciudad}'}</code>{' '}
          (direcciÃ³n corta) dentro del texto.
        </p>

        <h3>Franja del pie de pÃ¡gina</h3>
        <label className="inv-field">
          <span>Texto promocional</span>
          <textarea value={form.band} onChange={set('band')} rows={2} />
        </label>

        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Guardandoâ€¦' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}


function GeneralScreen() {
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const save = async (shipping, general) => {
    setSaving(true)
    setNote('')
    try {
      await apiPut('/api/admin/settings', { section: 'shipping', value: shipping })
      await apiPut('/api/admin/settings', { section: 'general', value: general })
      setNote('ConfiguraciÃ³n general guardada.')
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <GeneralScreenBody settings={settings} saving={saving} note={note} onSave={save} />
      )}
    />
  )
}


function GeneralScreenBody({ settings, saving, note, onSave }) {
  const shipping = settings.shipping || {}
  const general = settings.general || {}
  const [form, setForm] = useState({
    cost: String(shipping.cost || 5999),
    freeThreshold: String(shipping.freeThreshold || 300000),
    label: shipping.label || 'EnvÃ­o a domicilio',
  })
  const [marquee, setMarquee] = useState(
    (Array.isArray(general.marquee) ? general.marquee : []).filter(Boolean),
  )
  const [marqueeInput, setMarqueeInput] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [draft, setDraft] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const addMarquee = () => {
    const text = marqueeInput.trim()
    if (!text) return
    setMarquee((prev) => [...prev, text])
    setMarqueeInput('')
  }

  const removeMarquee = (index) => {
    setMarquee((prev) => prev.filter((_, i) => i !== index))
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

  const clearMarquee = () => {
    if (marquee.length === 0) return
    if (window.confirm('Â¿Quitar todos los mensajes de la cinta superior?')) {
      setMarquee([])
    }
  }

  const submit = (e) => {
    e.preventDefault()
    onSave(
      {
        cost: Math.max(0, Number(form.cost) || 0),
        freeThreshold: Math.max(0, Number(form.freeThreshold) || 0),
        label: form.label.trim() || 'EnvÃ­o a domicilio',
      },
      {
        marquee: marquee.filter(Boolean),
      },
    )
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">ConfiguraciÃ³n</span>
          <h1>ConfiguraciÃ³n general</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          EnvÃ­os y la cinta superior de la tienda. Afecta el checkout, el carrito y las tarjetas de producto.
        </p>
      </div>

      <SettingsNote text={note} />

      <form className="set-card set-form" onSubmit={submit}>
        <h3>EnvÃ­os</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>Costo de envÃ­o (ARS)</span>
            <input type="number" min="0" value={form.cost} onChange={set('cost')} className="mono" />
          </label>
          <label className="inv-field">
            <span>EnvÃ­o gratis desde (ARS)</span>
            <input type="number" min="0" value={form.freeThreshold} onChange={set('freeThreshold')} className="mono" />
          </label>
          <label className="inv-field">
            <span>Nombre del envÃ­o</span>
            <input value={form.label} onChange={set('label')} />
          </label>
        </div>
        <p className="set-hint">Si el costo es 0, el envÃ­o es siempre gratis.</p>

        <h3>Cinta superior (marquee)</h3>
        <div className="set-list">
          {marquee.map((item, index) =>
            editingIndex === index ? (
              <div key={`edit-${index}`} className="set-inline-add">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveEdit(index)
                    if (e.key === 'Escape') setEditingIndex(null)
                  }}
                  autoFocus
                  placeholder="Mensajeâ€¦"
                />
                <button type="button" className="ghost-btn" onClick={() => saveEdit(index)}>
                  Guardar
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
          El lÃ¡piz edita el mensaje y la X lo elimina. DespuÃ©s apretÃ¡ "Guardar cambios".
        </p>
        <div className="set-inline-add">
          <input value={marqueeInput} onChange={(e) => setMarqueeInput(e.target.value)} placeholder="Nuevo mensajeâ€¦" />
          <button type="button" className="ghost-btn" onClick={addMarquee}>
            <IconPlus />
            Agregar
          </button>
          {marquee.length > 0 && (
            <button type="button" className="ghost-btn" onClick={clearMarquee}>
              Vaciar cinta
            </button>
          )}
        </div>

        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Guardandoâ€¦' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

export { PaymentsScreen, PaymentsScreenBody, StoreScreen, StoreScreenBody, GeneralScreen, GeneralScreenBody }