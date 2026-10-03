import { IconCard, IconPhone, IconCheck } from '@/components/Icons'
import './styles.css'

export default function PaymentsStep({ data, busy, onSave, onView }) {
  const { online, tokenPresent, webhookPresent } = data.payments
  return (
    <div className="onboard-payments">
      <div className="onboard-payment-options" role="group" aria-label="Canal de cobro">
        <button type="button" aria-pressed={online} disabled={busy} onClick={() => onSave('payments', 'mercadopago')}><IconCard /><strong>Mercado Pago</strong><span>Pago online con tu propia cuenta.</span></button>
        <button type="button" aria-pressed={!online} disabled={busy} onClick={() => onSave('payments', 'whatsapp')}><IconPhone /><strong>Pedidos por WhatsApp</strong><span>Coordinás el cobro directamente con el cliente.</span></button>
      </div>
      {online ? <>
        <ul className="onboard-payment-checks">
          <li><IconCheck />Access Token: {tokenPresent ? 'guardado' : 'pendiente'}</li>
          <li><IconCheck />Clave de webhook: {webhookPresent ? 'guardada' : 'pendiente'}</li>
        </ul>
        <p>La guía verifica que estos datos estén guardados, no su validez ante Mercado Pago. Configurá también las notificaciones y probá el circuito de cobro antes de vender. Los cargos del procesador son independientes.</p>
        <button type="button" className="primary-btn" onClick={() => onView('settings-payments')} disabled={busy}>Configurar Mercado Pago</button>
      </> : <p>Los pedidos se enviarán al <strong>{data.contact.whatsapp}</strong>. El pago online queda desactivado; las credenciales que ya tenías permanecen guardadas. Esta guía no envía mensajes.</p>}
    </div>
  )
}
