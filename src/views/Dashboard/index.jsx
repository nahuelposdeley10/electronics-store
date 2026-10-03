import { useEffect, useState } from 'react'
import { apiGet, clearSession, getSession, login as apiLogin } from '@/lib/api'
import { useOrderEvents } from '@/lib/useOrderEvents'
import { clearSuperTenant, getSuperTenant, setSuperTenant } from '@/lib/tenant'
import { onboardingMode } from '@/lib/onboardingEntry'
import {
  IconBack,
  IconBox,
  IconCard,
  IconCash,
  IconChart,
  IconChevron,
  IconInventory,
  IconLock,
  IconLogout,
  IconReport,
  IconMoon,
  IconSun,
  IconTicket,
  IconWrench,
  IconEye,
} from '@/components/Icons'
import DashboardLoading from '@/components/DashboardLoading'
import { initials, ROLE_LABELS } from './consts.js'
import {
  CashCurrentScreen,
  CashMovementsScreen,
  CashShiftScreen,
  CashCountScreen,
} from './components/cash'
import { SalesScreen, ReturnsScreen, QuotesScreen } from './components/sales'
import { PosScreen } from './components/pos'
import {
  ProductsScreen,
  MetaScreen,
  ImportScreen,
  OffersScreen,
} from './components/products'
import {
  StockScreen,
  MovementsScreen,
  AdjustmentsScreen,
  PurchasesScreen,
  MinStockScreen,
  PhysicalInventoryScreen,
} from './components/stock'
import {
  OverviewScreen,
  SalesReportScreen,
  ProductsReportScreen,
  ProfitReportScreen,
  StockReportScreen,
  CustomersReportScreen,
} from './components/reports'
import { CouponsScreen } from './components/marketing'
import { BusinessesScreen, UsersScreen, RolesScreen } from './components/users'
import { PaymentsScreen, StoreScreen, GeneralScreen } from './components/settings'
import AppearanceScreen from './components/appearance'
import StoreHub from './components/storeHub'
import Onboarding from './components/onboarding'
import { STORE_PAGES, isNavGroupActive } from './storeNavigation.js'

import './styles.css'

const SCREEN_PERMS = {
  onboarding: 'settings.manage',
  products: 'catalog.manage',
  'product-categories': 'catalog.manage',
  'product-brands': 'catalog.manage',
  'product-import': 'catalog.manage',
  'promo-coupons': 'coupons.manage',
  'promo-offers': 'offers.manage',
  'sales-pos': 'pos.manage',
  'sales-history': 'sales.read',
  'sales-returns': 'sales.return',
  'sales-quotes': 'quotes.delete',
  'stock-adjustments': 'inventory.write',
  'stock-overview': 'inventory.read',
  'stock-movements': 'inventory.read',
  'stock-purchases': 'inventory.write',
  'stock-min': 'inventory.write',
  'stock-physical': 'inventory.write',
  'cash-current': 'cash.manage',
  'cash-movements': 'cash.manage',
  'cash-openclose': 'cash.manage',
  'cash-counts': 'cash.manage',
  'settings-users': 'users.manage',
  'settings-roles': 'settings.manage',
  'settings-payments': 'settings.manage',
  'settings-store': 'settings.manage',
  'settings-content': 'settings.manage',
  'settings-hub': 'settings.manage',
  'settings-general': 'settings.manage',
  'settings-appearance': 'settings.manage',
  'report-sales': 'reports.view',
  'report-products': 'reports.view',
  'report-profit': 'reports.view',
  'report-stock': 'reports.view',
  'report-customers': 'reports.view',
}

const PLAN_LEVEL = { inicial: 1, profesional: 2, negocio: 3 }
const SCREEN_PLANS = {
  'settings-payments': 'profesional',
  'settings-roles': 'negocio',
}

export default function Dashboard({ onExit }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('ts-admin-theme')
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  const [collapsedGroups, setCollapsedGroups] = useState(() => new Set())
  const [screen, setScreen] = useState(
    () => sessionStorage.getItem('ts-admin-screen') || 'overview',
  )
  const [gate, setGate] = useState(() => (getSession().token ? 'loading' : 'login'))
  const [gateError, setGateError] = useState('')
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [overview, setOverview] = useState(null)
  const [user, setUser] = useState(() => getSession().user)
  const [perms, setPerms] = useState(() => {
    const session = getSession()
    return session.user?.role === 'superadmin'
      ? [
          'settings.manage',
          'users.manage',
          'catalog.manage',
          'coupons.manage',
          'offers.manage',
          'inventory.write',
          'sales.return',
          'quotes.delete',
          'cash.manage',
          'inventory.read',
          'sales.read',
          'reports.view',
        ]
      : []
  })
  const [attempt, setAttempt] = useState(0)
  const [superTenant, setSuperTenantState] = useState(() => getSuperTenant())
  const [copiedStoreUrl, setCopiedStoreUrl] = useState(false)
  const userIsSuper = user?.role === 'superadmin'
  const canOnboard = (userIsSuper || user?.role === 'admin') && (userIsSuper || perms.includes('settings.manage'))
  const planAllows = (id) => {
    if (userIsSuper || !SCREEN_PLANS[id] || !user?.planCode) return true
    return (PLAN_LEVEL[user.planCode] || 0) >= PLAN_LEVEL[SCREEN_PLANS[id]]
  }
  const canView = (id) =>
    (id !== 'onboarding' || canOnboard) &&
    (id !== 'settings-appearance' || userIsSuper || user?.role === 'admin') &&
    planAllows(id) &&
    (userIsSuper || !SCREEN_PERMS[id] || (perms || []).includes(SCREEN_PERMS[id]))
  const activeScreen = canView(screen) ? screen : 'overview'
  const setupMode = onboardingMode({ role: user?.role, canConfigure: canOnboard, screen: activeScreen, tenantId: superTenant })
  // El superadmin trabaja en modo agregado por defecto. La selección de un local
  // queda disponible desde la pantalla de negocios, pero nunca bloquea el panel.
  const needsBusiness = false
  const businessBlock = false

  const storeUrl = () =>
    user?.businessSlug ? `${window.location.origin}/u/${user.businessSlug}` : ''

  const copyStoreUrl = () => {
    const url = storeUrl()
    if (!url) return
    navigator.clipboard
      ?.writeText(url)
      .then(() => {
        setCopiedStoreUrl(true)
        setTimeout(() => setCopiedStoreUrl(false), 1600)
      })
      .catch(() => console.warn('No se pudo copiar el enlace de la tienda'))
  }

  const changeTheme = (nextTheme) => {
    setTheme(nextTheme)
    localStorage.setItem('ts-admin-theme', nextTheme)
  }

  const openNavItem = (item) => {
    if (!item.children) {
      changeScreen(item.id)
      return
    }
    const active = isNavGroupActive(item, activeScreen)
    const expanded = active && !collapsedGroups.has(item.id)
    setCollapsedGroups((current) => {
      const next = new Set(current)
      if (expanded) next.add(item.id)
      else next.delete(item.id)
      return next
    })
    if (!active) changeScreen(item.landing || item.children[0].id)
  }

  useEffect(() => {
    let alive = true
    if (!getSession().token) return undefined
    apiGet('/api/auth/me')
      .then((data) => {
        if (!alive) return
        setUser(data.user || getSession().user)
        setPerms(data.perms || [])
      })
      .catch((err) => console.warn('No se pudo refrescar la sesión', err?.code))
    return () => {
      alive = false
    }
  }, [attempt, loginAttempts])

  useEffect(() => {
    let alive = true
    if (!getSession().token) return undefined
    if (needsBusiness) return undefined
    apiGet('/api/admin/overview')
      .then((data) => {
        if (!alive) return
        setOverview(data)
        setGate('ready')
      })
      .catch((err) => {
        if (!alive) return
        if (err.code === 'AUTH') {
          clearSession()
          setGate('login')
          setGateError('Tu sesión expiró. Entrá de nuevo.')
        } else {
          setGate('error')
          setGateError(err.message)
        }
      })
    return () => {
      alive = false
    }
  }, [attempt, needsBusiness])

  const changeScreen = (id) => {
    if (!canView(id)) return
    setScreen(id)
    sessionStorage.setItem('ts-admin-screen', id)
  }

  const can = (code) =>
    userIsSuper ? Boolean(superTenant) : (perms || []).includes(code)

  const retry = () => {
    setGate('loading')
    setGateError('')
    setAttempt((n) => n + 1)
  }

  const handleLogin = (email, password) => {
    setLoginAttempts((n) => n + 1)
    setGate('loading')
    setGateError('')
    apiLogin(email, password)
      .then((loggedUser) => {
        if (getSession().token) {
          setUser(loggedUser)
          setScreen('overview')
          sessionStorage.setItem('ts-admin-screen', 'overview')
          setLoginAttempts(0)
          setAttempt((n) => n + 1)
        }
      })
      .catch((err) => {
        if (err.code === 'AUTH') {
          setGate('login')
          setGateError(err.message)
        } else {
          setGate('error')
          setGateError(err.message)
        }
      })
  }

  const handleLogout = () => {
    clearSession()
    clearSuperTenant()
    sessionStorage.removeItem('ts-admin-screen')
    setScreen('overview')
    setSuperTenantState(null)
    setUser(null)
    setPerms([])
    setOverview(null)
    setGate('login')
  }

  useOrderEvents(
    () => {
      setAttempt((n) => n + 1)
    },
    gate === 'ready' && !needsBusiness && activeScreen === 'overview',
  )

  const NAV = [
    ...(userIsSuper
      ? [
          {
            id: 'businesses',
            label: 'Negocios',
            icon: IconReport,
            prefix: 'business-',
            children: [
              {
                id: 'businesses',
                label: superTenant ? 'Cambiar de negocio' : 'Elegir negocio',
              },
            ],
          },
        ]
      : []),
    { id: 'overview', label: 'Panel', icon: IconChart },
    ...(canOnboard ? [{ id: 'onboarding', label: userIsSuper ? 'Asistir a negocio' : 'Puesta en marcha', icon: IconWrench }] : []),
    {
      id: 'products',
      label: 'Productos',
      icon: IconBox,
      prefix: 'product-',
      children: [
        { id: 'products', label: 'Productos', require: 'catalog.manage' },
        { id: 'product-categories', label: 'Categorías', require: 'catalog.manage' },
        { id: 'product-brands', label: 'Marcas', require: 'catalog.manage' },
        { id: 'product-import', label: 'Importar productos', require: 'catalog.manage' },
      ],
    },
    {
      id: 'promos',
      label: 'Promociones',
      icon: IconTicket,
      prefix: 'promo-',
      children: [
        { id: 'promo-coupons', label: 'Cupones', require: 'coupons.manage' },
        { id: 'promo-offers', label: 'Ofertas', require: 'offers.manage' },
      ],
    },
    {
      id: 'sales',
      label: 'Ventas',
      icon: IconCard,
      prefix: 'sales-',
      landing: 'sales-history',
      children: [
        { id: 'sales-pos', label: 'Nueva venta / POS', require: 'pos.manage' },
        { id: 'sales-history', label: 'Historial de ventas' },
        { id: 'sales-returns', label: 'Devoluciones', require: 'sales.return' },
        { id: 'sales-quotes', label: 'Presupuestos', require: 'quotes.delete' },
      ],
    },
    {
      id: 'inventory',
      label: 'Inventario',
      icon: IconInventory,
      prefix: 'stock-',
      children: [
        { id: 'stock-overview', label: 'Stock' },
        { id: 'stock-movements', label: 'Movimientos' },
        { id: 'stock-adjustments', label: 'Ajustes', require: 'inventory.write' },
        { id: 'stock-purchases', label: 'Compras', require: 'inventory.write' },
        { id: 'stock-min', label: 'Stock mínimo', require: 'inventory.write' },
        { id: 'stock-physical', label: 'Inventario físico', require: 'inventory.write' },
      ],
    },
    {
      id: 'cash',
      label: 'Caja',
      icon: IconCash,
      prefix: 'cash-',
      children: [
        { id: 'cash-current', label: 'Caja actual', require: 'cash.manage' },
        { id: 'cash-movements', label: 'Movimientos', require: 'cash.manage' },
        { id: 'cash-openclose', label: 'Apertura / cierre', require: 'cash.manage' },
        { id: 'cash-counts', label: 'Arqueos', require: 'cash.manage' },
      ],
    },
    {
      id: 'reports',
      label: 'Reportes',
      icon: IconReport,
      prefix: 'report-',
      children: [
        { id: 'report-sales', label: 'Ventas' },
        { id: 'report-products', label: 'Productos' },
        { id: 'report-profit', label: 'Ganancias' },
        { id: 'report-stock', label: 'Stock' },
        { id: 'report-customers', label: 'Clientes' },
      ],
    },
    {
      id: 'storefront',
      label: 'Tienda online',
      icon: IconEye,
      children: [
        { id: 'settings-hub', label: 'Qué querés cambiar' },
        ...STORE_PAGES,
      ],
    },
    {
      id: 'settings',
      label: 'Administración',
      icon: IconWrench,
      prefix: 'settings-',
      children: [
        { id: 'settings-users', label: 'Usuarios', require: 'users.manage' },
        { id: 'settings-roles', label: 'Permisos por usuario', require: 'settings.manage' },
        { id: 'settings-payments', label: 'Medios de pago', require: 'settings.manage' },
      ],
    },
  ].filter((item) => !item.children || item.children.length > 0)

  const visibleNav = NAV.map((item) => ({
    ...item,
    children: item.children ? item.children.filter((child) => canView(child.id)) : undefined,
  })).filter((item) => !item.children || item.children.length > 0)

  if (gate === 'loading' && !needsBusiness) return <DashboardLoading />

  return (
    <div className={`dash theme-${theme}`}>
      {gate !== 'login' && (
        <aside className="dash-side">
        {user && (
          <div className="dash-side-user dash-side-user-top">
            <span className="user-avatar mono" aria-hidden="true">{initials(user.name)}</span>
            <span className="user-meta">
              <strong>{user.name}</strong>
              <em>{user.email}</em>
            </span>
            <span className={`role-chip role-${user.role}`}>{ROLE_LABELS[user.role] || user.role}</span>
          </div>
        )}

        <nav className="dash-nav" aria-label="Panel de administración">
          {visibleNav.map((item) => {
            const active = isNavGroupActive(item, activeScreen)
            const expanded = Boolean(item.children && active && !collapsedGroups.has(item.id))
            return (
              <div key={item.id} className="dash-nav-group">
                  <button
                    type="button"
                    className={`dash-nav-item${active ? ' active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                    aria-expanded={item.children ? expanded : undefined}
                    title={item.children ? 'Abrir o cerrar submenú' : undefined}
                    onClick={() => openNavItem(item)}
                >
                  <item.icon />
                  <span>{item.label}</span>
                  {item.children && <IconChevron className={`dash-nav-chevron${expanded ? ' expanded' : ''}`} />}
                </button>
                {expanded && (
                  <div className="dash-nav-sub">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className={`dash-nav-sub-item${activeScreen === child.id ? ' active' : ''}`}
                        aria-current={activeScreen === child.id ? 'page' : undefined}
                        onClick={() => changeScreen(child.id)}
                      >
                        {child.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {user?.businessSlug && (
          <div className="dash-side-store">
            <div className="dash-side-store-head">
              <span className="dash-side-store-status" aria-hidden="true" />
              <span className="dash-side-store-label">Tu tienda está online</span>
            </div>
            {user.businessSlug ? (
              <>
                <span className="dash-side-store-hint">Compartí esta dirección con tus clientes</span>
                <a
                  className="dash-side-store-url mono"
                  href={storeUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={storeUrl()}
                >
                  {storeUrl().replace(/^https?:\/\//, '')}
                </a>
                <div className="dash-side-store-actions">
                  <button
                    type="button"
                    className={`dash-side-store-copy${copiedStoreUrl ? ' is-copied' : ''}`}
                    onClick={copyStoreUrl}
                    aria-live="polite"
                  >
                    {copiedStoreUrl ? '¡URL copiada!' : 'Copiar URL'}
                  </button>
                  <a className="dash-side-store-open" href={storeUrl()} target="_blank" rel="noopener noreferrer">
                    <IconEye />
                    Ver tienda
                  </a>
                </div>
              </>
            ) : (
              <span className="dash-side-store-empty">
                Sin URL configurada. Pedile al súper admin que la cargue.
              </span>
            )}
          </div>
        )}

        <div className="dash-side-foot">
          <div className="dash-theme" role="group" aria-label="Tema del panel">
            <button type="button" className={theme === 'light' ? 'active' : ''} aria-pressed={theme === 'light'} onClick={() => changeTheme('light')}>
              <IconSun />
              Claro
            </button>
            <button type="button" className={theme === 'dark' ? 'active' : ''} aria-pressed={theme === 'dark'} onClick={() => changeTheme('dark')}>
              <IconMoon />
              Oscuro
            </button>
          </div>
          {user?.role === 'admin' && user?.businessSlug && (
            <button type="button" className="dash-exit" onClick={onExit}>
              <IconBack />
              Volver a la tienda
            </button>
          )}
          {user && (
            <button type="button" className="dash-logout" onClick={handleLogout}>
              <IconLogout />
              Salir
            </button>
          )}
        </div>
      </aside>
      )}

      <main className="dash-main">
        {gate === 'ready' && !businessBlock && STORE_PAGES.some((page) => page.id === activeScreen) && (
          <div className="dash-store-shortcuts" aria-label="Accesos de tienda online">
            <button type="button" className="ghost-btn" onClick={() => changeScreen('settings-hub')}><IconBack />Qué querés cambiar</button>
            {user?.role === 'admin' && user?.businessSlug && <a className="store-preview-cta" href={storeUrl()} target="_blank" rel="noopener noreferrer" aria-label="Abrir vista previa de mi tienda en una nueva pestaña">
              <span className="store-preview-cta-icon"><IconEye /></span>
              <span className="store-preview-cta-copy"><small>Vista previa</small><strong>Ver mi tienda</strong><em>Abrir antes de revisar o publicar</em></span>
              <span className="store-preview-cta-arrow" aria-hidden="true">↗</span>
            </a>}
          </div>
        )}
        {gate === 'ready' && setupMode && <Onboarding key={`${user?.id}:${superTenant || 'own'}`} screen={activeScreen} role={user?.role} userId={user?.id} assistance={setupMode === 'assistance'} onView={changeScreen} canView={canView} onBusinessSaved={() => setAttempt((n) => n + 1)} />}
        {gate === 'ready' && activeScreen === 'onboarding' && userIsSuper && !superTenant && <section className="dash-screen"><h1>Asistir a un negocio</h1><p>Elegí el comercio al que querés ayudar. Esta guía configura su tienda, no tu cuenta de dueño general.</p><button className="primary-btn" type="button" onClick={() => changeScreen('businesses')}>Elegir negocio</button></section>}
        {userIsSuper && (activeScreen === 'businesses' || businessBlock) && (
          <BusinessesScreen
            current={superTenant}
            onCreateAdmin={() => changeScreen('settings-users')}
            onPick={(id) => {
              if (id) setSuperTenant(id)
              else clearSuperTenant()
              setSuperTenantState(id)
              setAttempt((n) => n + 1)
              changeScreen('overview')
            }}
          />
        )}
        {gate === 'login' && (
          <LoginPanel attempts={loginAttempts} error={gateError} onLogin={handleLogin} />
        )}

        {gate === 'error' && (
          <div className="dash-screen dash-unlock">
            <div className="unlock-card">
              <span className="unlock-icon">
                <IconChart />
              </span>
              <span className="dash-eyebrow">Caja fuera de línea</span>
              <h1>No pudimos leer el panel</h1>
              <p>{gateError}. Verificá que el servidor esté levantado.</p>
              <button
                type="button"
                className="primary-btn"
                onClick={retry}
              >
                Reintentar
              </button>
            </div>
          </div>
        )}

        {gate === 'ready' && !needsBusiness && overview && activeScreen === 'overview' && (
          <OverviewScreen data={overview} onView={changeScreen} />
        )}
        {gate === 'ready' && activeScreen === 'products' && (
          <ProductsScreen
            canManage={can('catalog.manage')}
            canInventory={can('inventory.write')}
            canCash={can('cash.manage')}
          />
        )}
        {gate === 'ready' && activeScreen === 'product-categories' && (
          <MetaScreen
            kind="categories"
            title="Categorías"
            eyebrow="Estantería"
            empty="Todavía no hay categorías."
            canManage={can('catalog.manage')}
          />
        )}
        {gate === 'ready' && activeScreen === 'product-brands' && (
          <MetaScreen
            kind="brands"
            title="Marcas"
            eyebrow="Estantería"
            empty="Todavía no hay marcas."
            canManage={can('catalog.manage')}
          />
        )}
        {gate === 'ready' && activeScreen === 'product-import' && (
          <ImportScreen canManage={can('catalog.manage')} />
        )}
        {gate === 'ready' && activeScreen === 'promo-coupons' && (
          <CouponsScreen canManage={can('coupons.manage')} />
        )}
        {gate === 'ready' && activeScreen === 'promo-offers' && (
          <OffersScreen canManage={can('offers.manage')} />
        )}
        {gate === 'ready' && activeScreen === 'sales-pos' && (
          <PosScreen canManage={can('pos.manage')} />
        )}
        {gate === 'ready' && activeScreen === 'sales-history' && <SalesScreen />}
        {gate === 'ready' && activeScreen === 'sales-returns' && (
          <ReturnsScreen canManage={can('sales.return')} />
        )}
        {gate === 'ready' && activeScreen === 'sales-quotes' && (
          <QuotesScreen canManage={can('quotes.delete')} />
        )}
        {gate === 'ready' && activeScreen === 'stock-overview' && (
          <StockScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && activeScreen === 'stock-movements' && <MovementsScreen />}
        {gate === 'ready' && activeScreen === 'stock-adjustments' && (
          <AdjustmentsScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && activeScreen === 'stock-purchases' && (
          <PurchasesScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && activeScreen === 'stock-min' && (
          <MinStockScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && activeScreen === 'stock-physical' && (
          <PhysicalInventoryScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && activeScreen === 'cash-current' && (
          <CashCurrentScreen canManage={can('cash.manage')} onView={changeScreen} />
        )}
        {gate === 'ready' && activeScreen === 'cash-movements' && (
          <CashMovementsScreen canManage={can('cash.manage')} />
        )}
        {gate === 'ready' && activeScreen === 'cash-openclose' && (
          <CashShiftScreen canManage={can('cash.manage')} />
        )}
        {gate === 'ready' && activeScreen === 'cash-counts' && (
          <CashCountScreen canManage={can('cash.manage')} />
        )}
        {gate === 'ready' && activeScreen === 'report-sales' && <SalesReportScreen />}
        {gate === 'ready' && activeScreen === 'report-products' && <ProductsReportScreen />}
        {gate === 'ready' && activeScreen === 'report-profit' && <ProfitReportScreen />}
        {gate === 'ready' && activeScreen === 'report-stock' && <StockReportScreen />}
        {gate === 'ready' && activeScreen === 'report-customers' && <CustomersReportScreen />}
        {(gate === 'ready' || needsBusiness) && activeScreen === 'settings-users' && <UsersScreen allowBusinessCreate={userIsSuper} />}
        {(gate === 'ready' || needsBusiness) && activeScreen === 'settings-roles' && <RolesScreen />}
        {gate === 'ready' && activeScreen === 'settings-payments' && <PaymentsScreen />}
        {gate === 'ready' && activeScreen === 'settings-store' && <StoreScreen />}
        {gate === 'ready' && activeScreen === 'settings-content' && <StoreScreen mode="content" />}
        {gate === 'ready' && activeScreen === 'settings-hub' && <StoreHub onView={changeScreen} canView={canView} storeUrl={user?.role === 'admin' && user?.businessSlug ? storeUrl() : null} />}
        {gate === 'ready' && activeScreen === 'settings-general' && <GeneralScreen />}
        {gate === 'ready' && activeScreen === 'settings-appearance' && <AppearanceScreen key={superTenant || user?.id} />}
      </main>

    </div>
  )
}




function LoginPanel({ attempts, error, onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const submit = (e) => {
    e.preventDefault()
    onLogin(email.trim(), password)
  }

  return (
    <div className="dash-screen dash-unlock">
      <div className="unlock-card">
        <span className="unlock-icon">
          <IconLock />
        </span>
        <span className="dash-eyebrow">Caja cerrada</span>
        <h1>Panel de ventas</h1>
        <p>Entrá con tu usuario para abrir la caja.</p>
        <form onSubmit={submit}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            aria-label="Email"
            autoComplete="username"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            aria-label="Contraseña"
            autoComplete="current-password"
            required
            autoFocus
          />
          {error ? (
            <em className="unlock-error">{error}</em>
          ) : attempts > 1 ? (
            <em className="unlock-error">Email o contraseña incorrectos</em>
          ) : null}
          <button type="submit" className="primary-btn">
            Abrir caja
          </button>
        </form>
      </div>
    </div>
  )
}

