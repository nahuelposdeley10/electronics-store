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
  IconInventory,
  IconLock,
  IconLogout,
  IconReport,
  IconTicket,
  IconWrench,
} from '@/components/Icons'
import DashboardLoading from '@/components/DashboardLoading'
import { initials } from './consts.js'
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

import './styles.css'

export default function Dashboard({ onExit }) {
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
  const userIsSuper = user?.role === 'superadmin'
  const needsBusiness = userIsSuper && !superTenant

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
    if (!getSession().token || needsBusiness) return undefined
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

  useOrderEvents(
    () => {
      setAttempt((n) => n + 1)
    },
    gate === 'ready' && !needsBusiness && screen === 'overview',
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
        { id: 'products', label: 'Productos' },
        ...(can('catalog.manage')
          ? [
              { id: 'product-categories', label: 'Categorías' },
              { id: 'product-brands', label: 'Marcas' },
              { id: 'product-import', label: 'Importar productos' },
            ]
          : []),
      ],
    },
    {
      id: 'promos',
      label: 'Promociones',
      icon: IconTicket,
      prefix: 'promo-',
      children: [
        ...(can('coupons.manage')
          ? [{ id: 'promo-coupons', label: 'Cupones' }]
          : []),
        ...(can('offers.manage')
          ? [{ id: 'promo-offers', label: 'Ofertas' }]
          : []),
      ],
    },
    {
      id: 'sales',
      label: 'Ventas',
      icon: IconCard,
      prefix: 'sales-',
      children: [
        { id: 'sales-pos', label: 'Nueva venta / POS' },
        { id: 'sales-history', label: 'Historial de ventas' },
        { id: 'sales-returns', label: 'Devoluciones' },
        { id: 'sales-quotes', label: 'Presupuestos' },
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
        { id: 'stock-adjustments', label: 'Ajustes' },
        { id: 'stock-purchases', label: 'Compras' },
        { id: 'stock-min', label: 'Stock mínimo' },
        { id: 'stock-physical', label: 'Inventario físico' },
      ],
    },
    {
      id: 'cash',
      label: 'Caja',
      icon: IconCash,
      prefix: 'cash-',
      children: can('cash.manage')
        ? [
            { id: 'cash-current', label: 'Caja actual' },
            { id: 'cash-movements', label: 'Movimientos' },
            { id: 'cash-openclose', label: 'Apertura / cierre' },
            { id: 'cash-counts', label: 'Arqueos' },
          ]
        : [],
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
      id: 'settings',
      label: 'Configuración',
      icon: IconWrench,
      prefix: 'settings-',
      children: [
        ...(can('users.manage')
          ? [{ id: 'settings-users', label: 'Usuarios' }]
          : []),
        ...(can('settings.manage')
          ? [
              { id: 'settings-roles', label: 'Roles y permisos' },
              { id: 'settings-payments', label: 'Métodos de pago' },
              { id: 'settings-store', label: 'Datos del negocio' },
              { id: 'settings-general', label: 'Configuración general' },
            ]
          : []),
      ],
    },
  ].filter((item) => !item.children || item.children.length > 0)

  if (gate === 'loading' && !needsBusiness) return <DashboardLoading />

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-brand">
          <span className="brand-chip">
            <IconBolt />
          </span>
          <div className="dash-brand-text">
            <strong>{storeInfo?.name || user?.businessSlug || 'TechStore'}</strong>
            <em>{storeInfo?.address || 'Panel de administración'}</em>
          </div>
        </div>

        <nav className="dash-nav" aria-label="Panel de administración">
          {NAV.map((item) => {
            const active = item.children
              ? screen === item.id || screen.startsWith(item.prefix || '')
              : screen === item.id
            return (
              <div key={item.id} className="dash-nav-group">
                <button
                  type="button"
                  className={`dash-nav-item${active ? ' active' : ''}`}
                  onClick={() => changeScreen(item.children ? item.children[0].id : item.id)}
                >
                  <item.icon />
                  {item.label}
                </button>
                {item.children && active && (
                  <div className="dash-nav-sub">
                    {item.children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className={`dash-nav-sub-item${screen === child.id ? ' active' : ''}`}
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
            <span className={`role-chip role-${user.role}`}>{user.role}</span>
          </div>
        )}

        {user?.role === 'admin' && (
          <div className="dash-side-store">
            <span className="dash-side-store-label">URL de tu tienda</span>
            {user.businessSlug ? (
              <>
                <a
                  className="dash-side-store-url mono"
                  href={storeUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  /u/{user.businessSlug}
                </a>
                <button
                  type="button"
                  className="dash-side-store-copy"
                  onClick={copyStoreUrl}
                >
                  {copiedStoreUrl ? '¡Copiada!' : 'Copiar URL'}
                </button>
              </>
            ) : (
              <span className="dash-side-store-empty">
                Sin URL configurada. Pedile al súper admin que la cargue.
              </span>
            )}
          </div>
        )}

        <div className="dash-side-foot">
          <button type="button" className="dash-exit" onClick={onExit}>
            <IconBack />
            Volver a la tienda
          </button>
          {user && (
            <button type="button" className="dash-logout" onClick={handleLogout}>
              <IconLogout />
              Salir
            </button>
          )}
        </div>
      </aside>

      <main className="dash-main">
        {userIsSuper && (needsBusiness || screen === 'businesses') && (
          <BusinessesScreen
            current={superTenant}
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

        {gate === 'ready' && !needsBusiness && overview && screen === 'overview' && (
          <OverviewScreen data={overview} onView={changeScreen} />
        )}
        {gate === 'ready' && screen === 'products' && (
          <ProductsScreen canManage={can('catalog.manage')} />
        )}
        {gate === 'ready' && screen === 'product-categories' && (
          <MetaScreen
            kind="categories"
            title="Categorías"
            eyebrow="Estantería"
            empty="Todavía no hay categorías."
            canManage={can('catalog.manage')}
          />
        )}
        {gate === 'ready' && screen === 'product-brands' && (
          <MetaScreen
            kind="brands"
            title="Marcas"
            eyebrow="Estantería"
            empty="Todavía no hay marcas."
            canManage={can('catalog.manage')}
          />
        )}
        {gate === 'ready' && screen === 'product-import' && (
          <ImportScreen canManage={can('catalog.manage')} />
        )}
        {gate === 'ready' && screen === 'promo-coupons' && (
          <CouponsScreen canManage={can('coupons.manage')} />
        )}
        {gate === 'ready' && screen === 'promo-offers' && (
          <OffersScreen canManage={can('offers.manage')} />
        )}
        {gate === 'ready' && screen === 'sales-pos' && (
          <PosScreen canManage={can('pos.manage')} />
        )}
        {gate === 'ready' && screen === 'sales-history' && <SalesScreen />}
        {gate === 'ready' && screen === 'sales-returns' && (
          <ReturnsScreen canManage={can('sales.return')} />
        )}
        {gate === 'ready' && screen === 'sales-quotes' && (
          <QuotesScreen canManage={can('quotes.delete')} />
        )}
        {gate === 'ready' && screen === 'stock-overview' && (
          <StockScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && screen === 'stock-movements' && <MovementsScreen />}
        {gate === 'ready' && screen === 'stock-adjustments' && (
          <AdjustmentsScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && screen === 'stock-purchases' && (
          <PurchasesScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && screen === 'stock-min' && (
          <MinStockScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && screen === 'stock-physical' && (
          <PhysicalInventoryScreen canManage={can('inventory.write')} />
        )}
        {gate === 'ready' && screen === 'cash-current' && (
          <CashCurrentScreen canManage={can('cash.manage')} onView={changeScreen} />
        )}
        {gate === 'ready' && screen === 'cash-movements' && (
          <CashMovementsScreen canManage={can('cash.manage')} />
        )}
        {gate === 'ready' && screen === 'cash-openclose' && (
          <CashShiftScreen canManage={can('cash.manage')} />
        )}
        {gate === 'ready' && screen === 'cash-counts' && (
          <CashCountScreen canManage={can('cash.manage')} />
        )}
        {gate === 'ready' && screen === 'report-sales' && <SalesReportScreen />}
        {gate === 'ready' && screen === 'report-products' && <ProductsReportScreen />}
        {gate === 'ready' && screen === 'report-profit' && <ProfitReportScreen />}
        {gate === 'ready' && screen === 'report-stock' && <StockReportScreen />}
        {gate === 'ready' && screen === 'report-customers' && <CustomersReportScreen />}
        {gate === 'ready' && screen === 'settings-users' && <UsersScreen />}
        {gate === 'ready' && screen === 'settings-roles' && <RolesScreen />}
        {gate === 'ready' && screen === 'settings-payments' && <PaymentsScreen />}
        {gate === 'ready' && screen === 'settings-store' && <StoreScreen />}
        {gate === 'ready' && screen === 'settings-general' && <GeneralScreen />}
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
          <em>Configuración → Métodos de pago</em>.
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

