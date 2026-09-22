import { useState } from 'react'
import { useCart } from '@/context/useCart'
import { useConfirm } from '@/context/useConfirm'
import { formatARS } from '@/data/format'
import { getTenantHeaders } from '@/lib/tenant'
import {
  IconCart,
  IconClose,
  IconMinus,
  IconPlus,
  IconTrash,
  IconTruck,
  IconLock,
  IconBolt,
} from '@/components/Icons'

import './styles.css'

export default function CartView({ onNavigate }) {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    subtotal,
    discount,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    shippingCost,
    shippingEnabled,
    hasFreeShipping,
    freeShippingThreshold,
    onlinePayEnabled,
    storeWhatsapp,
    total,
  } = useCart()
  const { confirm } = useConfirm()

  const [couponInput, setCouponInput] = useState('')
  const [buyerName, setBuyerName] = useState('')
  const [buyerEmail, setBuyerEmail] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const apply = (e) => {
    e.preventDefault()
    if (!couponInput.trim()) return
    const ok = applyCoupon(couponInput)
    if (ok) setCouponInput('')
  }

  const emptyCart = async () => {
    const ok = await confirm({
      title: 'Vaciar carrito',
      message: '¿Quitar todos los productos de tu carrito?',
      confirmLabel: 'Vaciar carrito',
    })
    if (ok) clearCart()
  }

  const removeOne = async (item) => {
    const ok = await confirm({
      title: 'Quitar del carrito',
      message: (
        <>
          ¿Quitar <strong>{item.name}</strong> del carrito?
        </>
      ),
      confirmLabel: 'Quitar',
    })
    if (ok) removeItem(item.id)
  }

  const checkout = async () => {
    if (items.length === 0 || checkingOut || !onlinePayEnabled) return
    const name = buyerName.trim()
    const email = buyerEmail.trim()
    if (name.length < 2) {
      setCheckoutError('Escribí tu nombre y apellido para poder identificar la venta.')
      return
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setCheckoutError('Escribí un email válido para recibir el comprobante.')
      return
    }
    setCheckingOut(true)
    setCheckoutError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getTenantHeaders() },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          coupon: appliedCoupon,
          payer: { name, email },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago')
      if (data.order_id && data.refresh_token) {
        sessionStorage.setItem(`ts-order-token:${data.order_id}`, data.refresh_token)
      }
      window.location.href = data.init_point
    } catch (err) {
      setCheckoutError(err.message || 'Hubo un problema al iniciar el pago')
    } finally {
      setCheckingOut(false)
    }
  }

  const whatsappNumber = storeWhatsapp ? String(storeWhatsapp).replace(/\D/g, '') : ''
  const orderLines = items
    .map(
      (item) =>
        `- ${item.quantity}× ${item.name} (${formatARS(item.price * item.quantity)})`,
    )
    .join('\n')
  const orderMsg = [
    'Hola, quiero hacer este pedido:',
    orderLines,
    discount > 0 ? `Descuento (${appliedCoupon}): -${formatARS(discount)}` : '',
    shippingEnabled && !hasFreeShipping && shippingCost > 0
      ? `Envío: ${formatARS(shippingCost)}`
      : '',
    `Total: ${formatARS(total)}`,
  ]
    .filter((line) => line !== '')
    .join('\n')
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(orderMsg)}`
    : ''

  if (items.length === 0) {
    return (
      <main className="cart cart-empty">
        <span className="empty-draw">
          <IconCart />
        </span>
        <h1>Tu carrito está vacío</h1>
        <p>Sumá productos de la galería y pasamos por el mostrador.</p>
        <button type="button" className="primary-btn" onClick={() => onNavigate('home')}>
          Ir al catálogo
        </button>
      </main>
    )
  }

  return (
    <main className="cart">
      <div className="cart-header">
        <h1>Tu carrito ({items.length})</h1>
        <button type="button" className="link-btn" onClick={emptyCart}>
          <IconTrash />
          Vaciar carrito
        </button>
      </div>

      <div className="cart-layout">
        <ul className="cart-items">
          {items.map((item) => (
            <li key={item.id} className="cart-item">
              <div className="cart-item-media">
                <img className="cart-item-img" src={item.image} alt={item.name} />
              </div>
              <div className="cart-item-info">
                <span className="cart-item-name">{item.name}</span>
                <span className="cart-item-price mono">{formatARS(item.price)}</span>
              </div>
              <div className="qty-control">
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                  aria-label="Restar uno"
                >
                  <IconMinus />
                </button>
                <span className="qty-value mono">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                  aria-label="Sumar uno"
                >
                  <IconPlus />
                </button>
              </div>
              <span className="cart-item-total mono">{formatARS(item.price * item.quantity)}</span>
              <button
                type="button"
                className="remove-btn"
                onClick={() => removeOne(item)}
                aria-label={`Eliminar ${item.name}`}
              >
                <IconClose />
              </button>
            </li>
          ))}
        </ul>

        <aside className="cart-summary">
          <h2>Resumen de compra</h2>

          <div className="coupon-box">
            <form onSubmit={apply}>
              <input
                type="text"
                placeholder="Código de cupón"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                aria-label="Código de cupón"
              />
              <button type="submit" disabled={!couponInput.trim()}>Aplicar</button>
            </form>
            {appliedCoupon && (
              <div className="coupon-applied">
                <span>
                  Cupón <strong>{appliedCoupon}</strong> aplicado
                </span>
                <button type="button" onClick={removeCoupon} aria-label="Quitar cupón">
                  <IconClose />
                </button>
              </div>
            )}
          </div>

          <div className="summary-rows">
            <div className="summary-row">
              <span>Subtotal</span>
              <span className="mono">{formatARS(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="summary-row discount-row">
                <span>Descuento ({appliedCoupon})</span>
                <span className="mono">−{formatARS(discount)}</span>
              </div>
            )}
            {shippingEnabled && (
              <>
                <div className="summary-row">
                  <span>Envío</span>
                  <span className="mono">
                    {hasFreeShipping ? (
                      <span className="free-tag">GRATIS</span>
                    ) : (
                      formatARS(shippingCost)
                    )}
                  </span>
                </div>
                {!hasFreeShipping && (
                  <div className="free-shipping-hint">
                    <IconTruck />
                    Te faltan <strong>{formatARS(freeShippingThreshold - subtotal)}</strong> para el
                    envío gratis
                  </div>
                )}
              </>
            )}
          </div>

          <div className="summary-total-row">
            <span>Total</span>
            <span className="summary-total mono">{formatARS(total)}</span>
          </div>

          {onlinePayEnabled ? (
            <>
              <div className="buyer-box">
                <label htmlFor="buyer-name">Nombre y apellido</label>
                <input
                  id="buyer-name"
                  type="text"
                  autoComplete="name"
                  placeholder="Ej: Juan Pérez"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                />
                <label htmlFor="buyer-email">Email</label>
                <input
                  id="buyer-email"
                  type="email"
                  autoComplete="email"
                  placeholder="tumail@ejemplo.com"
                  value={buyerEmail}
                  onChange={(e) => setBuyerEmail(e.target.value)}
                />
              </div>

              <button
                type="button"
                className="primary-btn checkout-btn"
                onClick={checkout}
                disabled={checkingOut}
              >
                {checkingOut ? (
                  'Preparando pago…'
                ) : (
                  <>
                    <IconBolt />
                    Pagar con Mercado Pago
                  </>
                )}
              </button>
              {checkoutError && (
                <p role="alert" className="checkout-error">
                  {checkoutError}
                </p>
              )}
              <p className="mp-redirect-hint">
                Al confirmar, te llevamos a Mercado Pago para completar el pago.
              </p>

              <div className="secure-note">
                <IconLock />
                Compra protegida y pago seguro
              </div>
            </>
          ) : (
            <div className="mp-offline-note">
              <span className="mp-offline-title">
                Esta tienda no recibe pagos online
              </span>
              <p>Hacé tu pedido por WhatsApp y te lo preparamos.</p>
              {whatsappHref ? (
                <a
                  className="primary-btn checkout-btn mp-whatsapp-btn"
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pedir por WhatsApp
                </a>
              ) : (
                <p className="mp-offline-missing">
                  El negocio todavía no cargó su número de WhatsApp.
                </p>
              )}
            </div>
          )}
          <button type="button" className="ghost-btn" onClick={() => onNavigate('home')}>
            Seguir comprando
          </button>
        </aside>
      </div>
    </main>
  )
}