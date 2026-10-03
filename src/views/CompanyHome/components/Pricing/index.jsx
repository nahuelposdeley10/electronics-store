import { IconArrow, IconCheck, IconWrench } from '@/components/Icons'
import { formatPrice, planMessage, plans, setupPrice, whatsappUrl } from '../../content.js'
import './styles.css'

export default function Pricing() {
  return <section className="bnp-pricing bnp-wrap bnp-section" id="planes" aria-labelledby="bnp-plans-title">
    <div className="bnp-section-intro"><span className="bnp-eyebrow">UN PLAN PARA TU MOMENTO</span><h2 id="bnp-plans-title">Empezá con lo que necesitás.<br />Sumá cuando lo necesites.</h2><p>Elegí un plan y conversemos por WhatsApp. Sin pagos automáticos desde esta página.</p></div>
    <div className="bnp-plans-grid">{plans.map((plan) => <article className={`bnp-plan bnp-plan-${plan.id}`} key={plan.id} aria-labelledby={`bnp-plan-${plan.id}`}>
      <span className="bnp-plan-label">{plan.label}</span><h3 id={`bnp-plan-${plan.id}`}>{plan.name}</h3><p className="bnp-plan-description">{plan.description}</p>
      <div className="bnp-plan-price"><strong>{formatPrice(plan.price)}</strong><span>/mes</span></div><small className="bnp-plan-currency">Pesos argentinos · Abono mensual</small>
      <a className={`bnp-button${plan.id === 'profesional' ? ' bnp-button-blue' : ''}`} href={whatsappUrl(planMessage(plan))} target="_blank" rel="noopener noreferrer" aria-label={`Elegir plan ${plan.name} por WhatsApp (abre una pestaña nueva)`}>Elegir plan <IconArrow /></a>
      <p className="bnp-plan-includes">{plan.includes}</p><ul>{plan.features.map((feature) => <li key={feature}><IconCheck /><span>{feature}</span></li>)}</ul><p className="bnp-plan-scope">{plan.scope}</p>
    </article>)}</div>
    <div className="bnp-setup"><span><IconWrench /></span><div><h3>Configuración inicial, por separado</h3><p>Desde <strong>{formatPrice(setupPrice)}</strong>, según el alcance acordado. No está incluida en la mensualidad.</p></div></div>
    <p className="bnp-pricing-note">Confirmamos alcance y condiciones antes de contratar. Las comisiones de Mercado Pago se cobran por separado por el procesador. Al elegir un plan se abrirá WhatsApp con un mensaje que podés revisar antes de enviar.</p>
  </section>
}
