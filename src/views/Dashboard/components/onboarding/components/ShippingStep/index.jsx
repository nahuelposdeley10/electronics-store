import { useState } from 'react'
import './styles.css'

export default function ShippingStep({ data, busy, onSave }) {
  const [form, setForm] = useState(() => ({ ...data.shipping }))
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }))
  return (
    <form className="onboard-shipping" onSubmit={(event) => { event.preventDefault(); onSave('shipping', form) }}>
      <fieldset><legend>Forma de entrega</legend>
        <label><input type="radio" name="delivery" checked={form.enabled} onChange={() => setForm((current) => ({ ...current, enabled: true }))} />Envío a domicilio</label>
        <label><input type="radio" name="delivery" checked={!form.enabled} onChange={() => setForm((current) => ({ ...current, enabled: false }))} />Sin cargo de envío en la web / entrega a coordinar</label>
      </fieldset>
      <label className="inv-field"><span>Nombre del envío</span><input value={form.label} onChange={set('label')} required maxLength={100} disabled={!form.enabled} /></label>
      <div className="onboard-shipping-prices">
        <label className="inv-field"><span>Costo de envío (ARS)</span><input type="number" min="0" max="100000000" step="0.01" required value={form.cost} onChange={set('cost')} disabled={!form.enabled} /></label>
        <label className="inv-field"><span>Envío gratis desde (ARS)</span><input type="number" min="0" max="100000000" step="0.01" required value={form.freeThreshold} onChange={set('freeThreshold')} disabled={!form.enabled} /></label>
      </div>
      <p>{form.enabled ? 'Estos importes se aplican al carrito. Un mínimo de 0 desactiva el envío gratis por importe; un costo de 0 deja el envío sin cargo.' : 'La web no sumará gastos de envío. Acordá con el cliente el retiro o la entrega y revisá que los textos de tu tienda lo expliquen.'}</p>
      <button type="submit" className="primary-btn" disabled={busy}>{busy ? 'Guardando…' : 'Guardar entregas y continuar'}</button>
    </form>
  )
}
