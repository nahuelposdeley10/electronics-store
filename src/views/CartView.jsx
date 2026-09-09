import { useState } from 'react'
import { useCart } from '../context/useCart'
import { formatARS, installmentsFor } from '../data/format'
import {
  IconCart,
  IconClose,
  IconMinus,
  IconPlus,
  IconTrash,
  IconTruck,
  IconLock,
  IconBolt,
} from '../components/Icons'

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
    hasFreeShipping,
    freeShippingThreshold,
    total,
  } = useCart()

  const [couponInput, setCouponInput] = useState('')
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')

  const apply = (e) => {
    e.preventDefault()
    const ok = applyCoupon(couponInput)
    if (ok) setCouponInput('')
  }

  const checkout = async () => {
    if (items.length === 0 || checkingOut) return
    setCheckingOut(true)
    setCheckoutError('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({ id: item.id, quantity: item.quantity })),
          coupon: appliedCoupon,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'No se pudo iniciar el pago')
      window.location.href = data.init_point
    } catch (err) {
      setCheckoutError(err.message || 'Hubo un problema al iniciar el pago')
    } finally {
      setCheckingOut(false)
    }
  }

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

  const inst = installmentsFor(total)

  return (
    <main className="cart">
      <div className="cart-header">
        <h1>Tu carrito ({items.length})</h1>
        <button type="button" className="link-btn" onClick={clearCart}>
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
                onClick={() => removeItem(item.id)}
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
              <button type="submit">Aplicar</button>
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
          </div>

          <div className="summary-total-row">
            <span>Total</span>
            <span className="summary-total mono">{formatARS(total)}</span>
          </div>
          <div className="summary-installments mono">
            o {inst.count} cuotas de {formatARS(inst.value)}
          </div>

          <button
            type="button"
            className="primary-btn checkout-btn"
            onClick={checkout}
            disabled={checkingOut}
          >
            {checkingOut ? (
              'Iniciando pago…'
            ) : (
              <>
                <IconBolt />
                Finalizar compra
              </>
            )}
          </button>
          {checkoutError && (
            <p role="alert" className="checkout-error">
              {checkoutError}
            </p>
          )}
          <button type="button" className="ghost-btn" onClick={() => onNavigate('home')}>
            Seguir comprando
          </button>

          <div className="secure-note">
            <IconLock />
            Compra protegida y pago seguro
          </div>
        </aside>
      </div>
    </main>
  )
}