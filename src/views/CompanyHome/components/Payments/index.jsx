import { IconArrow, IconCard, IconCheck, IconPhone } from '@/components/Icons'
import './styles.css'

export default function Payments() {
  return <section className="bnp-payments bnp-wrap bnp-section" aria-labelledby="bnp-payments-title">
    <div className="bnp-payments-copy"><span className="bnp-eyebrow">TU MARCA. TUS CANALES. TU CUENTA.</span><h2 id="bnp-payments-title">La tienda es tuya.<br />Los cobros, también.</h2><p>Conectá tu propia cuenta de Mercado Pago para cobrar online o recibí pedidos por WhatsApp para coordinar la venta con tus clientes.</p><p>Configurá logo, colores, contacto, información de envío y cuotas desde tu panel. Tu negocio mantiene su identidad.</p><a className="bnp-text-link" href="#planes">Encontrá tu plan <IconArrow /></a></div>
    <div className="bnp-payment-paths">
      <div className="bnp-payment-source"><span className="bnp-payment-monogram">Tu<br />marca.</span><div><strong>Tu tienda online</strong><span>Tu catálogo, tu forma de vender</span></div></div>
      <div className="bnp-payment-options"><article><IconCard /><h3>Mercado Pago</h3><p>Tu cliente paga online.<br />El cobro llega a tu cuenta.</p><span><IconCheck /> Desde Profesional</span></article><article><IconPhone /><h3>WhatsApp</h3><p>Recibís el pedido.<br />Coordinás el pago y la entrega.</p><span><IconCheck /> Desde Inicial</span></article></div>
      <p className="bnp-payment-note">Los cargos y condiciones del procesador de pagos son independientes del abono de Tienda BNP. Un pedido por WhatsApp no confirma un pago.</p>
    </div>
  </section>
}
