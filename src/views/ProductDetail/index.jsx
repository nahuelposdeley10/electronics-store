import { useState } from 'react'
import { useCart } from '@/context/useCart'
import { useCatalog } from '@/context/useCatalog'
import { formatARS, installmentsFor } from '@/data/format'
import { useSiteSettings, mergeSettings } from '@/lib/siteSettings'
import {
  IconBack,
  IconBolt,
  IconCart,
  IconCheck,
  IconCross,
  IconTruck,
} from '@/components/Icons'
import Stars from '@/components/Stars'
import RelatedProducts from './components/RelatedProducts'

import './styles.css'

export default function ProductDetail({ product, onBack, onHome }) {
  const { addItem } = useCart()
  const { products } = useCatalog()
  const settings = mergeSettings(useSiteSettings())
  const [buyNow, setBuyNow] = useState(false)

  const inst = installmentsFor(product.price, settings.general.installments)
  const discount = product.oldPrice
    ? Math.round(100 - (product.price / product.oldPrice) * 100)
    : 0

  const related = products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 4)

  const handleBuyNow = () => {
    addItem(product)
    setBuyNow(true)
    setTimeout(() => setBuyNow(false), 2000)
  }

  return (
    <main className="detail">
      <button type="button" className="back-btn" onClick={() => onBack()}>
        <IconBack />
        Volver a la galería
      </button>

      <div className="detail-bay">
        <div className="detail-media">
          <img className="detail-img" src={product.image} alt={product.name} />
        </div>

        <div className="detail-info">
          <span className="box-brand">
            {product.brand} <em>· {product.category}</em>
          </span>
          <h1>{product.name}</h1>

          <div className="box-rating detail-rating">
            <Stars rating={product.rating} />
            <span className="rating-num">
              {product.rating.toFixed(1)} <em>· {product.stock} en stock</em>
            </span>
          </div>

          <p className="detail-desc">{product.description}</p>

          <div className="price-ticket">
            {product.oldPrice && (
              <span className="price-old">{formatARS(product.oldPrice)}</span>
            )}
            <div className="ticket-price">
              <span className="price-current big mono">{formatARS(product.price)}</span>
              {discount > 0 && <span className="tag-discount inline">{discount}% OFF</span>}
            </div>
            <span className="price-installments">
              Hasta {inst.count} cuotas de {formatARS(inst.value)} sin interés
            </span>
            {product.freeShipping && (
              <span className="tag-shipping stamp">
                <IconTruck /> Envío gratis
              </span>
            )}
          </div>

          <div className="detail-specs">
            {product.specs.map((s) => (
              <span key={s} className="spec-tag">
                {s}
              </span>
            ))}
          </div>

          <div className="detail-stock">
            {product.stock <= 5 ? (
              <span className="mark-stock">
                <IconCross className="cross" /> ¡Quedan solo {product.stock} unidades!
              </span>
            ) : (
              <span className="in-stock">
                <IconCheck /> En stock
              </span>
            )}
          </div>

          <div className="detail-actions">
            <button type="button" className="add-btn buy" onClick={handleBuyNow}>
              {buyNow ? (
                <>
                  <IconCheck /> Listo
                </>
              ) : (
                <>
                  <IconBolt /> Comprar ahora
                </>
              )}
            </button>
            <button type="button" className="ghost-btn" onClick={() => addItem(product)}>
              <IconCart />
              Agregar al carrito
            </button>
          </div>
        </div>
      </div>

      <RelatedProducts related={related} onHome={onHome} />
    </main>
  )
}