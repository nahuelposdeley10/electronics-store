import { IconStorefront, IconRefresh } from '@/components/Icons'
import './styles.css'

export default function StoreUnavailable({ temporary = false }) {
  return <main className="store-unavailable">
    <div className="store-unavailable-icon" aria-hidden="true"><IconStorefront /></div>
    <h1>{temporary ? 'No pudimos cargar la tienda' : 'Tienda temporalmente no disponible'}</h1>
    <p>{temporary ? 'Revisá tu conexión e intentá nuevamente.' : 'Esta tienda no est? disponible en este momento. Por favor, intent? nuevamente m?s tarde.'}</p>
    <button type="button" className="primary-btn" onClick={() => window.location.reload()}><IconRefresh /> Volver a intentar</button>
  </main>
}
