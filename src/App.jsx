import { lazy, Suspense, useEffect, useState } from 'react'
import { parseLocation } from '@/lib/router'
import './styles/ui.css'

const CompanyHome = lazy(() => import('@/views/CompanyHome'))
const StoreApp = lazy(() => import('./StoreApp'))
const AccountActivation = lazy(() => import('@/views/AccountActivation'))

export default function App({ initialRoute, CompanyHomeComponent = CompanyHome, companyYear } = {}) {
  const [route, setRoute] = useState(() => initialRoute || parseLocation())
  useEffect(() => {
    const updateRoute = () => setRoute(parseLocation())
    window.addEventListener('popstate', updateRoute)
    return () => window.removeEventListener('popstate', updateRoute)
  }, [])
  const isCompany = route.name === 'company-home' || route.name === 'plans'
  return (
    <Suspense fallback={<main role="status" className="app-route-loading">Cargando…</main>}>
      {isCompany ? <CompanyHomeComponent legacyPlans={route.name === 'plans'} initialYear={companyYear} /> : route.name === 'account-activation' ? <AccountActivation token={route.payload?.token} /> : <StoreApp />}
    </Suspense>
  )
}
