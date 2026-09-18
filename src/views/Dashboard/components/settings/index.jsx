import { useState } from 'react'
import { apiPut, apiUpload, getSession } from '@/lib/api'
import { getSuperTenant } from '@/lib/tenant'
import { IconCross, IconEdit, IconPlus } from '@/components/Icons'
import { useToast } from '@/context/useToast'
import { SetImageField, SettingsFetcher, ToggleRow } from '../common'

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
          <span className="dash-eyebrow">Configuración</span>
          <h1>Métodos de pago</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Cada tienda usa su propia cuenta de Mercado Pago. La web cobra con MP y la webhook URL es única por negocio.
        </p>
      </div>

      <div className="set-card">
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

      <form className="set-card set-form" onSubmit={submit}>
        {!online && (
          <p className="set-hint mp-paused-note">
            <strong>Pagos online apagados por el súper admin.</strong> Mientras tanto la web
            pide el pedido por <strong>WhatsApp</strong> usando el número de{" "}
            <em>Datos del negocio</em>. Igual podés cargar o editar estas credenciales: se
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


function StoreScreen() {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const save = async (store, hero) => {
    setSaving(true)
    try {
      await apiPut('/api/admin/settings', { section: 'store', value: store })
      if (hero) await apiPut('/api/admin/settings', { section: 'hero', value: hero })
      showToast('Datos del negocio guardados.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <StoreScreenBody settings={settings} saving={saving} onSave={save} />
      )}
    />
  )
}


function StoreScreenBody({ settings, saving, onSave }) {
  const { showToast } = useToast()
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
  const [loadedForm] = useState(form)
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
  })
  const dirty = JSON.stringify(toPayload(form)) !== JSON.stringify(toPayload(loadedForm))

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

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
      setForm((f) => ({ ...f, [`${which}Url`]: res[which] }))
      showToast(
        `${which === 'logo' ? 'Logo' : 'Portada'} actualizado. Guardalo con los demás cambios.`,
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

  const submit = (e) => {
    e.preventDefault()
    if (!dirty) return
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
          <span className="dash-eyebrow">Configuración</span>
          <h1>Datos del negocio</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Estos datos se muestran en la tienda: cabecera, pie de página, mapa, portada y botón de WhatsApp.
        </p>
      </div>

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
            <span>Teléfono fijo</span>
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

        <h3>Ubicación y horarios</h3>
        <div className="set-row">
          <label className="inv-field set-grow">
            <span>Dirección completa (para el mapa)</span>
            <input value={form.addressFull} onChange={set('addressFull')} />
          </label>
          <label className="inv-field">
            <span>Dirección corta (marcas de la tienda)</span>
            <input value={form.addressShort} onChange={set('addressShort')} />
          </label>
        </div>
        <label className="inv-field">
          <span>Horarios de atención</span>
          <input value={form.hours} onChange={set('hours')} />
        </label>

        <h3>Hero de inicio</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>Título principal</span>
            <input value={form.heroTitle} onChange={set('heroTitle')} maxLength={160} />
          </label>
          <label className="inv-field">
            <span>Remate del título</span>
            <input value={form.heroAccent} onChange={set('heroAccent')} maxLength={160} />
          </label>
        </div>
        <label className="inv-field">
          <span>Texto de presentación</span>
          <textarea value={form.heroLead} onChange={set('heroLead')} rows={3} maxLength={300} />
        </label>
        <p className="set-hint">
          Guardá el texto que se muestra en el hero del inicio. Podés usar{' '}
          <code>{'{cuotas}'}</code> (máx. cuotas sin interés) y <code>{'{ciudad}'}</code>{' '}
          (dirección corta) dentro del texto.
        </p>

        <h3>Franja del pie de página</h3>
        <label className="inv-field">
          <span>Texto promocional</span>
          <textarea value={form.band} onChange={set('band')} rows={2} />
        </label>

        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving || !dirty}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}


function GeneralScreen() {
  const { showToast } = useToast()
  const [saving, setSaving] = useState(false)

  const save = async (shipping, general) => {
    setSaving(true)
    try {
      await apiPut('/api/admin/settings', { section: 'shipping', value: shipping })
      await apiPut('/api/admin/settings', { section: 'general', value: general })
      showToast('Configuración general guardada.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
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


function GeneralScreenBody({ settings, saving, onSave }) {
  const shipping = settings.shipping || {}
  const general = settings.general || {}
  const [form, setForm] = useState({
    enabled: shipping.enabled !== false,
    cost: String(shipping.cost || 5999),
    freeThreshold: String(shipping.freeThreshold || 300000),
    label: shipping.label || 'Envío a domicilio',
  })
  const [marquee, setMarquee] = useState(
    (Array.isArray(general.marquee) ? general.marquee : []).filter(Boolean),
  )
  const [loadedForm] = useState(form)
  const [loadedMarquee] = useState(marquee)
  const [marqueeInput, setMarqueeInput] = useState('')
  const [editingIndex, setEditingIndex] = useState(null)
  const [draft, setDraft] = useState('')

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
    if (window.confirm('¿Quitar todos los mensajes de la cinta superior?')) {
      setMarquee([])
    }
  }

  const submit = (e) => {
    e.preventDefault()
    if (!dirty) return
    onSave(
      {
        enabled: form.enabled !== false,
        cost: Math.max(0, Number(form.cost) || 0),
        freeThreshold: Math.max(0, Number(form.freeThreshold) || 0),
        label: form.label.trim() || 'Envío a domicilio',
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
          <span className="dash-eyebrow">Configuración</span>
          <h1>Configuración general</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Envíos y la cinta superior de la tienda. Afecta el checkout, el carrito y las tarjetas de producto.
        </p>
      </div>

      <form className="set-card set-form" onSubmit={submit}>
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
                  placeholder="Mensaje…"
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
          El lápiz edita el mensaje y la X lo elimina. Después apretá "Guardar cambios".
        </p>
        <div className="set-inline-add">
          <input value={marqueeInput} onChange={(e) => setMarqueeInput(e.target.value)} placeholder="Nuevo mensaje…" />
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
          <button type="submit" className="primary-btn" disabled={saving || !dirty}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

export { PaymentsScreen, PaymentsScreenBody, StoreScreen, StoreScreenBody, GeneralScreen, GeneralScreenBody }