import { IconArrow, IconPhone, IconEdit, IconEye, IconTruck } from '@/components/Icons'
import { STORE_PAGES } from '../../storeNavigation.js'
import './styles.css'

const ICONS = { contact: IconPhone, content: IconEdit, design: IconEye, shipping: IconTruck }

export default function StoreHub({ onView, canView, storeUrl }) {
  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div><span className="dash-eyebrow">Tienda online</span><h1>¿Qué querés cambiar?</h1></div>
        {storeUrl && <a className="store-preview-cta" href={storeUrl} target="_blank" rel="noopener noreferrer" aria-label="Abrir vista previa de mi tienda en una nueva pestaña">
          <span className="store-preview-cta-icon"><IconEye /></span>
          <span className="store-preview-cta-copy"><small>Vista previa</small><strong>Ver mi tienda</strong><em>Abrir antes de revisar o publicar</em></span>
          <span className="store-preview-cta-arrow" aria-hidden="true">↗</span>
        </a>}
      </header>
      <p className="list-note">Todo lo que ven tus clientes, en un solo lugar. Elegí qué querés actualizar.</p>
      <div className="store-hub-grid">
        {STORE_PAGES.filter((page) => canView(page.id)).map((page) => {
          const Icon = ICONS[page.icon]
          return <button type="button" className="store-hub-card" key={page.id} onClick={() => onView(page.id)}>
            <span className="store-hub-icon"><Icon /></span>
            <span className="store-hub-copy"><span className="store-hub-label">{page.label}</span><strong>{page.task}</strong><span>{page.description}</span><small>{page.detail}</small></span>
            <IconArrow className="store-hub-arrow" />
          </button>
        })}
      </div>
      <aside className="store-hub-help">
        <h2>¿Buscás otra cosa?</h2>
        <p>Los precios, las fotos y el stock de cada producto se administran desde Productos e Inventario. Los cobros y el acceso de tu equipo están en Administración.</p>
        <p>Guardá los cambios en cada pantalla. En Colores y diseño, usá «Publicar diseño». Después abrí tu tienda para ver el resultado.</p>
      </aside>
    </div>
  )
}
