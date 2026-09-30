import './styles.css'

export default function StoreUnavailable({ temporary = false }) {
  return <main className="store-unavailable">
    <h1>{temporary ? 'No pudimos cargar la tienda' : 'Tienda no disponible'}</h1>
    <p>{temporary ? 'Revisá tu conexión e intentá nuevamente.' : 'Esta tienda no existe o se encuentra desactivada.'}</p>
    <button type="button" className="primary-btn" onClick={() => window.location.reload()}>Volver a intentar</button>
  </main>
}
