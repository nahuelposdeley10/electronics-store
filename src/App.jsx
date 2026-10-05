import { lazy, Suspense, useEffect, useState } from 'react'
import { parseLocation } from '@/lib/router'
import { getSession } from '@/lib/api'
import { ToastProvider } from '@/context/ToastContext'
import { ConfirmProvider } from '@/context/ConfirmProvider'
import Toast from '@/components/Toast'
import ConfirmDialog from '@/components/ConfirmDialog'
import DashboardLoading from '@/components/DashboardLoading'
import './styles/ui.css'

const CompanyHome = lazy(() => import('@/views/CompanyHome'))
const StoreApp = lazy(() => import('./StoreApp'))
const Dashboard = lazy(() => import('@/views/Dashboard'))
const AccountActivation = lazy(() => import('@/views/AccountActivation'))

function DashboardRoute() {
  const onExit = () => {
    const { user } = getSession()
    if (user?.role === 'admin' && user?.businessSlug) {
      window.location.assign(`/u/${user.businessSlug}`)
    }
  }

  return (
    <ToastProvider>
      <ConfirmProvider>
        <Suspense fallback={<DashboardLoading />}>
          <Dashboard onExit={onExit} />
        </Suspense>
        <Toast />
        <ConfirmDialog />
      </ConfirmProvider>
    </ToastProvider>
  )
}

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
      {isCompany
        ? <CompanyHomeComponent legacyPlans={route.name === 'plans'} initialYear={companyYear} />
        : route.name === 'account-activation'
          ? <AccountActivation token={route.payload?.token} />
          : route.name === 'dashboard'
            ? <DashboardRoute />
            : <StoreApp />}
    </Suspense>
  )
}
