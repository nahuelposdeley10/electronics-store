import { useState } from 'react'
import './styles.css'

export default function BusinessStep({ data, busy, onSave, onView }) {
  const [form, setForm] = useState(() => ({ ...data.contact, slug: data.businessSlug }))
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return (
    <form className="onboard-business" onSubmit={(event) => { event.preventDefault(); onSave('business', form) }}>
      <label className="inv-field"><span>Nombre del negocio</span><input value={form.name} onChange={set('name')} required minLength={2} maxLength={100} autoComplete="organization" placeholder="Ej.: Casa Norte" /></label>
      <div className="onboard-business-contact">
        <label className="inv-field"><span>WhatsApp con código de país</span><input type="tel" value={form.whatsapp} onChange={set('whatsapp')} maxLength={25} autoComplete="tel" placeholder="Ej.: 5491176543210" /></label>
        <label className="inv-field"><span>Email de contacto</span><input type="email" value={form.email} onChange={set('email')} maxLength={150} autoComplete="email" placeholder="ventas@tunegocio.com" /></label>
      </div>
      <p>Completá al menos un contacto. Para recibir pedidos por WhatsApp, necesitás un número válido con código de país.</p>
      <details className="onboard-business-extra"><summary>Teléfono, ubicación y horarios (opcional)</summary><div>
        {[['phone', 'Teléfono de contacto'], ['addressFull', 'Dirección completa'], ['addressShort', 'Ciudad / localidad'], ['hours', 'Horarios de atención']].map(([key, label]) => <label className="inv-field" key={key}><span>{label}</span><input value={form[key]} onChange={set(key)} maxLength={300} /></label>)}
        <p>Los datos de ejemplo aparecen vacíos. Al guardar este formulario, los campos vacíos reemplazan esos valores; no publiques direcciones que no sean tuyas.</p>
      </div></details>
      {data.businessSlug ? <p>Tu dirección: <strong>/u/{data.businessSlug}</strong>. La guía conserva este enlace.</p> : <label className="inv-field"><span>Dirección de tu tienda: /u/</span><input value={form.slug} onChange={set('slug')} required pattern="[a-z0-9]+(-[a-z0-9]+)*" minLength={3} maxLength={60} placeholder="casa-norte" /><small>Letras minúsculas, números y guiones. Elegila con cuidado: no se cambia desde esta guía.</small></label>}
      <div className="onboard-business-actions">
        <button className="primary-btn" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar y continuar'}</button>
        <button className="ghost-btn" type="button" onClick={() => onView('settings-store')} disabled={busy}>Más datos y contacto</button>
      </div>
    </form>
  )
}
