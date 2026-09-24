import { productUrl } from '@/lib/urls'
import { formatARS } from '@/data/format'
import { productImage } from '@/lib/productImage'

import './styles.css'

export default function RelatedProducts({ related, onHome }) {
  if (!related || related.length === 0) return null
  return (
    <section className="related">
      <div className="section-head">
        <h2>Productos relacionados</h2>
        <span className="count-tag">{related.length} en la misma góndola</span>
      </div>
      <div className="related-simple">
        {related.map((p) => (
          <a
            key={p.id}
            href={productUrl(p.id)}
            className="related-card"
            onClick={(e) => {
              e.preventDefault()
              onHome(p.id)
            }}
          >
            <img className="related-img" src={productImage(p.image)} alt={p.name} loading="lazy" />
            <span className="related-name">{p.name}</span>
            <span className="related-price mono">{formatARS(p.price)}</span>
          </a>
        ))}
      </div>
    </section>
  )
}