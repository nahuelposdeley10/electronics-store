import { useEffect, useState } from 'react'
import { apiGet, clearSession, getSession, login as apiLogin } from '@/lib/api'
import { useOrderEvents } from '@/lib/useOrderEvents'
import { clearSuperTenant, getSuperTenant, setSuperTenant } from '@/lib/tenant'
import {
  IconBack,
  IconBolt,
  IconBox,
  IconCard,
  IconCash,
  IconChart,
  IconChevron,
  IconCross,
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
import { STORE_PAGES, isNavGroupActive } from './storeNavigation.js'

import './styles.css'

const SCREEN_PERMS = {
  products: 'catalog.manage',
  'product-categories': 'catalog.manage',
  'product-brands': 'catalog.manage',
  'product-import': 'catalog.manage',
  'promo-coupons': 'coupons.manage',
  'promo-offers': 'offers.manage',
  'sales-pos': 'pos.manage',
  'sales-returns': 'sales.return',
  'sales-quotes': 'quotes.delete',
  'stock-adjustments': 'inventory.write',
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
        ]
      : []
  })
  const [attempt, setAttempt] = useState(0)
  const [superTenant, setSuperTenantState] = useState(() => getSuperTenant())
  const [copiedStoreUrl, setCopiedStoreUrl] = useState(false)
  const [storeInfo, setStoreInfo] = useState(null)
  const [mpNeedSetup, setMpNeedSetup] = useState(false)
  const [mpWarningClosed, setMpWarningClosed] = useState(false)
  const [guideOpen, setGuideOpen] = useState(
    () => localStorage.getItem('ts-guided-done') !== '1',
  )
  const userIsSuper = user?.role === 'superadmin'
  const needsBusiness = userIsSuper && !superTenant
  const tenantFreeScreens = ['settings-users', 'settings-roles']
  const canView = (id) =>
    (id !== 'settings-appearance' || userIsSuper || user?.role === 'admin') &&
    (userIsSuper || !SCREEN_PERMS[id] || (perms || []).includes(SCREEN_PERMS[id]))
  const activeScreen = canView(screen) ? screen : 'overview'
  const businessBlock = needsBusiness && !tenantFreeScreens.includes(activeScreen)

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

  useEffect(() => {
    let alive = true
    if (!getSession().token) return undefined
    apiGet('/api/admin/settings')
      .then((data) => {
        if (!alive) return
        setStoreInfo({
          name: data?.store?.name || null,
          address: data?.store?.addressShort || null,
          logoUrl: data?.store?.logoUrl || null,
        })
        setMpNeedSetup(
          getSession().user?.role === 'admin' &&
            data?.payments?.online !== false &&
            !data?.payments?.mercadopago?.accessToken,
        )
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [attempt])

  const changeScreen = (id) => {
    if (!canView(id)) return
    setScreen(id)
    sessionStorage.setItem('ts-admin-screen', id)
  }

  const can = (code) =>
    user?.role === 'superadmin' || (perms || []).includes(code)

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
    setSuperTenantState(null)
    setUser(null)
    setPerms([])
    setOverview(null)
    setMpNeedSetup(false)
    setMpWarningClosed(false)
    setGate('login')
  }

  const dismissGuide = () => {
    localStorage.setItem('ts-guided-done', '1')
    setGuideOpen(false)
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
        <div className="dash-brand">
          <span className={`brand-chip${storeInfo?.logoUrl ? ' chip-logo' : ''}`}>
            {storeInfo?.logoUrl ? (
              <img className="brand-logo" src={storeInfo.logoUrl} alt="" />
            ) : (
              <IconBolt />
            )}
          </span>
          <div className="dash-brand-text">
            <strong>{storeInfo?.name || user?.businessSlug || 'TechStore'}</strong>
            <em>{storeInfo?.address || 'Panel de administración'}</em>
          </div>
        </div>

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

        {user && (
          <div className="dash-side-user">
            <span
              className="user-avatar mono"
              aria-hidden="true"
            >
              {initials(user.name)}
            </span>
            <span className="user-meta">
              <strong>{user.name}</strong>
              <em>{user.email}</em>
            </span>
            <span className={`role-chip role-${user.role}`}>{ROLE_LABELS[user.role] || user.role}</span>
          </div>
        )}

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
        {gate === 'ready' && !needsBusiness && overview && overview.counts?.all === 0 && guideOpen && (
          <FirstRunBanner
            onGo={(id) => {
              dismissGuide()
              changeScreen(id)
            }}
            onClose={dismissGuide}
          />
        )}
        {userIsSuper && (activeScreen === 'businesses' || businessBlock) && (
          <BusinessesScreen
            current={superTenant}
            onCreateAdmin={() => changeScreen('settings-users')}
            onPick={(id) => {
              setSuperTenant(id)
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
        {(gate === 'ready' || needsBusiness) && activeScreen === 'settings-users' && <UsersScreen />}
        {(gate === 'ready' || needsBusiness) && activeScreen === 'settings-roles' && <RolesScreen />}
        {gate === 'ready' && activeScreen === 'settings-payments' && <PaymentsScreen />}
        {gate === 'ready' && activeScreen === 'settings-store' && <StoreScreen />}
        {gate === 'ready' && activeScreen === 'settings-content' && <StoreScreen mode="content" />}
        {gate === 'ready' && activeScreen === 'settings-hub' && <StoreHub onView={changeScreen} canView={canView} storeUrl={user?.role === 'admin' && user?.businessSlug ? storeUrl() : null} />}
        {gate === 'ready' && activeScreen === 'settings-general' && <GeneralScreen />}
        {gate === 'ready' && activeScreen === 'settings-appearance' && <AppearanceScreen key={superTenant || user?.id} />}
      </main>

      {gate === 'ready' && !needsBusiness && mpNeedSetup && !mpWarningClosed && (
        <MpSetupWarning
          onConfigure={() => {
            setMpWarningClosed(true)
            changeScreen('settings-payments')
          }}
          onClose={() => setMpWarningClosed(true)}
        />
      )}
    </div>
  )
}


function FirstRunBanner({ onGo, onClose }) {
  const steps = [
    { id: 'products', title: 'Cargá tus productos', hint: 'Ficha de venta, precio y foto' },
    { id: 'stock-purchases', title: 'Agregá stock', hint: 'Comprá a proveedores' },
    { id: 'cash-current', title: 'Abrí la caja', hint: 'Para cobrar en efectivo' },
    { id: 'sales-pos', title: 'Vendé', hint: 'Registrá tu primera venta' },
  ]
  return (
    <div className="first-run">
      <div className="first-run-head">
        <div>
          <span className="dash-eyebrow">Primeros pasos</span>
          <h2>Tu tienda está lista, ¡empezá a vender!</h2>
        </div>
        <button type="button" className="first-run-close" onClick={onClose} aria-label="Cerrar guía">
          <IconCross />
        </button>
      </div>
      <p className="first-run-sub">
        Completá estos pasos en el orden que quieras; cada uno te lleva directo a la pantalla.
      </p>
      <div className="first-run-steps">
        {steps.map((step, i) => (
          <button
            type="button"
            key={step.id}
            className="first-run-step"
            onClick={() => onGo(step.id)}
          >
            <span className="first-run-num mono">{i + 1}</span>
            <span className="first-run-step-text">
              <strong>{step.title}</strong>
              <em>{step.hint}</em>
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}


function MpSetupWarning({ onConfigure, onClose }) {
  return (
    <div className="product-overlay" role="dialog" aria-modal="true" aria-labelledby="mp-warning-title">
      <div className="product-panel mp-warning">
        <h2 id="mp-warning-title">Necesitás conectar Mercado Pago</h2>
        <p>
          Tu tienda todavía no tiene cargado el Access Token de Mercado Pago (
          <code>APP_USR-...</code>). Hasta que lo configures, el check-out de tu
          web no va a poder cobrar pagos online.
        </p>
        <div className="mp-warning-actions">
          <button type="button" className="primary-btn" onClick={onConfigure}>
            Configurar Mercado Pago
          </button>
          <a
            className="ghost-btn"
            href="https://www.mercadopago.com.ar/developers/panel/app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Ver mi Access Token en MP
          </a>
        </div>
        <p className="mp-warning-hint">
          En Mercado Pago: <em>Panel de desarrolladores → tu aplicación → Credenciales →
          Access Token</em>. Pegá ese token (empieza con <code>APP_USR-</code>) en{' '}
          <em>Administración → Medios de pago</em>.
        </p>
        <button type="button" className="mp-warning-skip" onClick={onClose}>
          Ahora no
        </button>
      </div>
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

