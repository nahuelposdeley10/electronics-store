import { useEffect, useRef, useState } from 'react'
import { useCart } from '@/context/useCart'
import { formatARS, installmentsFor } from '@/data/format'
import { useSiteSettings, mergeSettings } from '@/lib/siteSettings'
import { productUrl } from '@/lib/urls'
import { productImage } from '@/lib/productImage'
import Stars from '@/components/Stars'
import { IconCart, IconCheck, IconCross } from '@/components/Icons'

import './styles.css'

export default function ProductCard({ product, onView, offer = false, revealDelay, demo = false }) {
  const { addItem } = useCart()
  const settings = mergeSettings(useSiteSettings())
  const [added, setAdded] = useState(false)
  const addedTimer = useRef(null)

  useEffect(() => () => {
    if (addedTimer.current) window.clearTimeout(addedTimer.current)
  }, [])

  const productName = String(product.name || '').trim() || 'Producto sin nombre'
  const productBrand = String(product.brand || '').trim() || 'Sin marca'
  const productCategory = String(product.category || '').trim() || 'General'
  const rating = Number(product.rating) || 0
  const stock = Math.max(0, Number(product.stock) || 0)
  const outOfStock = stock <= 0

  const delayProps =
    revealDelay !== undefined
      ? { 'data-reveal': 'up', style: { '--reveal-delay': `${revealDelay}ms` } }
      : {}

  const discount = product.oldPrice
    ? Math.round(100 - (product.price / product.oldPrice) * 100)
    : 0

  const lowStock = stock > 0 && stock <= 5
  const inst = installmentsFor(product.price, settings.general.installments)
  const brand = ['audio', 'moviles', 'computacion', 'entretenimiento']
    .includes(product.category)
    ? productBrand
    : `${productBrand} · ${productCategory}`

  const handleAdd = () => {
    if (!addItem(product)) return
    setAdded(true)
    if (addedTimer.current) window.clearTimeout(addedTimer.current)
    addedTimer.current = window.setTimeout(() => setAdded(false), 1100)
  }

  return (
    <article className="product-box" {...delayProps}>
      <div
        className={`box-media${demo ? ' is-demo' : ''}`}
        role={demo ? undefined : 'link'}
        tabIndex={demo ? undefined : 0}
        aria-label={demo ? `${productName}, producto de ejemplo` : `Ver ${productName}`}
        onClick={demo ? undefined : () => onView(product)}
        onKeyDown={demo ? undefined : (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onView(product)
          }
        }}
      >
        <img className="box-img" src={productImage(product.image)} alt={productName} loading="lazy" />
        {offer && discount > 0 && (
          <span className="tag-discount">{discount}% OFF</span>
        )}
        {product.freeShipping && (
          <span className="tag-shipping">Envío gratis</span>
        )}
        {product.badge && <span className="tag-flash">{product.badge}</span>}
        {outOfStock ? (
          <span className="mark-stock is-out">Sin stock</span>
        ) : lowStock && (
          <span className="mark-stock">
            <IconCross className="cross" /> {stock === 1 ? 'Última unidad' : `Quedan ${stock}`}
          </span>
        )}
      </div>

      <div className="box-body">
        <span className="box-brand">{brand}</span>
        <h3 className="box-name">
          {demo ? <span>{product.name}</span> : (
            <a
              href={productUrl(product.id)}
              onClick={(e) => {
                e.preventDefault()
                onView(product)
              }}
            >
              {productName}
            </a>
          )}
        </h3>

        <div className="box-rating">
          <Stars rating={rating} />
          <span className="rating-num">{rating.toFixed(1)}</span>
        </div>

        <div className="box-footer">
          <div className="box-price">
            {product.oldPrice && (
              <span className="price-old">{formatARS(product.oldPrice)}</span>
            )}
            {offer && discount > 0 ? (
              <span className="price-tag-line">
                <span className="price-current mono">{formatARS(product.price)}</span>
                <span className="tag-discount inline">{discount}% OFF</span>
              </span>
            ) : (
              <span className="price-current mono">{formatARS(product.price)}</span>
            )}
            <span className="price-installments">
              o {inst.count} cuotas de {formatARS(inst.value)}
            </span>
          </div>
          {demo ? (
            <span className="demo-product-label">Vista de ejemplo</span>
          ) : (
            <button
              type="button"
              className={`add-btn add-btn-icon${added ? ' is-added' : ''}${outOfStock ? ' is-disabled' : ''}`}
              aria-label={outOfStock ? `${productName} sin stock` : added ? `${productName} agregado al carrito` : `Agregar ${productName} al carrito`}
              title={outOfStock ? 'Sin stock' : added ? 'Agregado al carrito' : 'Agregar al carrito'}
              onClick={handleAdd}
              disabled={outOfStock}
            >
              {added ? <IconCheck /> : <IconCart />}
            </button>
          )}
        </div>
      </div>
    </article>
  )
}
