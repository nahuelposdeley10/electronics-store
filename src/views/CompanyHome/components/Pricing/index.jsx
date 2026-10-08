import { useState } from 'react'
import { IconArrow, IconCheck, IconWrench } from '@/components/Icons'
import { apiPost } from '@/lib/api'
import { formatPrice, plans, setupPrice } from '../../content.js'
import './styles.css'

export default function Pricing() {
  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ name: '', email: '', storeName: '', businessSlug: '' })
  const [state, setState] = useState({ loading: false, error: '', success: '' })
  const submit = async (event) => {
    event.preventDefault()
    setState({ loading: true, error: '', success: '' })
    try {
      const data = await apiPost('/api/commercial/subscriptions', { ...form, planCode: selected.id })
      setSelected(null)
      setState({
        loading: false,
        error: '',
        success: data.emailDelivery?.sent
          ? 'Te enviamos un email profesional para crear tu cuenta y comenzar la prueba gratuita.'
          : 'Registramos tu solicitud. El email de activación quedará disponible cuando se configure el envío local.',
      })
    } catch (error) { setState({ loading: false, error: error.message, success: '' }) }
  }
  return <section className="bnp-pricing bnp-wrap bnp-section" id="planes" aria-labelledby="bnp-plans-title">
    <div className="bnp-section-intro"><span className="bnp-eyebrow">UN PLAN PARA TU MOMENTO</span><h2 id="bnp-plans-title">Empezá con lo que necesitás.<br />Sumá cuando lo necesites.</h2><p>Elegí un plan y probalo gratis durante 14 días. Primero creás tu cuenta; cuando termine la prueba te enviamos el link para suscribirte.</p></div>
    <div className="bnp-plans-grid">{plans.map((plan) => <article className={`bnp-plan bnp-plan-${plan.id}`} key={plan.id} aria-labelledby={`bnp-plan-${plan.id}`}>
      <span className="bnp-plan-label">{plan.label}</span><h3 id={`bnp-plan-${plan.id}`}>{plan.name}</h3><p className="bnp-plan-description">{plan.description}</p>
      <div className="bnp-plan-price"><strong>{formatPrice(plan.price)}</strong><span>/mes</span></div><small className="bnp-plan-currency">Pesos argentinos · Abono mensual</small><span className="bnp-plan-trial">14 días gratis · Sin cobro ahora</span>
      <button type="button" className={`bnp-button${plan.id === 'profesional' ? ' bnp-button-blue' : ''}`} onClick={() => { setSelected(plan); setState({ loading: false, error: '', success: '' }) }}>Probar gratis <IconArrow /></button>
      <p className="bnp-plan-includes">{plan.includes}</p><ul>{plan.features.map((feature) => <li key={feature}><IconCheck /><span>{feature}</span></li>)}</ul><p className="bnp-plan-scope">{plan.scope}</p>
    </article>)}</div>
    <div className="bnp-setup"><span><IconWrench /></span><div><h3>Configuración inicial, por separado</h3><p>Desde <strong>{formatPrice(setupPrice)}</strong>, según el alcance acordado. No está incluida en la mensualidad.</p></div></div>
    <p className="bnp-pricing-note">Tenés 14 días de prueba gratuita y no se realiza ningún cobro al crear la cuenta. Cuando termine la prueba te enviaremos el link de suscripción de Mercado Pago. Las comisiones del procesador son independientes. La configuración inicial, desde {formatPrice(setupPrice)}, se coordina por separado.</p>
    {state.success && <p className="bnp-subscription-success" role="status">{state.success}</p>}
    {selected && <div className="bnp-subscription-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><section className="bnp-subscription-modal" role="dialog" aria-modal="true" aria-labelledby="bnp-subscription-title"><button className="bnp-subscription-close" type="button" onClick={() => setSelected(null)} aria-label="Cerrar">×</button><span className="bnp-eyebrow">Prueba gratuita de 14 días</span><h3 id="bnp-subscription-title">Plan {selected.name}</h3><p>Completá tus datos y te enviaremos por email el acceso para crear tu cuenta. No se cobra nada ahora.</p><form onSubmit={submit}><label>Tu nombre<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required minLength={2} /></label><label>Email para recibir el acceso<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required /></label><label>Nombre del negocio<input value={form.storeName} onChange={(event) => setForm({ ...form, storeName: event.target.value })} required /></label><label>URL de la tienda<input value={form.businessSlug} onChange={(event) => setForm({ ...form, businessSlug: event.target.value })} placeholder="mi-tienda" /><small>Si la dejás vacía, la generamos con el nombre del negocio.</small></label>{state.error && <p className="bnp-subscription-error" role="alert">{state.error}</p>}<button className="bnp-button bnp-button-blue" type="submit" disabled={state.loading}>{state.loading ? 'Creando prueba…' : 'Crear mi prueba gratuita'} <IconArrow /></button></form></section></div>}
  </section>
}
