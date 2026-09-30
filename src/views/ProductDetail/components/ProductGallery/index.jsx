import { useState } from 'react'
import { productImage } from '@/lib/productImage'
import { IconArrow, IconBack } from '@/components/Icons'
import './styles.css'

export default function ProductGallery({ product }) {
  const images = (product.images?.length ? product.images : [product.image]).slice(0, 3)
  const [selected, setSelected] = useState(0)
  const active = selected < images.length ? selected : 0
  return <div className="product-gallery">
    <div className="product-gallery-stage">
    <img className="product-gallery-main" src={productImage(images[active])} alt={`${product.name} · Imagen ${active + 1}`} />
    {images.length > 1 && <>
      <button type="button" className="product-gallery-nav product-gallery-prev" aria-label="Ver imagen anterior" onClick={() => setSelected((active - 1 + images.length) % images.length)}>
        <IconBack />
      </button>
      <button type="button" className="product-gallery-nav product-gallery-next" aria-label="Ver imagen siguiente" onClick={() => setSelected((active + 1) % images.length)}>
        <IconArrow />
      </button>
    </>}
    </div>
    {images.length > 1 && <div className="product-gallery-thumbnails" aria-label="Imágenes del producto">
      {images.map((url, index) => <button type="button" key={index} aria-label={`Ver imagen ${index + 1} de ${product.name}`} aria-pressed={active === index} onClick={() => setSelected(index)}>
        <img src={productImage(url)} alt="" />
      </button>)}
    </div>}
  </div>
}
