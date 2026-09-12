import { useCart } from '../context/useCart'
import { formatARS, installmentsFor } from '../data/format'
import { useSiteSettings, mergeSettings } from '../lib/siteSettings'
import { IconStar, IconPlus, IconCross } from './Icons'

function Stars({ rating }) {
  const full = Math.round(rating)
  return (
    <span className="stars" aria-label={`${rating.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar key={i} filled={i <= full} className="star" />
      ))}
    </span>
  )
}

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
      <div className="box-media" onClick={() => onView(product)}>
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
          <button type="button" onClick={() => onView(product)}>
            {product.name}
          </button>
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