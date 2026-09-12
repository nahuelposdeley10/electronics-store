import { useEffect, useState } from 'react'
import CatalogProvider from './context/CatalogProvider'
import CartProvider from './context/CartProvider'
import { useCatalog } from './context/useCatalog'
import Header from './components/Header'
import Footer from './components/Footer'
import Toast from './components/Toast'
import WhatsAppButton from './components/WhatsAppButton'
import ProductCard from './components/ProductCard'
import { IconSearchOff } from './components/Icons'
import Home from './views/Home'
import CartView from './views/CartView'
import ProductDetail from './views/ProductDetail'
import OrderStatus from './views/OrderStatus'
import InfoPage from './views/InfoPage'
import Dashboard from './views/Dashboard'
import './App.css'

function pathToView() {
  if (window.location.pathname === '/admin') {
    return { name: 'dashboard' }
  }
  const params = new URLSearchParams(window.location.search)
  const status = params.get('status') || params.get('collection_status')
  if (status) {
    return {
      name: 'order-status',
      payload: { status, orderId: params.get('external_reference') },
    }
  }
  return null
}

function CatalogLoading() {
  return (
    <main className="catalog-loading" role="status">
      <span className="empty-draw">📦</span>
      <h1>Cargando catálogo…</h1>
      <p>Estamos acomodando la galería.</p>
    </main>
  )
}

function AppContent() {
  const { products, loading } = useCatalog()
  const [view, setView] = useState(() => pathToView() || { name: 'home' })

  useEffect(() => {
    const onPop = () => {
      setView(pathToView() || { name: 'home' })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = (name, payload) => {
    setView({ name, payload })
    if (name === 'dashboard') {
      window.history.pushState({}, '', '/admin')
    } else if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState({}, '', '/')
    }
  }

  const handleSearch = (query) => {
    const q = query.trim().toLowerCase()
    if (!q) {
      navigate('home')
      return
    }
    const results = products.filter((p) =>
      (p.name + ' ' + p.brand + ' ' + p.category).toLowerCase().includes(q),
    )
    navigate('results', results)
  }

  const openProduct = (product) => navigate('product', product)
  const openProductById = (id) => {
    const p = products.find((x) => x.id === Number(id))
    if (p) navigate('product', p)
  }

  const needsCatalog = ['home', 'product', 'results'].includes(view.name)
  if (needsCatalog && loading && products.length === 0) {
    return <CatalogLoading />
  }

  let content
  if (view.name === 'home') {
    content = <Home onView={openProduct} />
  } else if (view.name === 'product') {
    content = (
      <ProductDetail
        product={view.payload}
        onBack={() => navigate('home')}
        onHome={openProductById}
      />
    )
  } else if (view.name === 'cart') {
    content = <CartView onNavigate={(n) => navigate(n)} />
  } else if (view.name === 'order-status') {
    content = (
      <OrderStatus
        status={view.payload.status}
        orderId={view.payload.orderId}
        onNavigate={navigate}
      />
    )
  } else if (view.name === 'results') {
    content = view.payload.length === 0 ? (
      <main className="results results-empty">
        <span className="empty-draw">
          <IconSearchOff />
        </span>
        <h1>No encontramos nada</h1>
        <p>Probalo con otra marca, categoría o una palabra más corta.</p>
        <button type="button" className="primary-btn" onClick={() => navigate('home')}>
          Volver al inicio
        </button>
      </main>
    ) : (
      <main className="results">
        <div className="section-head">
          <h1>Resultados de búsqueda ({view.payload.length})</h1>
          <span className="count-tag">en la galería</span>
        </div>
        <div className="product-grid">
          {view.payload.map((product) => (
            <ProductCard key={product.id} product={product} onView={openProduct} />
          ))}
        </div>
      </main>
    )
  } else if (view.name === 'info') {
    content = <InfoPage slug={view.payload} onNavigate={navigate} />
  }

  return (
    <CartProvider>
      {view.name === 'dashboard' ? (
        <Dashboard onExit={() => navigate('home')} />
      ) : (
        <>
          <Header onNavigate={(n) => navigate(n)} view={view.name} onSearch={handleSearch} />
          {content}
          <Footer onNavigate={(n) => navigate(n)} />
          <Toast />
          <WhatsAppButton />
        </>
      )}
    </CartProvider>
  )
}

function App() {
  return (
    <CatalogProvider>
      <AppContent />
    </CatalogProvider>
  )
}

export default App