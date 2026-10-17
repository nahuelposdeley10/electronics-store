import { IconArrow, IconCheck, IconPhone, IconShield, IconUsers } from '@/components/Icons'
import { contactUrl } from '../../content.js'
import './styles.css'

export default function WhatsAppBot() {
  return <section className="bnp-bot bnp-wrap bnp-section" id="bot" aria-labelledby="bnp-bot-title">
    <div className="bnp-bot-copy">
      <span className="bnp-eyebrow">VENDEDOR IA POR WHATSAPP</span>
      <h2 id="bnp-bot-title">Tu catálogo también puede atender.</h2>
      <p>El vendedor IA responde consultas sobre tus productos y deriva la conversación a una persona cuando hace falta, usando la información de tu negocio.</p>
      <div className="bnp-bot-actions">
        <a className="bnp-button bnp-button-blue" href={contactUrl} target="_blank" rel="noopener noreferrer">Consultar por el bot <IconArrow /></a>
        <a className="bnp-text-link" href="/admin">Ver el panel <IconArrow /></a>
      </div>
      <p className="bnp-bot-note"><IconShield /> Se configura con WhatsApp Cloud API y un proveedor de IA. La activación depende de la configuración de tu cuenta.</p>
    </div>
    <div className="bnp-bot-card" aria-label="Ejemplo de atención del vendedor IA">
      <div className="bnp-bot-card-head">
        <span className="bnp-bot-avatar"><IconPhone /></span>
        <div><strong>Vendedor IA</strong><span>WhatsApp · configurable</span></div>
        <span className="bnp-bot-status">ACTIVABLE</span>
      </div>
      <div className="bnp-bot-chat" aria-label="Ejemplo de conversación">
        <small>Ejemplo de atención</small>
        <p className="bnp-bot-message bnp-bot-message-client">¿Tenés stock y medios de pago?</p>
        <p className="bnp-bot-message bnp-bot-message-agent">Sí. Te comparto opciones del catálogo y, si querés, te derivo con una persona para cerrar el pedido.</p>
      </div>
      <div className="bnp-bot-capabilities">
        <div><IconCheck /><span><strong>Consulta tu catálogo</strong><small>Productos y disponibilidad</small></span></div>
        <div><IconUsers /><span><strong>Deriva a tu equipo</strong><small>Cuando la conversación lo necesita</small></span></div>
        <div><IconShield /><span><strong>Datos separados</strong><small>Cada negocio ve su propia información</small></span></div>
      </div>
    </div>
  </section>
}
