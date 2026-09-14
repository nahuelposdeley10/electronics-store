import { useCart } from '@/context/useCart'
import { formatARS, installmentsFor } from '@/data/format'
import { useSiteSettings, mergeSettings } from '@/lib/siteSettings'
import { productUrl } from '@/lib/urls'
import Stars from '@/components/Stars'
import { IconPlus, IconCross } from '@/components/Icons'

import './styles.css'

export default function ProductCard({ product, onView, offer = false, revealDelay }) {
  const { addItem } = useCart()
  const settings = mergeSettings(useSiteSettings())

  const delayProps =
    revealDelay !== undefined
      ? { 'data-reveal': 'up', style: { '--reveal-delay': `${revealDelay}ms` } }
      : {}

  const discount = product.oldPrice
    ? Math.round(100 - (product.price / product.oldPrice) * 100)
    : 0

  const lowStock = product.stock <= 5
  const inst = installmentsFor(product.price, settings.general.installments)
  const brand = ['audio', 'moviles', 'computacion', 'entretenimiento']
    .includes(product.category)
    ? product.brand
    : `${product.brand} · ${product.category}`

  return (
    <article className="product-box" {...delayProps}>
      <div
        className="box-media"
        role="link"
        tabIndex={0}
        aria-label={`Ver ${product.name}`}
        onClick={() => onView(product)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            onView(product)
          }
        }}
      >
        <img className="box-img" src={product.image} alt={product.name} loading="lazy" />
        {offer && discount > 0 && (
          <span className="tag-discount">{discount}% OFF</span>
        )}
        {product.freeShipping && (
          <span className="tag-shipping">Envío gratis</span>
        )}
        {product.badge && <span className="tag-flash">{product.badge}</span>}
        {lowStock && (
<span className="mark-stock">
              <IconCross className="cross" /> Quedan {product.stock}
            </span>
        )}
      </div>

      <div className="box-body">
        <span className="box-brand">{brand}</span>
        <h3 className="box-name">
          <a
            href={productUrl(product.id)}
            onClick={(e) => {
              e.preventDefault()
              onView(product)
            }}
          >
            {product.name}
          </a>
        </h3>

        <div className="box-rating">
          <Stars rating={product.rating} />
          <span className="rating-num">{product.rating.toFixed(1)}</span>
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
          <button type="button" className="add-btn" onClick={() => addItem(product)}>
            <IconPlus />
            Agregar
          </button>
        </div>
      </div>
    </article>
  )
}