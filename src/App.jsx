import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import CatalogProvider from './context/CatalogProvider'
import CartProvider from './context/CartProvider'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmProvider'
import { useCatalog } from './context/useCatalog'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import Toast from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import CookieConsent from '@/components/CookieConsent'
import WhatsAppButton from '@/components/WhatsAppButton'
import ProductCard from '@/components/ProductCard'
import DashboardLoading from '@/components/DashboardLoading'
import { IconSearchOff } from '@/components/Icons'
import Home from '@/views/Home'
import CartView from '@/views/CartView'
import ProductDetail from '@/views/ProductDetail'
import OrderStatus from '@/views/OrderStatus'
import InfoPage from '@/views/InfoPage'
import { getTenantHeaders, storePathPrefix } from '@/lib/tenant'
import { getSession } from '@/lib/api'
import { parseLocation, urlForView } from '@/lib/router'
import { applySEO, seoMeta } from '@/lib/seo'
import { useSiteSettings, mergeSettings } from '@/lib/siteSettings'
import { initMotion } from '@/lib/motion'
import './styles/ui.css'

initMotion()

const Dashboard = lazy(() => import('./views/Dashboard'))

function CatalogLoading() {
  return (
    <main className="catalog-loading" role="status">
      <span className="empty-draw">📦</span>
      <h1>Cargando catálogo…</h1>
      <p>Estamos acomodando la galería.</p>
    </main>
  )
}

function productFromView(view, products) {
  if (view.name !== 'product') return null
  const payload = view.payload || {}
  if (payload.name) return payload
  return products.find((x) => x.id === Number(payload.id)) || null
}

function AppContent() {
  const { products, loading, search } = useCatalog()
  const settings = mergeSettings(useSiteSettings())
  const [view, setView] = useState(() => parseLocation())
  const [product, setProduct] = useState(() => productFromView(parseLocation(), []))
  const [productError, setProductError] = useState('')

  useEffect(() => {
    const onPop = () => {
      const next = parseLocation()
      setView(next)
      setProduct(productFromView(next, products))
      setProductError('')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [products])

  useEffect(() => {
    if (view.name !== 'product') return undefined
    const payload = view.payload || {}
    if (payload.name) return undefined
    const id = Number(payload.id)
    if (!Number.isFinite(id) || product) return undefined
    let alive = true
    fetch(`/api/products/${id}`, { headers: getTenantHeaders() })
      .then((res) => res.json())
      .then((data) => {
        if (!alive) return
        if (data.error) {
          setProductError(data.error)
        } else {
          setProduct(data)
        }
      })
      .catch(() => {
        if (alive) setProductError('No se pudo cargar el producto')
      })
    return () => {
      alive = false
    }
  }, [view, product])

  useEffect(() => {
    applySEO(seoMeta({ view, product: view.name === 'product' ? product : null, settings }))
  }, [view, product, settings])

  useEffect(() => {
    if (view.name === 'dashboard' && window.location.pathname !== '/admin') {
      window.history.replaceState({}, '', '/admin')
    }
  }, [view.name])

  const navigate = (name, payload) => {
    if (name === 'home' && !storePathPrefix()) name = 'dashboard'
    const url = urlForView(name, payload)
    setView({ name, payload })
    if (name === 'product') {
      setProduct(productFromView({ name, payload }, products))
    } else {
      setProductError('')
    }
    if (window.location.pathname + window.location.search !== url) {
      window.history.pushState({}, '', url)
    }
    window.scrollTo(0, 0)
  }

  const handleSearch = async (query) => {
    const q = query.trim()
    if (!q) {
      navigate('home')
      return
    }
    try {
      const items = await search(q)
      navigate('results', { items, error: '' })
    } catch {
      navigate('results', {
        items: [],
        error: 'No se pudo completar la búsqueda. Probá de nuevo.',
      })
    }
  }

  const openProduct = (product) => navigate('product', product)
  const openProductById = (id) => {
    const p = products.find((x) => x.id === Number(id))
    navigate('product', p || { id: Number(id) })
  }

  const tapeRef = useRef(null)

  useEffect(() => {
    const reduce = document.documentElement.classList.contains('anim-off')

    let tick = false
    let io
    const seen = new Set()
    const painted = new WeakSet()

    const updateTape = (p) => {
      tick = false
      const el = tapeRef.current
      if (el) el.style.transform = `scaleX(${p})`
    }

    const measure = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight
      const p = h > 0 ? Math.min(1, Math.max(0, window.scrollY / h)) : 0
      updateTape(p)
    }

    const onScroll = () => {
      if (!reduce && !tick) {
        tick = true
        window.requestAnimationFrame(measure)
      }
    }

    const reveal = (el) => {
      if (painted.has(el)) {
        el.classList.add('is-revealed')
        return
      }
      painted.add(el)
      window.requestAnimationFrame(() =>
        window.requestAnimationFrame(() => el.classList.add('is-revealed')),
      )
    }

    const configIO = () => {
      if (!io) {
        io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              const el = entry.target
              if (entry.isIntersecting) {
                const rect = el.getBoundingClientRect()
                el.classList.toggle('reveal-from-top', rect.top < window.innerHeight * 0.3)
                reveal(el)
              } else {
                el.classList.remove('is-revealed')
              }
            }
          },
          { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
        )
      }
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        if (!seen.has(el)) {
          seen.add(el)
          io.observe(el)
        }
      })
    }

    configIO()
    measure()
    const mo = new MutationObserver(configIO)
    mo.observe(document.documentElement, { childList: true, subtree: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      mo.disconnect()
      io?.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [view.name])

  const needsCatalog = ['home', 'product', 'results'].includes(view.name)
  if (needsCatalog && loading && products.length === 0) {
    return <CatalogLoading />
  }

  let content
  if (view.name === 'home') {
    content = <Home onView={openProduct} />
  } else if (view.name === 'product') {
    const payload = view.payload || {}
    const invalidId = !payload.name && !Number.isFinite(Number(payload.id))
    content = invalidId || productError ? (
      <main className="results results-empty">
        <span className="empty-draw">
          <IconSearchOff />
        </span>
        <h1>Producto no encontrado</h1>
        <p>{productError || 'Este producto no está disponible.'}</p>
        <button type="button" className="primary-btn" onClick={() => navigate('home')}>
          Volver al inicio
        </button>
      </main>
    ) : product ? (
      <ProductDetail
        product={product}
        onBack={() => navigate('home')}
        onHome={openProductById}
      />
    ) : (
      <main className="catalog-loading" role="status">
        <span className="empty-draw">📦</span>
        <h1>Cargando producto…</h1>
      </main>
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
    const { items, error } = view.payload
    content = items.length === 0 ? (
      <main className="results results-empty">
        <span className="empty-draw">
          <IconSearchOff />
        </span>
        <h1>{error || 'No encontramos nada'}</h1>
        <p>
          {error
            ? 'Revisá tu conexión y probá de nuevo.'
            : 'Probalo con otra marca, categoría o una palabra más corta.'}
        </p>
        <button type="button" className="primary-btn" onClick={() => navigate('home')}>
          Volver al inicio
        </button>
      </main>
    ) : (
      <main className="results">
        <div className="section-head">
          <h1>Resultados de búsqueda ({items.length})</h1>
          <span className="count-tag">en la galería</span>
        </div>
        <div className="product-grid">
          {items.map((product) => (
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
      <Toast />
      <ConfirmDialog />
      {view.name === 'dashboard' ? (
        <Suspense fallback={<DashboardLoading />}>
          <Dashboard
            onExit={() => {
              const { user } = getSession()
              if (user?.role === 'admin' && user?.businessSlug) {
                window.location.assign(`/u/${user.businessSlug}`)
                return
              }
              navigate('dashboard')
            }}
          />
        </Suspense>
      ) : (
        <>
          <div className="scroll-tape" ref={tapeRef} aria-hidden="true" />
          <Header onNavigate={navigate} view={view.name} onSearch={handleSearch} />
          {content}
          <Footer onNavigate={navigate} />
          <WhatsAppButton />
          <CookieConsent onNavigate={navigate} />
        </>
      )}
    </CartProvider>
  )
}

function App() {
  return (
    <CatalogProvider>
      <ToastProvider>
        <ConfirmProvider>
          <AppContent />
        </ConfirmProvider>
      </ToastProvider>
    </CatalogProvider>
  )
}

export default App