import { lazy, Suspense, useEffect, useState } from 'react'
import { parseLocation } from '@/lib/router'
import './styles/ui.css'

const CompanyHome = lazy(() => import('@/views/CompanyHome'))
const StoreApp = lazy(() => import('./StoreApp'))
const AccountActivation = lazy(() => import('@/views/AccountActivation'))

export default function App() {
  const [route, setRoute] = useState(parseLocation)
  useEffect(() => {
    const updateRoute = () => setRoute(parseLocation())
    window.addEventListener('popstate', updateRoute)
    return () => window.removeEventListener('popstate', updateRoute)
  }, [])
  const isCompany = route.name === 'company-home' || route.name === 'plans'
  return (
    <Suspense fallback={<main role="status" className="app-route-loading">Cargando…</main>}>
      {isCompany ? <CompanyHome legacyPlans={route.name === 'plans'} /> : route.name === 'account-activation' ? <AccountActivation token={route.payload?.token} /> : <StoreApp />}
    </Suspense>
  )
}
