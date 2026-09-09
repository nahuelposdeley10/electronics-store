import { useEffect } from 'react'
import { useCart } from '../context/useCart'
import { IconCheck, IconClose, IconClock } from '../components/Icons'

const PENDING_STATUSES = new Set(['pending', 'in_process'])

export default function OrderStatus({ status, orderId, onNavigate }) {
  const { clearCart } = useCart()

  useEffect(() => {
    if (status === 'approved') clearCart()
  }, [status, clearCart])

  if (status === 'approved') {
    return (
      <main className="cart cart-empty">
        <span className="empty-stamp">
          <IconCheck />
        </span>
        <h1>¡Gracias por tu compra!</h1>
        <p>
          Tu pago fue aprobado. Te vamos a contactar para coordinar el envío o el retiro
          {orderId ? <span className="mono"> · Pedido #{orderId}</span> : null}.
        </p>
        <button type="button" className="primary-btn" onClick={() => onNavigate('home')}>
          Seguir comprando
        </button>
      </main>
    )
  }

  if (PENDING_STATUSES.has(status)) {
    return (
      <main className="cart cart-empty">
        <span className="empty-draw">
          <IconClock />
        </span>
        <h1>Estamos esperando tu pago</h1>
        <p>
          Tu pago quedó pendiente de confirmación{orderId ? (
            <span className="mono"> · Pedido #{orderId}</span>
          ) : null}. Te avisamos apenas se acredite.
        </p>
        <button type="button" className="primary-btn" onClick={() => onNavigate('home')}>
          Seguir comprando
        </button>
      </main>
    )
  }

  return (
    <main className="cart cart-empty">
      <span className="empty-draw">
        <IconClose />
      </span>
      <h1>El pago no se pudo completar</h1>
      <p>
        No se debitó nada de tu cuenta. Revisá los datos de tu tarjeta o intentalo de nuevo
        {orderId ? <span className="mono"> · Pedido #{orderId}</span> : null}.
      </p>
      <button type="button" className="primary-btn" onClick={() => onNavigate('cart')}>
        Volver al carrito
      </button>
    </main>
  )
}