import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatARS } from '../data/format'
import SearchSelect from '../components/SearchSelect'
import { apiConfirmOrder, apiDelete, apiGet, apiPost, apiPut, apiUpdate, apiUpload, clearSession, getSession, login as apiLogin } from '../lib/api'
import { useOrderEvents } from '../lib/useOrderEvents'
import {
  IconBack,
  IconBolt,
  IconBox,
  IconCard,
  IconChart,
  IconCheck,
  IconClock,
  IconCross,
  IconEdit,
  IconInventory,
  IconLock,
  IconLogout,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconReport,
  IconSearch,
  IconSearchOff,
  IconTicket,
  IconTrash,
  IconWrench,
} from '../components/Icons'

const STATUS_META = {
  approved: { label: 'Aprobada', Icon: IconCheck },
  pending: { label: 'Pendiente', Icon: IconClock },
  in_process: { label: 'En proceso', Icon: IconClock },
  rejected: { label: 'Rechazada', Icon: IconCross },
  cancelled: { label: 'Cancelada', Icon: IconCross },
  refunded: { label: 'Reembolsada', Icon: IconClock },
  charged_back: { label: 'Contracargo', Icon: IconCross },
}

const CATEGORY_LABELS = {
  audio: 'Audio',
  moviles: 'Móviles',
  computacion: 'Computación',
  wearables: 'Wearables',
  entretenimiento: 'Entretenimiento',
  perifericos: 'Periféricos',
  fotografia: 'Fotografía',
}

const PENDING_GROUP = new Set(['pending', 'in_process'])

function shortDate(value) {
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function shortId(id) {
  return String(id).slice(-6).toUpperCase()
}

function StatusTag({ status }) {
  const meta = STATUS_META[status] || { label: status, Icon: IconClock }
  const { Icon } = meta
  return (
    <span className="status-tag">
      <Icon />
      {meta.label}
    </span>
  )
}

function EmptyNote({ text }) {
  return (
    <div className="empty-note">
      <IconSearchOff />
      <p>{text}</p>
    </div>
  )
}

function ScreenLoading({ label = 'Leyendo la caja…' }) {
  return (
    <div className="dash-screen dash-loading">
      <span className="skel-head" />
      <p>{label}</p>
    </div>
  )
}

export default function Dashboard({ onExit }) {
  const [screen, setScreen] = useState(
    () => sessionStorage.getItem('ts-admin-screen') || 'overview',
  )
  const [gate, setGate] = useState('loading')
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
        ]
      : []
  })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    if (!getSession().token) return undefined
    apiGet('/api/auth/me')
      .then((data) => {
        if (!alive) return
        setUser(data.user || getSession().user)
        setPerms(data.perms || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [attempt, loginAttempts])

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/overview')
      .then((data) => {
        if (!alive) return
        setOverview(data)
        setGate('ready')
      })
      .catch((err) => {
        if (!alive) return
        if (err.code === 'AUTH') {
          setGate('login')
        } else {
          setGate('error')
          setGateError(err.message)
        }
      })
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
          setAttempt((n) => n + 1)
        }
      })
      .catch((err) => {
        if (err.code === 'AUTH') {
          setGate('login')
        } else {
          setGate('error')
          setGateError(err.message)
        }
      })
  }

  const handleLogout = () => {
    clearSession()
    sessionStorage.removeItem('ts-admin-screen')
    setUser(null)
    setPerms([])
    setOverview(null)
    setGate('login')
  }

  useOrderEvents(
    () => {
      setAttempt((n) => n + 1)
    },
    gate === 'ready' && screen === 'overview',
  )

  const NAV = [
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

  return (
    <div className="dash">
      <aside className="dash-side">
        <div className="dash-brand">
          <span className="brand-chip">
            <IconBolt />
          </span>
          <div className="dash-brand-text">
            <strong>TechStore</strong>
            <em>caja · Villa Urquiza</em>
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
        {gate === 'loading' && <ScreenLoading />}

        {gate === 'login' && (
          <LoginPanel attempts={loginAttempts} onLogin={handleLogin} />
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

        {gate === 'ready' && overview && screen === 'overview' && (
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
          <PosScreen canManage={user?.role === 'superadmin'} />
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
    </div>
  )
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function LoginPanel({ attempts, onLogin }) {
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
          {attempts > 1 && (
            <em className="unlock-error">Email o contraseña incorrectos</em>
          )}
          <button type="submit" className="primary-btn">
            Abrir caja
          </button>
        </form>
      </div>
    </div>
  )
}

function KpiTicket({ label, value, note }) {
  return (
    <div className="kpi-ticket">
      <span className="kpi-hole" aria-hidden="true" />
      <span className="kpi-label">{label}</span>
      <strong className="kpi-value mono">{value}</strong>
      <span className="kpi-note">{note}</span>
    </div>
  )
}

function OverviewScreen({ data, onView }) {
  const kpis = [
    { label: 'Ingresos', value: formatARS(data.revenue), note: 'iniciales' },
    { label: 'Ventas aprobadas', value: data.counts.salesCount, note: 'pagadas' },
    { label: 'Pendientes', value: data.counts.pendingCount, note: 'se cobran' },
    { label: 'Ticket promedio', value: formatARS(data.avgTicket), note: 'por venta' },
  ]

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Caja del galerista</span>
          <h1>Panel de control</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{formatARS(data.today.revenue)}</strong>
          <em>
            hoy · {data.today.orders} venta{data.today.orders === 1 ? '' : 's'}
          </em>
        </div>
      </header>

      <div className="kpi-rack">
        {kpis.map((kpi) => (
          <KpiTicket key={kpi.label} {...kpi} />
        ))}
      </div>

      <div className="dash-cols">
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Más vendido</h2>
            <button type="button" onClick={() => onView('products')}>
              Ver productos
            </button>
          </div>
          {data.bestSellers.length === 0 ? (
            <EmptyNote text="Todavía no hay ventas aprobadas." />
          ) : (
            <ol className="best-list">
              {data.bestSellers.map((product, index) => (
                <li key={product.productId}>
                  <span className="best-rank mono">0{index + 1}</span>
                  <span className="best-name">
                    {product.name}
                    <em>{product.brand}</em>
                  </span>
                  <span className="best-units mono">
                    {product.units} uds
                  </span>
                  <span className="best-revenue mono">
                    {formatARS(product.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Movimientos recientes</h2>
            <button type="button" onClick={() => onView('sales-history')}>
              Ver ventas
            </button>
          </div>
          {data.recentOrders.length === 0 ? (
            <EmptyNote text="Sin movimientos todavía." />
          ) : (
            <ul className="recent-list">
              {data.recentOrders.map((order) => (
                <li key={order.id}>
                  <span className="recent-id mono">#{shortId(order.id)}</span>
                  <span className="recent-date">{shortDate(order.createdAt)}</span>
                  <span className="recent-items mono">
                    {order.itemsCount} art.
                  </span>
                  <StatusTag status={order.status} />
                  <span className="recent-total mono">
                    {formatARS(order.total)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function ProductsScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [params, setParams] = useState({ q: '', category: '', brand: '', page: 1 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [note, setNote] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [bulk, setBulk] = useState({ mode: 'percent', value: '', category: 'todas' })
  const [bulkSaving, setBulkSaving] = useState(false)

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCats(res.categories || [])
      })
      .catch(() => {})
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrands(res.brands || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      q: params.q,
      page: String(params.page),
      limit: '10',
    })
    if (params.category) paramsString.set('category', params.category)
    if (params.brand) paramsString.set('brand', params.brand)
    apiGet(`/api/admin/products?${paramsString}`)
      .then((res) => {
        if (!alive) return
        if (res.items.length === 0 && res.page > 1) {
          setParams((prev) => ({ ...prev, page: res.totalPages || 1 }))
          return
        }
        setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [params])

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const onCategory = (value) =>
    setParams((prev) => ({ ...prev, category: value, page: 1 }))

  const onBrand = (value) =>
    setParams((prev) => ({ ...prev, brand: value, page: 1 }))

  const openForm = (product = null) => {
    setEditing(product)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleSaved = (saved) => {
    closeForm()
    setNote(
      editing
        ? `Producto actualizado: ${saved.name}`
        : `Producto agregado: ${saved.name}`,
    )
    setParams((prev) => ({ ...prev, page: 1 }))
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name}" ${product.brand} de la galería?`)) {
      return
    }
    try {
      await apiDelete(`/api/admin/products/${product.id}`)
      setNote(`Producto eliminado: ${product.name}`)
      if (data && data.items.length === 1 && data.page > 1) {
        setParams((prev) => ({ ...prev, page: prev.page - 1 }))
      } else {
        setParams((prev) => ({ ...prev }))
      }
    } catch (err) {
      setNote(err.message)
    }
  }

  const applyBulk = async (e) => {
    e.preventDefault()
    setBulkSaving(true)
    setNote('')
    try {
      await apiPost('/api/admin/prices/bulk', {
        mode: bulk.mode,
        value: Number(bulk.value),
        category: bulk.category,
      })
      const bucket = bulk.category === 'todas' ? 'todas las categorías' : bulk.category
      setNote(`Ajuste masivo aplicado a ${bucket}`)
      setBulk((b) => ({ ...b, value: '' }))
      setParams((prev) => ({ ...prev }))
    } catch (err) {
      setNote(err.message)
    } finally {
      setBulkSaving(false)
    }
  }

  if (!data && !error) return <ScreenLoading label="Cargando la estantería…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Estantería</span>
          <h1>Productos</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>en la galería</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá producto, marca o categoría…"
            aria-label="Buscar productos"
          />
        </form>
        <div className="dash-filters">
          <SearchSelect
            id="products-category-filter"
            label="Categoría"
            value={params.category}
            onChange={onCategory}
            options={cats.map((c) => ({ value: c.key, label: c.name }))}
          />
          <SearchSelect
            id="products-brand-filter"
            label="Marca"
            value={params.brand}
            onChange={onBrand}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
        {canManage && (
          <button
            type="button"
            className="primary-btn dash-add"
            onClick={() => openForm()}
          >
            <IconPlus />
            Agregar producto
          </button>
        )}
      </div>

      {canManage && (
        <form className="bulk-bar" onSubmit={applyBulk}>
          <strong>Ajuste masivo</strong>
          <label className="bulk-field">
            <span>Categoría</span>
            <SearchSelect
              id="bulk-category-filter"
              value={bulk.category}
              onChange={(v) => setBulk((b) => ({ ...b, category: v }))}
              allLabel="Todas"
              allValue="todas"
              options={cats.map((c) => ({ value: c.key, label: c.name }))}
            />
          </label>
          <label className="bulk-field">
            <span>Modo</span>
            <select
              value={bulk.mode}
              onChange={(e) => setBulk((b) => ({ ...b, mode: e.target.value }))}
            >
              <option value="percent">Porcentaje (+/-)</option>
              <option value="round">Redondear a</option>
              <option value="set">Precio fijo</option>
            </select>
          </label>
          <label className="bulk-field">
            <span>{bulk.mode === 'round' ? 'Redondear a…' : 'Valor'}</span>
            <input
              type="number"
              value={bulk.value}
              onChange={(e) => setBulk((b) => ({ ...b, value: e.target.value }))}
              placeholder={
                bulk.mode === 'percent'
                  ? 'Ej. 10 o -5'
                  : bulk.mode === 'round'
                    ? 'Ej. 100'
                    : 'Ej. 50000'
              }
              required
            />
          </label>
          <button type="submit" className="primary-btn" disabled={bulkSaving}>
            {bulkSaving ? 'Aplicando…' : 'Aplicar ajuste'}
          </button>
        </form>
      )}

      {note && <p className="sale-note">{note}</p>}

      {formOpen && (
        <ProductForm
          product={editing}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Costo</th>
              <th>Ganancia</th>
              <th>Stock</th>
              <th>Vendidos</th>
              <th>Ingresos</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="t-cell-product">
                    <img className="prod-thumb" src={p.image} alt="" loading="lazy" />
                    <span>
                      <strong>{p.name}</strong>
                      <em>{p.brand}</em>
                    </span>
                  </span>
                </td>
                <td className="t-cat">
                  {CATEGORY_LABELS[p.category] || p.category}
                </td>
                <td className="mono t-num">{formatARS(p.price)}</td>
                <td className="mono t-num t-cost">{p.costPrice ? formatARS(p.costPrice) : '—'}</td>
                <td className="mono t-num t-margin">
                  {p.costPrice ? (
                    <span className={p.price - p.costPrice >= 0 ? 'mv-delta up' : 'mv-delta down'}>
                      {formatARS(p.price - p.costPrice)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="mono t-num">{p.stock}</td>
                <td className="mono t-num">{p.soldUnits}</td>
                <td className="mono t-num t-money">{formatARS(p.revenue)}</td>
                {canManage && (
                  <td>
                    <span className="row-actions">
                      <button
                        type="button"
                        className="row-btn"
                        aria-label={`Editar ${p.name}`}
                        onClick={() => openForm(p)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="row-btn row-btn-danger"
                        aria-label={`Eliminar ${p.name}`}
                        onClick={() => handleDelete(p)}
                      >
                        <IconTrash />
                      </button>
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && (
          <EmptyNote text="Ningún producto con ese nombre, marca o categoría." />
        )}
      </div>

      {data.totalPages > 1 && (
        <div className="dash-pager">
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={data.page <= 1}
          >
            ← Anterior
          </button>
          <span className="mono">
            Página {data.page} de {data.totalPages} · {data.total} productos
          </span>
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={data.page >= data.totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}

const PAYMENT_OPTIONS = ['all', 'web', 'efectivo', 'tarjeta', 'transferencia']

function salePaymentLabel(order) {
  return (order.payment && PAYMENT_LABELS[order.payment]) || 'Web (MP)'
}

function fullDate(value) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}

function idDoc(order) {
  return [order.payer?.idType, order.payer?.idNumber].filter(Boolean).join(' ') || null
}

function SaleDetail({ order, onClose }) {
  return (
    <div className="product-overlay" role="dialog" aria-modal="true">
      <div className="product-panel c-light sale-detail-panel">
        <header className="panel-head">
          <div>
            <span className="dash-eyebrow">Detalle de venta</span>
            <h2>Pedido #{shortId(order.id)}</h2>
          </div>
          <button type="button" className="x-btn" onClick={onClose} aria-label="Cerrar">
            <IconCross />
          </button>
        </header>

        <div className="detail-meta">
          <StatusTag status={order.status} />
          <span className={`payment-tag${order.source === 'web' && !order.payment ? ' web' : ''}`}>
            {salePaymentLabel(order)}
          </span>
          {order.status === 'refunded' && order.returnedAt && (
            <span className="quote-status cancelled">Devuelta · {shortDate(order.returnedAt)}</span>
          )}
          <em className="detail-date">{fullDate(order.createdAt)}</em>
        </div>

        <div className="detail-block">
          <h3 className="detail-title">Cliente</h3>
          <div className="detail-grid">
            <div>
              <span className="detail-k">Nombre</span>
              <strong>{order.payer?.fullName || 'Sin nombre'}</strong>
            </div>
            <div>
              <span className="detail-k">Email</span>
              <strong>{order.payer?.email || '—'}</strong>
            </div>
            <div>
              <span className="detail-k">Documento</span>
              <strong>{idDoc(order) || '—'}</strong>
            </div>
          </div>
        </div>

        <div className="detail-block">
          <h3 className="detail-title">Artículos</h3>
          <ul className="detail-items">
            {order.items.map((item) => (
              <li key={item.productId}>
                <span className="detail-item-name">
                  <strong>{item.name}</strong>
                  <em>
                    {item.quantity} × {formatARS(item.unitPrice)}
                  </em>
                </span>
                <span className="mono detail-item-total">{formatARS(item.unitPrice * item.quantity)}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="detail-block">
          <h3 className="detail-title">Pago</h3>
          <div className="detail-grid">
            <div>
              <span className="detail-k">Medio</span>
              <strong>{salePaymentLabel(order)}</strong>
            </div>
            <div>
              <span className="detail-k">Cupón</span>
              <strong>{order.coupon || '—'}</strong>
            </div>
            {order.paymentId && (
              <div>
                <span className="detail-k">ID de pago (MP)</span>
                <strong className="mono">{order.paymentId}</strong>
              </div>
            )}
            {order.merchantOrderId && (
              <div>
                <span className="detail-k">Orden MP</span>
                <strong className="mono">{order.merchantOrderId}</strong>
              </div>
            )}
          </div>
        </div>

        <div className="ticket-totals detail-totals">
          <div className="ticket-row">
            <span>Subtotal</span>
            <strong className="mono">{formatARS(order.subtotal)}</strong>
          </div>
          {Number(order.discount) > 0 && (
            <div className="ticket-row">
              <span>Descuento</span>
              <strong className="mono">−{formatARS(order.discount)}</strong>
            </div>
          )}
          <div className="ticket-row">
            <span>Envío</span>
            <strong className="mono">{Number(order.shippingCost) > 0 ? formatARS(order.shippingCost) : 'Gratis'}</strong>
          </div>
          <div className="ticket-row total">
            <span>Total</span>
            <strong className="mono">{formatARS(order.total)}</strong>
          </div>
        </div>

        <footer className="panel-actions">
          <button type="button" className="primary-btn" onClick={onClose}>
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  )
}

function SalesScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [params, setParams] = useState({ group: 'all', payment: 'all', from: '', to: '', q: '', page: 1 })
  const [query, setQuery] = useState('')
  const [rechecking, setRechecking] = useState({})
  const [note, setNote] = useState('')
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '11' })
    if (params.group !== 'all') qs.set('group', params.group)
    if (params.payment !== 'all') qs.set('payment', params.payment)
    if (params.from) qs.set('from', params.from)
    if (params.to) qs.set('to', params.to)
    if (params.q) qs.set('q', params.q)
    apiGet(`/api/admin/orders?${qs}`)
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [params])

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const recheck = (order) => {
    setRechecking((m) => ({ ...m, [order.id]: true }))
    apiConfirmOrder(order.id)
      .then((updated) => {
        const changed = updated.status !== order.status
        setData((d) =>
          d
            ? {
                ...d,
                items: d.items.map((o) =>
                  o.id === updated.id
                    ? { ...o, status: updated.status, paymentId: updated.paymentId, payer: updated.payer }
                    : o,
                ),
              }
            : d,
        )
        setNote(
          changed
            ? `Pedido #${shortId(order.id)} verificado: ${order.status} → ${updated.status}`
            : `Pedido #${shortId(order.id)} verificado: sigue ${updated.status}`,
        )
      })
      .catch((err) => setNote(err.message))
      .finally(() => setRechecking((m) => ({ ...m, [order.id]: false })))
  }

  useOrderEvents((event) => {
    setData((d) =>
      d
        ? {
            ...d,
            items: d.items.map((o) =>
              o.id === event.id
                ? { ...o, status: event.status, paymentId: event.paymentId, payer: event.payer || o.payer }
                : o,
            ),
          }
        : d,
    )
  })

  if (!data && !error) return <ScreenLoading label="Contando las ventas…" />
  if (error) return <ScreenBlocked message={error} />

  const chips = [
    { id: 'all', label: 'Todas', count: data.counts.all },
    { id: 'approved', label: 'Aprobadas', count: data.counts.approved },
    { id: 'pending', label: 'Pendientes', count: data.counts.pending },
    { id: 'rejected', label: 'Rechazadas', count: data.counts.rejected },
  ]

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Libro de caja</span>
          <h1>Ventas</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.counts.all}</strong>
          <em>pedidos registrados</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, email o código de pedido…"
            aria-label="Buscar ventas"
          />
        </form>
        <div className="dash-filters">
          <div className="dash-filter-field">
            <label htmlFor="sales-from">Desde</label>
            <input
              id="sales-from"
              type="date"
              value={params.from}
              max={params.to || undefined}
              onChange={(e) => setParams((prev) => ({ ...prev, from: e.target.value, page: 1 }))}
            />
          </div>
          <div className="dash-filter-field">
            <label htmlFor="sales-to">Hasta</label>
            <input
              id="sales-to"
              type="date"
              value={params.to}
              min={params.from || undefined}
              onChange={(e) => setParams((prev) => ({ ...prev, to: e.target.value, page: 1 }))}
            />
          </div>
          <div className="dash-filter-field">
            <label htmlFor="sales-payment-filter">Pago</label>
            <select
              id="sales-payment-filter"
              value={params.payment}
              onChange={(e) => setParams((prev) => ({ ...prev, payment: e.target.value, page: 1 }))}
            >
              {PAYMENT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === 'all' ? 'Todos los medios' : opt === 'web' ? 'Web (Mercado Pago)' : PAYMENT_LABELS[opt]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <span className="dash-count mono">{data.total} ventas</span>
      </div>

      <div className="sale-chips" role="group" aria-label="Filtrar por estado">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`sale-chip mono${params.group === chip.id ? ' active' : ''}`}
            onClick={() => setParams((prev) => ({ ...prev, group: chip.id, page: 1 }))}
          >
            {chip.label} <span>{chip.count}</span>
          </button>
        ))}
      </div>

      {note && <p className="sale-note">{note}</p>}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Detalle</th>
              <th>Pago</th>
              <th>Cupón</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((order) => (
              <tr key={order.id}>
                <td className="mono t-id">#{shortId(order.id)}</td>
                <td className="t-date">{shortDate(order.createdAt)}</td>
                <td className="t-payer">
                  {order.payer?.fullName ? (
                    <>
                      <strong>{order.payer.fullName}</strong>
                      <span className="t-dim">
                        {[
                          order.payer.email,
                          [order.payer.idType, order.payer.idNumber].filter(Boolean).join(' '),
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    </>
                  ) : (
                    <span className="t-dim">—</span>
                  )}
                </td>
                <td className="t-detail">{itemsSummary(order.items)}</td>
                <td>
                  <span className={`payment-tag${order.source === 'web' && !order.payment ? ' web' : ''}`}>
                    {salePaymentLabel(order)}
                  </span>
                </td>
                <td className="mono t-coupon">
                  {order.coupon || <span className="t-dim">—</span>}
                </td>
                <td className="mono t-num t-money">{formatARS(order.total)}</td>
                <td>
                  <StatusTag status={order.status} />
                  {PENDING_GROUP.has(order.status) && (
                    <button
                      type="button"
                      className="recheck-btn"
                      onClick={() => recheck(order)}
                      disabled={rechecking[order.id]}
                    >
                      <IconRefresh />
                      {rechecking[order.id] ? 'Verificando…' : 'Reintentar'}
                    </button>
                  )}
                </td>
                <td>
                  <button type="button" className="view-btn" onClick={() => setDetail(order)}>
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && (
          <EmptyNote text="Aún no hay ventas con esos filtros." />
        )}
      </div>

      {data.total > 11 && (
        <div className="dash-pager">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            ← Anterior
          </button>
          <span className="mono">
            página {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente →
          </button>
        </div>
      )}

      {detail && <SaleDetail order={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function itemsSummary(items) {
  const names = (items || []).map((item) => item.name)
  if (names.length === 0) return '—'
  if (names.length <= 2) return names.join(' · ')
  return `${names.slice(0, 2).join(' · ')} +${names.length - 2} más`
}

const QUOTE_STATUS_LABELS = { draft: 'Borrador', confirmed: 'Confirmado', cancelled: 'Cancelado' }

function PosScreen({ canManage }) {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [catOptions, setCatOptions] = useState([])
  const [brandOptions, setBrandOptions] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState([])
  const [discount, setDiscount] = useState('')
  const [customer, setCustomer] = useState('')
  const [payment, setPayment] = useState('efectivo')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [lastSale, setLastSale] = useState(null)

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCatOptions(res.categories || [])
      })
      .catch(() => {})
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrandOptions(res.brands || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const params = new URLSearchParams({ limit: 20, page })
    if (query.trim()) params.set('q', query.trim())
    if (category) params.set('category', category)
    if (brand) params.set('brand', brand)
    apiGet(`/api/admin/products?${params.toString()}`)
      .then((res) => {
        if (!alive) return
        setProducts(res.items || [])
        setTotalPages(res.totalPages || 1)
        setTotalItems(res.total || 0)
      })
      .catch((err) => {
        if (alive) setNote(err.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [query, category, brand, page])

  const onQuery = (e) => {
    setQuery(e.target.value)
    setPage(1)
  }

  const onCategory = (value) => {
    setCategory(value)
    setPage(1)
  }

  const onBrand = (value) => {
    setBrand(value)
    setPage(1)
  }

  const add = (product) => {
    if (product.stock <= 0) return
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const changeQty = (id, delta) => {
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.product.id !== id) return [l]
        const next = l.quantity + delta
        if (next <= 0) return []
        if (next > l.product.stock) return [l]
        return [{ ...l, quantity: next }]
      }),
    )
  }

  const removeLine = (id) => setLines((prev) => prev.filter((l) => l.product.id !== id))

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
  const discountNum = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
  const total = subtotal - discountNum

  const checkout = () => {
    if (lines.length === 0 || saving) return
    setSaving(true)
    setNote('')
    apiPost('/api/admin/pos', {
      items: lines.map((l) => ({ id: l.product.id, quantity: l.quantity })),
      discount: discountNum,
      customer: customer.trim() ? { name: customer.trim() } : {},
      payment,
    })
      .then((sale) => {
        setProducts((list) =>
          list.map((p) => {
            const line = lines.find((l) => l.product.id === p.id)
            return line ? { ...p, stock: p.stock - line.quantity } : p
          }),
        )
        setLastSale(sale)
        setLines([])
        setDiscount('')
        setCustomer('')
      })
      .catch((err) => setNote(err.message))
      .finally(() => setSaving(false))
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Caja · mostrador</span>
          <h1>Nueva venta / POS</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{lines.length}</strong>
          <em>líneas</em>
        </div>
      </header>

      {lastSale && (
        <p className="sale-note sale-note-ok">
          <IconCheck /> Venta #{shortId(lastSale.id)} registrada por {formatARS(lastSale.total)} — {lastSale.payment}
        </p>
      )}
      {note && <p className="sale-note">{note}</p>}

      <div className="pos-layout">
        <section className="pos-catalog">
          <div className="dash-search pos-search">
            <IconSearch />
            <input
              type="text"
              value={query}
              onChange={onQuery}
              placeholder="Buscá en el catálogo…"
              aria-label="Buscar productos"
            />
          </div>
          <div className="pos-filters">
            <SearchSelect
              id="pos-category-filter"
              label="Categoría"
              value={category}
              onChange={onCategory}
              options={catOptions.map((c) => ({ value: c.key, label: c.name }))}
            />
            <SearchSelect
              id="pos-brand-filter"
              label="Marca"
              value={brand}
              onChange={onBrand}
              options={brandOptions.map((b) => ({ value: b, label: b }))}
            />
            <span className="dash-count mono">{totalItems} productos</span>
          </div>
          <div className="pos-list">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="pos-item"
                disabled={!canManage || p.stock <= 0}
                onClick={() => add(p)}
              >
                <img className="prod-thumb" src={p.image} alt="" loading="lazy" />
                <span className="pos-item-meta">
                  <strong>{p.name}</strong>
                  <em>{p.brand}</em>
                </span>
                <span className="pos-item-price mono">{formatARS(p.price)}</span>
                <span className={`pos-item-stock mono${p.stock <= 0 ? ' out' : ''}`}>
                  {p.stock <= 0 ? 'agotado' : `${p.stock} u.`}
                </span>
                <IconPlus />
              </button>
            ))}
            {loading && products.length === 0 && <EmptyNote text="Cargando productos…" />}
            {!loading && products.length === 0 && <EmptyNote text="Sin productos para esos filtros." />}
          </div>
          {totalPages > 1 && (
            <div className="dash-pager">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((n) => n - 1)}
              >
                ← Anterior
              </button>
              <span className="mono">
                página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((n) => n + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </section>

        <section className="pos-ticket">
          <h2 className="ticket-title">Ticket</h2>
          <ul className="ticket-lines">
            {lines.map((l) => (
              <li key={l.product.id} className="ticket-line">
                <span className="ticket-name">
                  <strong>{l.product.name}</strong>
                  <em>{formatARS(l.product.price)} c/u</em>
                </span>
                <span className="qty-controls">
                  <button type="button" onClick={() => changeQty(l.product.id, -1)} aria-label="Quitar uno">
                    <IconMinus />
                  </button>
                  <span className="mono">{l.quantity}</span>
                  <button type="button" onClick={() => changeQty(l.product.id, 1)} aria-label="Sumar uno">
                    <IconPlus />
                  </button>
                </span>
                <span className="ticket-line-total mono">{formatARS(l.product.price * l.quantity)}</span>
                <button type="button" className="row-btn row-btn-danger" onClick={() => removeLine(l.product.id)} aria-label="Quitar línea">
                  <IconTrash />
                </button>
              </li>
            ))}
            {lines.length === 0 && <li className="ticket-empty mono">El ticket está vacío</li>}
          </ul>

          <div className="ticket-totals">
            <div className="ticket-row">
              <span>Subtotal</span>
              <strong className="mono">{formatARS(subtotal)}</strong>
            </div>
            <div className="ticket-row">
              <span>Descuento</span>
              <input
                className="price-input mono"
                type="number"
                min="0"
                step="1"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                aria-label="Descuento"
                placeholder="$ 0"
              />
            </div>
            <div className="ticket-row total">
              <span>Total</span>
              <strong className="mono">{formatARS(total)}</strong>
            </div>
          </div>

          <div className="pay-box">
            <label className="pf-field">
              <span>Cliente (opcional)</span>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </label>
            <label className="pf-field">
              <span>Pago</span>
              <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </label>
            <button
              type="button"
              className="primary-btn pay-btn"
              disabled={!canManage || lines.length === 0 || saving}
              onClick={checkout}
            >
              {saving ? 'Cobrando…' : `Cobrar ${formatARS(total)}`}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function ReturnsScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [params, setParams] = useState({ filter: 'all', page: 1 })
  const [processing, setProcessing] = useState({})
  const [note, setNote] = useState('')
  const [detail, setDetail] = useState(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '10' })
    if (params.filter !== 'all') qs.set('status', params.filter)
    apiGet(`/api/admin/orders?${qs}`)
      .then((res) => {
        if (!alive) return
        if (res.items.length === 0 && res.page > 1) {
          setParams((prev) => ({ ...prev, page: res.totalPages || 1 }))
          return
        }
        setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [params, version])

  const setFilter = (id) => setParams((prev) => ({ ...prev, filter: id, page: 1 }))

  const doReturn = (order) => {
    if (!window.confirm(`¿Registrar la devolución de "#${shortId(order.id)}"? Saldrá ${formatARS(order.total)} del stock de caja.`)) return
    setProcessing((m) => ({ ...m, [order.id]: true }))
    setNote('')
    apiPost(`/api/admin/orders/${order.id}/return`, {})
      .then((res) => {
        setData((prev) => (prev ? { ...prev, items: prev.items.map((o) => (o.id === order.id ? { ...o, status: res.status, returnedAt: res.returnedAt } : o)) } : prev))
        setNote(`Devolución de "#${shortId(order.id)}" registrada.`)
        setVersion((v) => v + 1)
      })
      .catch((err) => setNote(err.message))
      .finally(() => setProcessing((m) => ({ ...m, [order.id]: false })))
  }

  if (!data && !error) return <ScreenLoading label="Leyendo devoluciones…" />
  if (error) return <ScreenBlocked message={error} />

  const filters = data.counts || {}
  const chips = [
    { id: 'all', label: 'Todas', count: filters.all ?? 0 },
    { id: 'approved', label: 'Aprobadas', count: filters.approved ?? 0 },
    { id: 'refunded', label: 'Devueltas', count: filters.refunded ?? 0 },
  ]

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Libro de caja</span>
          <h1>Devoluciones</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{filters.refunded ?? 0}</strong>
          <em>devueltas</em>
        </div>
      </header>

      <div className="sale-chips" role="group" aria-label="Filtrar devoluciones">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`sale-chip mono${params.filter === chip.id ? ' active' : ''}`}
            onClick={() => setFilter(chip.id)}
          >
            {chip.label} <span>{chip.count}</span>
          </button>
        ))}
      </div>

      {note && <p className="sale-note">{note}</p>}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Venta</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Detalle</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((order) => (
              <tr key={order.id}>
                <td className="mono t-id">#{shortId(order.id)}</td>
                <td className="t-date">{shortDate(order.createdAt)}</td>
                <td className="t-payer">
                  {order.payer?.fullName ? (
                    <>
                      <strong>{order.payer.fullName}</strong>
                      {order.payer.email && <span className="t-dim">{order.payer.email}</span>}
                    </>
                  ) : (
                    <span className="t-dim">—</span>
                  )}
                </td>
                <td className="t-detail">{itemsSummary(order.items)}</td>
                <td className="mono t-num t-money">{formatARS(order.total)}</td>
                <td>
                  <StatusTag status={order.status} />
                </td>
                <td>
                  <span className="row-actions">
                    <button type="button" className="view-btn" onClick={() => setDetail(order)}>
                      Ver
                    </button>
                    {canManage && order.status === 'approved' && (
                      <button
                        type="button"
                        className="row-btn"
                        onClick={() => doReturn(order)}
                        disabled={processing[order.id]}
                      >
                        {processing[order.id] ? 'Devolviendo…' : 'Devolver'}
                      </button>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="Sin ventas para mostrar." />}
      </div>

      {data.total > data.limit && (
        <div className="dash-pager">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            ← Anterior
          </button>
          <span className="mono">
            página {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente →
          </button>
        </div>
      )}

      {detail && <SaleDetail order={detail} onClose={() => setDetail(null)} />}
    </div>
  )
}

function QuotesScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [params, setParams] = useState({ status: 'all', q: '', page: 1 })
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '10' })
    if (params.status !== 'all') qs.set('status', params.status)
    if (params.q) qs.set('q', params.q)
    apiGet(`/api/admin/quotes?${qs}`)
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [params])

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const updateStatus = (quote, status) => {
    apiPut(`/api/admin/quotes/${quote._id}`, { status })
      .then((updated) => {
        setData((d) => ({ ...d, items: d.items.map((q) => (q._id === updated._id ? updated : q)) }))
        setNote(`Presupuesto #${quote.number} ${status === 'confirmed' ? 'confirmado' : 'cancelado'}.`)
      })
      .catch((err) => setNote(err.message))
  }

  const deleteQuote = (quote) => {
    if (!window.confirm(`¿Eliminar el presupuesto #${quote.number}?`)) return
    apiDelete(`/api/admin/quotes/${quote._id}`)
      .then(() => {
        setData((d) => ({ ...d, items: d.items.filter((q) => q._id !== quote._id), total: d.total - 1 }))
        setNote(`Presupuesto #${quote.number} eliminado.`)
      })
      .catch((err) => setNote(err.message))
  }

  if (!data && !error) return <ScreenLoading label="Leyendo presupuestos…" />
  if (error) return <ScreenBlocked message={error} />

  const chips = [
    { id: 'all', label: 'Todos', count: data.total },
    { id: 'draft', label: 'Borradores', count: data.items.filter((q) => q.status === 'draft').length },
    { id: 'confirmed', label: 'Confirmados', count: data.items.filter((q) => q.status === 'confirmed').length },
    { id: 'cancelled', label: 'Cancelados', count: data.items.filter((q) => q.status === 'cancelled').length },
  ]

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Cotización a medida</span>
          <h1>Presupuestos</h1>
        </div>
        <button type="button" className="primary-btn" onClick={() => setFormOpen(true)} disabled={!canManage}>
          <IconPlus /> Nuevo presupuesto
        </button>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá por cliente, producto o nota…"
            aria-label="Buscar presupuestos"
          />
        </form>
        <span className="dash-count mono">{data.total} presupuestos</span>
      </div>

      <div className="sale-chips" role="group" aria-label="Filtrar presupuestos">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`sale-chip mono${params.status === chip.id ? ' active' : ''}`}
            onClick={() => setParams((prev) => ({ ...prev, status: chip.id, page: 1 }))}
          >
            {chip.label} <span>{chip.count}</span>
          </button>
        ))}
      </div>

      {note && <p className="sale-note">{note}</p>}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Nº</th>
              <th>Cliente</th>
              <th>Detalle</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Fecha</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((quote) => (
              <tr key={quote._id}>
                <td className="mono t-id">#{quote.number}</td>
                <td className="t-payer">
                  {quote.customer?.name ? (
                    <>
                      <strong>{quote.customer.name}</strong>
                      {(quote.customer.phone || quote.customer.email) && (
                        <span className="t-dim">{quote.customer.phone || quote.customer.email}</span>
                      )}
                      {quote.note && <span className="t-dim">{quote.note}</span>}
                    </>
                  ) : (
                    <span className="t-dim">—</span>
                  )}
                </td>
                <td className="t-detail">{itemsSummary(quote.items)}</td>
                <td className="mono t-num t-money">{formatARS(quote.total)}</td>
                <td>
                  <span className={`quote-status ${quote.status}`}>{QUOTE_STATUS_LABELS[quote.status] || quote.status}</span>
                </td>
                <td className="t-date">{shortDate(quote.createdAt)}</td>
                {canManage && (
                  <td>
                    <span className="row-actions">
                      {quote.status === 'draft' && (
                        <>
                          <button type="button" className="row-btn" onClick={() => updateStatus(quote, 'confirmed')}>
                            Confirmar
                          </button>
                          <button type="button" className="row-btn" onClick={() => updateStatus(quote, 'cancelled')}>
                            Cancelar
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="row-btn row-btn-danger"
                        onClick={() => deleteQuote(quote)}
                        aria-label="Eliminar presupuesto"
                      >
                        <IconTrash />
                      </button>
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="Sin presupuestos para mostrar." />}
      </div>

      {data.totalPages > 1 && (
        <div className="dash-pager">
          <button
            type="button"
            disabled={params.page <= 1}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            ← Anterior
          </button>
          <span className="mono">
            página {params.page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={params.page >= data.totalPages}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente →
          </button>
        </div>
      )}

      {formOpen && <QuoteForm onClose={() => setFormOpen(false)} onSaved={() => setParams((prev) => ({ ...prev, page: 1 }))} />}
    </div>
  )
}

function QuoteForm({ onClose, onSaved }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({
    productId: '',
    qty: '1',
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    discount: '',
    note: '',
  })
  const [lines, setLines] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/products?limit=100')
      .then((res) => {
        if (alive) setProducts(res.items || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const addLine = () => {
    const product = products.find((p) => String(p.id) === String(form.productId))
    const qty = Math.max(1, Math.floor(Number(form.qty) || 1))
    if (!product) return
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + qty } : l))
      return [...prev, { product, quantity: qty }]
    })
  }

  const removeLine = (id) => setLines((prev) => prev.filter((l) => l.product.id !== id))

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
  const discountNum = Math.min(Math.max(Number(form.discount) || 0, 0), subtotal)
  const total = subtotal - discountNum

  const submit = (e) => {
    e.preventDefault()
    if (lines.length === 0 || saving) return
    setSaving(true)
    setError('')
    apiPost('/api/admin/quotes', {
      items: lines.map((l) => ({ id: l.product.id, quantity: l.quantity })),
      discount: discountNum,
      customer: {
        name: form.customerName,
        phone: form.customerPhone,
        email: form.customerEmail,
      },
      note: form.note,
    })
      .then(() => {
        onSaved()
        onClose()
      })
      .catch((err) => {
        setError(err.message)
        setSaving(false)
      })
  }

  return (
    <div className="product-overlay" role="dialog" aria-modal="true">
      <div className="product-panel c-light">
        <header className="panel-head">
          <div>
            <span className="dash-eyebrow">Cotización</span>
            <h2>Nuevo presupuesto</h2>
          </div>
          <button type="button" className="x-btn" onClick={onClose} aria-label="Cerrar">
            <IconCross />
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="pf-row">
            <label className="pf-field pf-grow">
              <span>Producto</span>
              <select value={form.productId} onChange={set('productId')}>
                <option value="">Seleccioná…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatARS(p.price)}
                  </option>
                ))}
              </select>
            </label>
            <label className="pf-field">
              <span>Cantidad</span>
              <input type="number" min="1" value={form.qty} onChange={set('qty')} />
            </label>
            <button type="button" className="row-btn" style={{ alignSelf: 'flex-end' }} onClick={addLine}>
              <IconPlus /> Agregar
            </button>
          </div>

          <ul className="ticket-lines">
            {lines.map((l) => (
              <li key={l.product.id} className="ticket-line">
                <span className="ticket-name">
                  <strong>{l.product.name}</strong>
                  <em>
                    {l.quantity} × {formatARS(l.product.price)}
                  </em>
                </span>
                <span className="ticket-line-total mono">{formatARS(l.product.price * l.quantity)}</span>
                <button type="button" className="row-btn row-btn-danger" onClick={() => removeLine(l.product.id)} aria-label="Quitar línea">
                  <IconTrash />
                </button>
              </li>
            ))}
            {lines.length === 0 && <li className="ticket-empty mono">Agregá productos al presupuesto</li>}
          </ul>

          <div className="pf-row">
            <label className="pf-field pf-grow">
              <span>Cliente</span>
              <input type="text" value={form.customerName} onChange={set('customerName')} placeholder="Nombre y apellido" />
            </label>
            <label className="pf-field">
              <span>Teléfono</span>
              <input type="text" value={form.customerPhone} onChange={set('customerPhone')} placeholder="Ej. 351 555-1234" />
            </label>
          </div>
          <div className="pf-row">
            <label className="pf-field pf-grow">
              <span>Email</span>
              <input type="email" value={form.customerEmail} onChange={set('customerEmail')} placeholder="cliente@mail.com" />
            </label>
            <label className="pf-field">
              <span>Descuento ($)</span>
              <input className="mono" type="number" min="0" value={form.discount} onChange={set('discount')} placeholder="0" />
            </label>
          </div>
          <label className="pf-field">
            <span>Nota</span>
            <input type="text" value={form.note} onChange={set('note')} placeholder="Ej. válido por 7 días, incluye instalación" />
          </label>

          <div className="panel-summary">
            <div>
              <span>Total</span>
              <strong className="mono">{formatARS(total)}</strong>
            </div>
          </div>

          {error && <p className="panel-error">{error}</p>}

          <footer className="panel-actions">
            <button type="button" className="secondary-btn" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="primary-btn" disabled={saving || lines.length === 0}>
              {saving ? 'Guardando…' : 'Guardar presupuesto'}
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}

function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: product?.name || '',
    brand: product?.brand || '',
    category: product?.category || 'audio',
    price: product?.price ?? '',
    costPrice: product?.costPrice ?? '',
    stock: product?.stock ?? '',
    rating: product?.rating ?? '',
    freeShipping: product?.freeShipping ?? true,
    badge: product?.badge || '',
    description: product?.description || '',
    specs: product?.specs?.join(', ') || '',
  }))
  const [image, setImage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    const fd = new FormData()
    Object.entries(form).forEach(([key, value]) => {
      if (value !== '' && value != null) fd.append(key, String(value))
    })
    if (image) fd.append('image', image)

    try {
      if (product) {
        await apiUpdate(`/api/admin/products/${product.id}`, fd)
      } else {
        await apiUpload('/api/admin/products', fd)
      }
      onSaved({ name: form.name })
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="product-overlay" onMouseDown={saving ? undefined : onClose}>
      <div
        className="product-panel"
        role="dialog"
        aria-modal="true"
        aria-label={product ? 'Editar producto' : 'Agregar producto'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="product-head">
          <div>
            <span className="dash-eyebrow">Estantería</span>
            <h2>{product ? 'Editar producto' : 'Agregar producto'}</h2>
          </div>
          <button
            type="button"
            className="product-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <IconCross />
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="pf-grid">
            <label className="pf-field pf-full">
              <span>Nombre</span>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Ej. Teclado Gamer RGB"
                required
              />
            </label>

            <label className="pf-field">
              <span>Marca</span>
              <input
                type="text"
                value={form.brand}
                onChange={set('brand')}
                placeholder="Ej. Logitech"
                required
              />
            </label>

            <label className="pf-field">
              <span>Categoría</span>
              <select
                value={form.category}
                onChange={set('category')}
                required
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className="pf-field">
              <span>Precio ($)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.price}
                onChange={set('price')}
                placeholder="Ej. 109990"
                required
              />
            </label>

            <label className="pf-field">
              <span>Costo ($)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.costPrice}
                onChange={set('costPrice')}
                placeholder="Opcional"
              />
            </label>

            <label className="pf-field">
              <span>Stock</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock}
                onChange={set('stock')}
                placeholder="Opcional"
              />
            </label>

            <label className="pf-field">
              <span>Rating (0–5)</span>
              <input
                type="number"
                min="0"
                max="5"
                step="0.1"
                value={form.rating}
                onChange={set('rating')}
                placeholder="Opcional"
              />
            </label>

            <label className="pf-field">
              <span>Badge</span>
              <input
                type="text"
                value={form.badge}
                onChange={set('badge')}
                placeholder="Ej. Nuevo, Oferta"
              />
            </label>

            <label className="pf-field pf-full">
              <span>Descripción</span>
              <textarea
                rows={3}
                value={form.description}
                onChange={set('description')}
                placeholder="De qué se trata el producto…"
              />
            </label>

            <label className="pf-field pf-full">
              <span>Especificaciones (separadas por coma)</span>
              <input
                type="text"
                value={form.specs}
                onChange={set('specs')}
                placeholder="Ej. 20000 DPI, 7 botones, RGB"
              />
            </label>

            <label className="pf-field pf-full">
              <span>
                {product
                  ? 'Imagen nueva (dejá vacío para conservar la actual)'
                  : 'Imagen (PNG, JPG o WEBP)'}
              </span>
              {product && product.image && !image && (
                <img className="pf-preview" src={product.image} alt="" />
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0] || null)}
                required={!product}
              />
            </label>

            <label className="pf-check pf-full">
              <input
                type="checkbox"
                checked={form.freeShipping}
                onChange={(e) =>
                  setForm((f) => ({ ...f, freeShipping: e.target.checked }))
                }
              />
              <span>Envío gratis</span>
            </label>
          </div>

          {error && <em className="unlock-error">{error}</em>}

          <div className="pf-actions">
            <button
              type="button"
              className="ghost-btn"
              onClick={onClose}
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="primary-btn"
              disabled={saving}
            >
              {saving
                ? 'Guardando…'
                : product
                  ? 'Guardar cambios'
                  : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const MOVEMENT_TYPE_LABELS = {
  venta: 'Venta',
  compra: 'Compra',
  ajuste: 'Ajuste',
  devolucion: 'Devolución',
  inventario: 'Inventario físico',
}

const STOCK_STATUS_LABELS = {
  ok: 'OK',
  bajo: 'Bajo',
  sin: 'Sin stock',
}

const MOVEMENT_CHIPS = [
  { id: '', label: 'Todos' },
  { id: 'venta', label: 'Ventas' },
  { id: 'compra', label: 'Compras' },
  { id: 'ajuste', label: 'Ajustes' },
  { id: 'devolucion', label: 'Devoluciones' },
  { id: 'inventario', label: 'Inventario físico' },
]

function StockBadge({ status }) {
  return (
    <span className={`stock-badge ${status}`}>{STOCK_STATUS_LABELS[status] || status}</span>
  )
}

function StockScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [params, setParams] = useState({ q: '', low: '', category: '', brand: '', page: 1 })

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCats(res.categories || [])
      })
      .catch(() => {})
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrands(res.brands || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      q: params.q,
      low: params.low,
      page: String(params.page),
      limit: '50',
    })
    if (params.category) paramsString.set('category', params.category)
    if (params.brand) paramsString.set('brand', params.brand)
    apiGet(`/api/admin/inventory/stock?${paramsString}`)
      .then((res) => {
        if (!alive) return
        if (res.items.length === 0 && res.page > 1) {
          setParams((prev) => ({ ...prev, page: res.totalPages || 1 }))
          return
        }
        setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [params])

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const onCategory = (value) =>
    setParams((prev) => ({ ...prev, category: value, page: 1 }))

  const onBrand = (value) =>
    setParams((prev) => ({ ...prev, brand: value, page: 1 }))

  const toggleLow = () => {
    setParams((prev) => ({ ...prev, low: prev.low ? '' : '1', page: 1 }))
  }

  if (!data && !error) return <ScreenLoading label="Contando el stock…" />
  if (error) return <ScreenBlocked message={error} />

  const lowCount = data.items.filter((p) => p.status !== 'ok').length

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Stock actual</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>productos en el depósito</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá producto, marca o categoría…"
            aria-label="Buscar en stock"
          />
        </form>
        <div className="dash-filters">
          <SearchSelect
            id="stock-category-filter"
            label="Categoría"
            value={params.category}
            onChange={onCategory}
            options={cats.map((c) => ({ value: c.key, label: c.name }))}
          />
          <SearchSelect
            id="stock-brand-filter"
            label="Marca"
            value={params.brand}
            onChange={onBrand}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
        <div className="sale-chips">
          <button
            type="button"
            className={`sale-chip mono${params.low ? ' active' : ''}`}
            onClick={toggleLow}
          >
            Solo stock bajo <span>{lowCount}</span>
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>Mínimo</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="t-cell-product">
                    {p.image ? <img className="prod-thumb" src={p.image} alt="" loading="lazy" /> : <span className="prod-thumb empty" />}
                    <span>
                      <strong>{p.name}</strong>
                      <em>{p.brand}</em>
                    </span>
                  </span>
                </td>
                <td className="t-cat">{CATEGORY_LABELS[p.category] || p.category}</td>
                <td className="mono t-num t-money">{formatARS(p.price)}</td>
                <td>
                  <span className="stock-cell">
                    <strong className="mono">{p.stock}</strong>
                    <StockBadge status={p.status} />
                  </span>
                </td>
                <td className="mono t-num">{p.minStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="No hay productos que coincidan con el filtro." />}
      </div>

      {data.total > data.pageSize && (
        <div className="dash-pager">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            ← Anterior
          </button>
          <span className="mono">
            página {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

function MovementsScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [params, setParams] = useState({ type: '', q: '', page: 1 })

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      type: params.type,
      q: params.q,
      page: String(params.page),
      limit: '20',
    })
    apiGet(`/api/admin/inventory/movements?${paramsString}`)
      .then((res) => {
        if (!alive) return
        if (res.items.length === 0 && res.page > 1) {
          setParams((prev) => ({ ...prev, page: res.totalPages || 1 }))
          return
        }
        setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [params])

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  if (!data && !error) return <ScreenLoading label="Leyendo los movimientos…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Movimientos</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>anotaciones de stock</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá por producto…"
            aria-label="Buscar movimientos"
          />
        </form>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
      </div>

      <div className="sale-chips" role="group" aria-label="Filtrar movimientos">
        {MOVEMENT_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`sale-chip mono${params.type === chip.id ? ' active' : ''}`}
            onClick={() => setParams((prev) => ({ ...prev, type: chip.id, page: 1 }))}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Producto</th>
              <th>Tipo</th>
              <th>Variación</th>
              <th>Antes → Después</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m.id}>
                <td className="t-date" title={fullDate(m.createdAt)}>
                  {shortDate(m.createdAt)}
                </td>
                <td>
                  <span className="t-cell-name">
                    <strong>{m.productName}</strong>
                    <em>#{m.productId}</em>
                  </span>
                </td>
                <td>
                  <span className={`mv-type ${m.type}`}>{MOVEMENT_TYPE_LABELS[m.type] || m.type}</span>
                </td>
                <td className="mono">
                  <span className={`mv-delta ${m.delta >= 0 ? 'up' : 'down'}`}>
                    {m.delta >= 0 ? `+${m.delta}` : m.delta}
                  </span>
                </td>
                <td className="mono t-num">
                  {m.stockBefore} → {m.stockAfter}
                </td>
                <td className="t-dim">{m.reason || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="Todavía no hay movimientos con esos filtros." />}
      </div>

      {data.total > data.pageSize && (
        <div className="dash-pager">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            ← Anterior
          </button>
          <span className="mono">
            página {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

function AdjustmentsScreen({ canManage }) {
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState(null)
  const [params, setParams] = useState({ type: 'ajuste', q: '', page: 1 })
  const [form, setForm] = useState({ productId: '', delta: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/products?limit=100')
      .then((res) => {
        if (alive) setProducts(res.items || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      type: params.type,
      q: params.q,
      page: String(params.page),
      limit: '10',
    })
    apiGet(`/api/admin/inventory/movements?${paramsString}`)
      .then((res) => {
        if (alive) setMovements(res)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [params])

  const submitAdjustment = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    try {
      const res = await apiPost('/api/admin/inventory/adjustments', {
        productId: Number(form.productId),
        delta: Number(form.delta),
        reason: form.reason.trim(),
      })
      const product = products.find((p) => p.id === Number(form.productId))
      setNote(`Ajuste aplicado en "${product?.name || res.movement.productName}" → stock ${res.stock}`)
      setForm((f) => ({ ...f, delta: '', reason: '' }))
      setMovements((prev) => (prev ? { ...prev } : prev))
      setParams((prev) => ({ ...prev }))
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!movements) return <ScreenLoading label="Preparando ajustes…" />

  const selectedProduct = form.productId
    ? products.find((p) => p.id === Number(form.productId))
    : null
  const resultingStock =
    selectedProduct && form.delta !== ''
      ? selectedProduct.stock + Number(form.delta)
      : null

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Ajustes de stock</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{movements.total}</strong>
          <em>ajustes registrados</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}
      {!canManage && (
        <p className="sale-note">Solo el superadmin puede aplicar ajustes.</p>
      )}

      <div className="inv-grid">
        <form className="inv-panel" onSubmit={submitAdjustment}>
          <h2>Ajustar stock manualmente</h2>
          <label className="inv-field">
            <span>Producto</span>
            <select
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              required
            >
              <option value="">Elegí un producto…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} · {p.brand} (stock {p.stock})
                </option>
              ))}
            </select>
          </label>
          {selectedProduct && (
            <div className="inv-stock-hint mono">
              <span>Stock actual: <strong>{selectedProduct.stock}</strong></span>
              {resultingStock !== null && !Number.isNaN(resultingStock) && (
                <span className={resultingStock < 0 ? 'inv-stock-neg' : ''}>
                  después: <strong>{resultingStock}</strong>
                </span>
              )}
            </div>
          )}
          <label className="inv-field">
            <span>Cantidad (+o −)</span>
            <input
              type="number"
              value={form.delta}
              onChange={(e) => setForm((f) => ({ ...f, delta: e.target.value }))}
              placeholder="Ej. 5 suma, -3 resta"
              required
            />
          </label>
          <label className="inv-field">
            <span>Motivo</span>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Ej. Se encontró mercadería en depósito"
              required
            />
          </label>
          <button type="submit" className="primary-btn" disabled={saving || !canManage}>
            {saving ? 'Aplicando…' : 'Aplicar ajuste'}
          </button>
        </form>

        <div className="inv-panel">
          <h2>Últimos ajustes</h2>
          <div className="inv-mov-list">
            {movements.items.length === 0 && <p className="inv-empty">Todavía no hay ajustes.</p>}
            {movements.items.slice(0, 10).map((m) => (
              <div key={m.id} className="inv-mov-item">
                <div className="inv-mov-top">
                  <strong>{m.productName}</strong>
                  <span className={`mv-delta ${m.delta >= 0 ? 'up' : 'down'}`}>
                    {m.delta >= 0 ? `+${m.delta}` : m.delta}
                  </span>
                </div>
                <div className="inv-mov-sub">
                  <span>{m.reason || '—'}</span>
                  <em>{shortDate(m.createdAt)}</em>
                </div>
                <div className="inv-mov-stock mono">{m.stockBefore} → {m.stockAfter}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function MinStockScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [note, setNote] = useState('')
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [params, setParams] = useState({ page: 1, q: '', category: '', brand: '' })

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCats(res.categories || [])
      })
      .catch(() => {})
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrands(res.brands || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '50' })
    if (params.q) qs.set('q', params.q)
    if (params.category) qs.set('category', params.category)
    if (params.brand) qs.set('brand', params.brand)
    apiGet(`/api/admin/inventory/stock?${qs}`)
      .then((res) => {
        if (!alive) return
        setData(res)
        setDrafts((prev) => {
          const next = { ...prev }
          for (const p of res.items) {
            if (next[p.id] === undefined) next[p.id] = String(p.minStock)
          }
          return next
        })
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [version, params])

  const saveMin = async (product) => {
    setSavingId(product.id)
    setNote('')
    try {
      const res = await apiPut('/api/admin/inventory/min-stock', {
        productId: product.id,
        minStock: Number(drafts[product.id]),
      })
      setNote(`Mínimo guardado: "${product.name}" ≥ ${res.minStock}`)
      setVersion((v) => v + 1)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const onCategory = (value) =>
    setParams((prev) => ({ ...prev, category: value, page: 1 }))

  const onBrand = (value) =>
    setParams((prev) => ({ ...prev, brand: value, page: 1 }))

  if (!data && !error) return <ScreenLoading label="Leyendo los mínimos…" />
  if (error) return <ScreenBlocked message={error} />

  const lowCount = data.items.filter((p) => p.status !== 'ok').length

  const minUntouched = (product) =>
    String(drafts[product.id] ?? String(product.minStock)) === String(product.minStock)

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Stock mínimo</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{lowCount}</strong>
          <em>productos bajo el mínimo</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}
      {!canManage && (
        <p className="sale-note">Solo el administrador puede cambiar los mínimos.</p>
      )}

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá producto, marca o categoría…"
            aria-label="Buscar en stock mínimo"
          />
        </form>
        <div className="dash-filters">
          <SearchSelect
            id="stock-category-filter"
            label="Categoría"
            value={params.category}
            onChange={onCategory}
            options={cats.map((c) => ({ value: c.key, label: c.name }))}
          />
          <SearchSelect
            id="stock-brand-filter"
            label="Marca"
            value={params.brand}
            onChange={onBrand}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              <th>Mínimo</th>
              {canManage && <th>Guardar</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id} className={p.status !== 'ok' ? 'inv-alert-row' : ''}>
                <td>
                  <span className="t-cell-name">
                    <strong>{p.name}</strong>
                    <em>{p.brand}</em>
                  </span>
                </td>
                <td>
                  <span className="stock-cell">
                    <strong className="mono">{p.stock}</strong>
                    <StockBadge status={p.status} />
                  </span>
                </td>
                <td>
                  {canManage ? (
                    <input
                      className="inv-min-input mono"
                      type="number"
                      min="0"
                      value={drafts[p.id] ?? String(p.minStock)}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      aria-label={`Mínimo de ${p.name}`}
                    />
                  ) : (
                    <span className="mono">{p.minStock}</span>
                  )}
                </td>
                {canManage && (
                  <td>
                    <button
                      type="button"
                      className={`min-save-btn${savingId === p.id ? ' saving' : ''}`}
                      disabled={savingId === p.id || minUntouched(p)}
                      onClick={() => saveMin(p)}
                    >
                      {savingId === p.id ? <span className="min-save-spin" /> : <IconCheck />}
                      {savingId === p.id ? 'Guardando' : 'Guardar'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="No hay productos para configurar." />}
      </div>

      {data.total > data.pageSize && (
        <div className="dash-pager">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            ← Anterior
          </button>
          <span className="mono">
            página {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

function PurchasesScreen({ canManage }) {
  const [products, setProducts] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [params, setParams] = useState({ q: '', page: 1 })
  const [version, setVersion] = useState(0)
  const [form, setForm] = useState({
    supplier: '',
    invoice: '',
    lines: [{ productId: '', quantity: '1', cost: '' }],
  })
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/products?limit=100')
      .then((res) => {
        if (alive) setProducts(res.items || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      q: params.q,
      page: String(params.page),
      limit: '10',
    })
    apiGet(`/api/admin/inventory/purchases?${paramsString}`)
      .then((res) => {
        if (!alive) return
        if (res.items.length === 0 && res.page > 1) {
          setParams((prev) => ({ ...prev, page: res.totalPages || 1 }))
          return
        }
        setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [params, version])

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const updateLine = (index, field, value) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }))
  }

  const addLine = () => {
    setForm((f) => ({ ...f, lines: [...f.lines, { productId: '', quantity: '1', cost: '' }] }))
  }

  const removeLine = (index) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.length > 1 ? f.lines.filter((_, i) => i !== index) : f.lines,
    }))
  }

  const submitPurchase = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    try {
      const items = form.lines
        .map((l) => ({
          productId: Number(l.productId),
          quantity: Math.floor(Number(l.quantity)),
          cost: Number(l.cost),
        }))
        .filter((l) => Number.isFinite(l.productId) && l.quantity > 0 && Number.isFinite(l.cost) && l.cost >= 0)
      if (items.length === 0) {
        setNote('Elegí un producto y cargá cantidad y costo.')
        setSaving(false)
        return
      }
      const res = await apiPost('/api/admin/inventory/purchases', {
        supplier: form.supplier.trim(),
        invoice: form.invoice.trim(),
        items,
      })
      setNote(`Compra #${res.purchase.number} registrada — total ${formatARS(res.purchase.total)}. Stock actualizado.`)
      setForm({
        supplier: '',
        invoice: '',
        lines: [{ productId: '', quantity: '1', cost: '' }],
      })
      setVersion((v) => v + 1)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!data && !error) return <ScreenLoading label="Preparando compras…" />
  if (error) return <ScreenBlocked message={error} />

  const lineTotal = (line) => (Number(line.quantity) || 0) * (Number(line.cost) || 0)
  const purchaseTotal = form.lines.reduce((sum, line) => sum + lineTotal(line), 0)

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Compras a proveedores</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>compras registradas</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}
      {!canManage && (
        <p className="sale-note">Solo el superadmin puede cargar compras.</p>
      )}

      <div className="inv-grid">
        <form className="inv-panel" onSubmit={submitPurchase}>
          <h2>Nueva compra</h2>
          <label className="inv-field">
            <span>Proveedor</span>
            <input
              type="text"
              value={form.supplier}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              placeholder="Ej. Full Hogar - Distribuidora"
              required
            />
          </label>
          <label className="inv-field">
            <span>Nº factura / remito</span>
            <input
              type="text"
              value={form.invoice}
              onChange={(e) => setForm((f) => ({ ...f, invoice: e.target.value }))}
              placeholder="Opcional"
            />
          </label>

          <div className="pur-lines">
            {form.lines.map((line, index) => (
              <div key={index} className="pur-line">
                <div className="pur-line-top">
                  <label className="pur-line-field pur-line-product">
                    <span>Producto</span>
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(index, 'productId', e.target.value)}
                      required
                    >
                      <option value="">Elegí…</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} · {p.brand} (stock {p.stock})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="pur-line-remove"
                    aria-label="Quitar línea"
                    onClick={() => removeLine(index)}
                    disabled={form.lines.length <= 1}
                  >
                    <IconCross />
                  </button>
                </div>
                <div className="pur-line-bottom">
                  <label className="pur-line-field">
                    <span>Cant.</span>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    />
                  </label>
                  <label className="pur-line-field">
                    <span>Costo/u</span>
                    <input
                      type="number"
                      min="0"
                      value={line.cost}
                      onChange={(e) => updateLine(index, 'cost', e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <div className="pur-line-total mono">{formatARS(lineTotal(line))}</div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="ghost-btn pur-add" onClick={addLine}>
            <IconPlus /> Agregar producto
          </button>

          <div className="pur-total">
            <span>Total de la compra</span>
            <strong className="mono">{formatARS(purchaseTotal)}</strong>
          </div>

          <button type="submit" className="primary-btn" disabled={saving || !canManage}>
            {saving ? 'Guardando…' : 'Registrar compra'}
          </button>
        </form>

        <div className="inv-panel">
          <h2>Últimas compras</h2>
          <div className="dash-toolbar inv-toolbar">
            <form className="dash-search" role="search" onSubmit={submitSearch}>
              <IconSearch />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscá por proveedor…"
                aria-label="Buscar compras"
              />
            </form>
          </div>
          {data.items.length === 0 && <p className="inv-empty">Todavía no hay compras.</p>}
          <div className="inv-mov-list">
            {data.items.map((p) => (
              <div key={p.id} className="inv-mov-item">
                <div className="inv-mov-top">
                  <strong>
                    #{p.number} · {p.supplier}
                  </strong>
                  <span className="mono pur-item-total">{formatARS(p.total)}</span>
                </div>
                <div className="inv-mov-sub">
                  <span>{itemsSummary(p.items)}</span>
                  <em>{shortDate(p.createdAt)}</em>
                </div>
                {p.invoice && <div className="inv-mov-stock">Fact. {p.invoice}</div>}
              </div>
            ))}
          </div>
          {data.total > data.pageSize && (
            <div className="dash-pager">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                ← Anterior
              </button>
              <span className="mono">
                página {data.page} de {data.totalPages}
              </span>
              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PhysicalInventoryScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [counts, setCounts] = useState({})
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [params, setParams] = useState({ page: 1, q: '', category: '', brand: '' })

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCats(res.categories || [])
      })
      .catch(() => {})
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrands(res.brands || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '50' })
    if (params.q) qs.set('q', params.q)
    if (params.category) qs.set('category', params.category)
    if (params.brand) qs.set('brand', params.brand)
    apiGet(`/api/admin/inventory/stock?${qs}`)
      .then((res) => {
        if (!alive) return
        setData(res)
        setCounts((prev) => {
          const next = { ...prev }
          for (const p of res.items) {
            if (next[p.id] === undefined) next[p.id] = String(p.stock)
          }
          return next
        })
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [version, params])

  const submitCount = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    setResult(null)
    try {
      const countsBody = (data.items || [])
        .map((p) => ({ productId: p.id, units: Number(counts[p.id]) }))
        .filter((row) => Number.isFinite(row.units) && row.units >= 0)
      if (countsBody.length === 0) {
        setNote('Cargá al menos un conteo.')
        setSaving(false)
        return
      }
      const res = await apiPost('/api/admin/inventory/physical', { counts: countsBody })
      setResult(res)
      setNote(`Inventario guardado: ${res.updated} producto${res.updated === 1 ? '' : 's'} actualizado${res.updated === 1 ? '' : 's'}.`)
      setVersion((v) => v + 1)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const onCategory = (value) =>
    setParams((prev) => ({ ...prev, category: value, page: 1 }))

  const onBrand = (value) =>
    setParams((prev) => ({ ...prev, brand: value, page: 1 }))

  if (!data && !error) return <ScreenLoading label="Preparando el conteo…" />
  if (error) return <ScreenBlocked message={error} />

  const diffFor = (product) => {
    const counted = Number(counts[product.id])
    return Number.isFinite(counted) ? counted - product.stock : 0
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Inventario físico</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>productos por contar</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}
      {!canManage && (
        <p className="sale-note">Solo el administrador puede guardar el conteo.
        </p>
      )}

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá producto, marca o categoría…"
            aria-label="Buscar en inventario físico"
          />
        </form>
        <div className="dash-filters">
          <SearchSelect
            id="stock-category-filter"
            label="Categoría"
            value={params.category}
            onChange={onCategory}
            options={cats.map((c) => ({ value: c.key, label: c.name }))}
          />
          <SearchSelect
            id="stock-brand-filter"
            label="Marca"
            value={params.brand}
            onChange={onBrand}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
      </div>

      <form onSubmit={submitCount}>
        <div className="table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock actual</th>
                <th>Conteo físico</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => {
                const diff = diffFor(p)
                return (
                  <tr key={p.id} className={diff !== 0 ? 'inv-alert-row' : ''}>
                    <td>
                      <span className="t-cell-name">
                        <strong>{p.name}</strong>
                        <em>{p.brand || ''}</em>
                      </span>
                    </td>
                    <td className="mono t-num">{p.stock}</td>
                    <td>
                      <input
                        className="inv-count-input mono"
                        type="number"
                        min="0"
                        value={counts[p.id] ?? ''}
                        onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))}
                        aria-label={`Conteo de ${p.name}`}
                      />
                    </td>
                    <td>
                      <span className={`mv-delta ${diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {data.items.length === 0 && <EmptyNote text="No hay productos para contar." />}
        </div>

        {result && (
          <div className="inv-result">
            <h3>Resultado del conteo</h3>
            <ul>
              {result.results.map((r) =>
                r.status === 'igual' ? null : (
                  <li key={r.productId}>
                    <span>{r.name}</span>
                    <em className="mono">
                      era {r.stockBefore} → {r.units} ({r.delta > 0 ? `+${r.delta}` : r.delta})
                    </em>
                  </li>
                ),
              )}
            </ul>
            {result.updated === 0 && <p className="inv-empty">Todo cuadró: el conteo coincide con el stock.</p>}
          </div>
        )}

        <div className="inv-submit">
          <button type="submit" className="primary-btn" disabled={saving || !canManage}>
            {saving ? 'Guardando…' : 'Guardar inventario físico'}
          </button>
          {data.total > data.pageSize && (
            <div className="dash-pager" style={{ marginTop: 0 }}>
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                ← Anterior
              </button>
              <span className="mono">
                página {data.page} de {data.totalPages}
              </span>
              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}

const CHART_COLORS = ['#d7261d', '#ffc61a', '#c79a63', '#c8dcf2', '#43473c', '#6f7366']
const CHART_TICK = { fill: '#6f7366', fontSize: 10 }
const CHART_GRID = { stroke: '#d7dcd6', strokeDasharray: '2 4' }

function compactARS(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k`
  return `${value}`
}

function chartDayShort(date) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}

function ChartTip({ active, payload, label, formatter }) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="chart-tip">
      {label ? <div className="chart-tip-label">{label}</div> : null}
      <div className="chart-tip-body">
        {payload.map((entry, i) => (
          <div key={`${entry.dataKey}-${i}`} className="chart-tip-row">
            <span
              className="chart-tip-dot"
              style={{ background: entry.color || entry.payload?.fill || '#d7261d' }}
            />
            <em>{entry.name}</em>
            <strong className="mono">{formatter ? formatter(entry.value, entry.dataKey) : entry.value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}

function ChartLegend({ data }) {
  return (
    <div className="chart-legend">
      {data.map((item) => (
        <span key={item.key} className="chart-legend-item">
          <span className="chart-tip-dot" style={{ background: item.color }} />
          {item.label}
          <em className="mono">{item.value}</em>
        </span>
      ))}
    </div>
  )
}

const REPORT_PERIODS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
  { days: 365, label: '1 año' },
  { days: 0, label: 'Todo' },
]

function ReportPeriodBar({ days, onChange }) {
  return (
    <div className="sale-chips" role="group" aria-label="Periodo del reporte">
      {REPORT_PERIODS.map((p) => (
        <button
          key={p.days}
          type="button"
          className={`sale-chip mono${days === p.days ? ' active' : ''}`}
          onClick={() => onChange(p.days)}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}

function reportPaymentLabel(key) {
  if (key === 'unknown' || !key) return 'Web (MP)'
  return PAYMENT_LABELS[key] || key
}

function SalesReportScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)

  useEffect(() => {
    let alive = true
    apiGet(`/api/admin/reports/sales?${days ? `days=${days}` : ''}`)
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [days])

  if (!data && !error) return <ScreenLoading label="Armando el reporte de ventas…" />
  if (error) return <ScreenBlocked message={error} />

  const chartData = data.series.map((s) => ({ label: chartDayShort(s.date), total: s.total, count: s.count }))
  const payData = data.byPayment.map((p) => ({ key: p.key, label: reportPaymentLabel(p.key), value: p.total }))
  const payTotal = payData.reduce((sum, p) => sum + p.value, 0)

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Reportes</span>
          <h1>Ventas</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{formatARS(data.totals.total)}</strong>
          <em>{data.totals.count} ventas en el período</em>
        </div>
      </header>

      <ReportPeriodBar days={days} onChange={setDays} />

      <div className="kpi-rack">
        <KpiTicket label="Facturado" value={formatARS(data.totals.total)} note="en el período" />
        <KpiTicket label="Ventas" value={data.totals.count} note={`${data.totals.units} unidades`} />
        <KpiTicket label="Ticket promedio" value={formatARS(data.totals.avgTicket)} note="por venta" />
        <KpiTicket label="Devoluciones" value={data.refunded.count} note={formatARS(data.refunded.total)} />
      </div>

      <div className="rep-grid">
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Facturado por día</h2>
            <span className="dash-count">línea · ventas punteado</span>
          </div>
          {data.series.length === 0 ? (
            <EmptyNote text="Sin ventas en el período." />
          ) : (
            <div className="rep-chart">
              <ResponsiveContainer width="100%" height={230}>
                <AreaChart data={chartData} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="areaSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#d7261d" stopOpacity={0.16} />
                      <stop offset="100%" stopColor="#d7261d" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid {...CHART_GRID} vertical={false} />
                  <XAxis dataKey="label" tick={CHART_TICK} interval="preserveStartEnd" minTickGap={16} axisLine={{ stroke: '#b9c0b8' }} tickLine={false} />
                  <YAxis yAxisId="0" tickFormatter={compactARS} tick={CHART_TICK} width={40} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="count" orientation="right" tick={CHART_TICK} width={26} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<ChartTip formatter={(v, key) => (key === 'count' ? `${v} ventas` : formatARS(v))} />}
                    cursor={{ stroke: '#b9c0b8', strokeDasharray: '3 3' }}
                  />
                  <Area yAxisId="0" type="monotone" dataKey="total" name="Facturado" stroke="#d7261d" strokeWidth={2} fill="url(#areaSales)" dot={false} activeDot={{ r: 4, stroke: '#fbfcfa', strokeWidth: 2 }} />
                  <Area yAxisId="count" type="monotone" dataKey="count" name="Ventas" stroke="#171a12" strokeWidth={1.5} strokeDasharray="4 4" fill="none" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Por forma de pago</h2>
            <span className="dash-count">facturado</span>
          </div>
          {data.byPayment.length === 0 ? (
            <EmptyNote text="Sin datos todavía." />
          ) : (
            <>
              <div className="rep-chart">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={payData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="#fbfcfa"
                      strokeWidth={2}
                    >
                      {payData.map((p, i) => (
                        <Cell key={p.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip formatter={(v) => formatARS(v)} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                data={payData.map((p, i) => ({
                  key: p.key,
                  label: p.label,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                  value: `${formatARS(p.value)} · ${payTotal ? Math.round((p.value / payTotal) * 100) : 0}%`,
                }))}
              />
            </>
          )}
          {data.bySource.length > 0 && (
            <div className="rep-breakdown">
              {data.bySource.map((s) => (
                <span key={s.key} className="payment-tag">{s.key} · {s.count}</span>
              ))}
            </div>
          )}
          <div className="rep-note mono">
            {data.totals.discount > 0 && (
              <span>descuentos: {formatARS(data.totals.discount)}</span>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function ProductsReportScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)

  useEffect(() => {
    let alive = true
    apiGet(`/api/admin/reports/products?${days ? `days=${days}` : ''}`)
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [days])

  if (!data && !error) return <ScreenLoading label="Armando el reporte de productos…" />
  if (error) return <ScreenBlocked message={error} />

  const top = data.items.slice(0, 8)

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Reportes</span>
          <h1>Productos vendidos</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.totals.units}</strong>
          <em>unidades · {data.totals.uniqueProducts} productos</em>
        </div>
      </header>

      <ReportPeriodBar days={days} onChange={setDays} />

      <div className="kpi-rack">
        <KpiTicket label="Unidades" value={data.totals.units} note="vendidas" />
        <KpiTicket label="Productos" value={data.totals.uniqueProducts} note="con movimiento" />
        <KpiTicket label="Facturado" value={formatARS(data.totals.revenue)} note="en el período" />
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Unidades</th>
              <th>Precio medio</th>
              <th>Facturado</th>
              <th>Stock hoy</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.productId}>
                <td>
                  <span className="t-cell-name">
                    <strong>{p.name}</strong>
                    <em>{p.brand || `#${p.productId}`}</em>
                  </span>
                </td>
                <td className="mono t-num">{p.units}</td>
                <td className="mono t-num">{formatARS(p.avgPrice)}</td>
                <td className="mono t-num t-money">{formatARS(p.revenue)}</td>
                <td>
                  <span className="stock-cell">
                    <strong className="mono">{p.stock}</strong>
                    <StockBadge status={p.stock <= 0 ? 'sin' : p.stock <= (p.minStock || 0) ? 'bajo' : 'ok'} />
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="Sin ventas en el período." />}
      </div>

      <section className="dash-card">
        <div className="dash-card-head">
          <h2>Más vendidos</h2>
          <span className="dash-count">por unidades</span>
        </div>
        {data.items.length === 0 ? null : (
          <div className="rep-chart">
            <ResponsiveContainer width="100%" height={Math.max(180, top.length * 34 + 20)}>
              <BarChart data={top} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={170}
                  tick={{ ...CHART_TICK, fill: '#43473c', fontSize: 11 }}
                  tickFormatter={(value) => (value.length > 28 ? `${value.slice(0, 26)}…` : value)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTip formatter={(v) => `${v} uds`} />} cursor={{ fill: '#e7f1fb' }} />
                <Bar dataKey="units" name="Unidades" fill="#d7261d" radius={[0, 3, 3, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}

function ProfitReportScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)

  useEffect(() => {
    let alive = true
    apiGet(`/api/admin/reports/profit?${days ? `days=${days}` : ''}`)
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [days])

  if (!data && !error) return <ScreenLoading label="Calculando ganancias…" />
  if (error) return <ScreenBlocked message={error} />

  const series = data.series.map((s) => ({ label: chartDayShort(s.date), Facturado: s.revenue, Costo: s.cogs }))
  const top = data.items.slice(0, 8)

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Reportes</span>
          <h1>Ganancias</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{formatARS(data.totals.profit)}</strong>
          <em>{data.totals.marginPct.toFixed(1)}% de margen</em>
        </div>
      </header>

      <ReportPeriodBar days={days} onChange={setDays} />

      <div className="kpi-rack">
        <KpiTicket label="Facturado" value={formatARS(data.totals.revenue)} note="ventas" />
        <KpiTicket label="Costo" value={formatARS(data.totals.cogs)} note={`${data.totals.units} uds`} />
        <KpiTicket label="Ganancia bruta" value={formatARS(data.totals.profit)} note={`${data.totals.marginPct.toFixed(1)}%`} />
        <KpiTicket label="Compras a proveedores" value={formatARS(data.totals.spentOnPurchases)} note={`${data.totals.purchaseCount} compras`} />
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Unidades</th>
              <th>Facturado</th>
              <th>Costo</th>
              <th>Ganancia</th>
              <th>Margen</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.productId}>
                <td>
                  <span className="t-cell-name">
                    <strong>{p.name}</strong>
                    <em>{p.brand || `#${p.productId}`}</em>
                  </span>
                </td>
                <td className="mono t-num">{p.units}</td>
                <td className="mono t-num">{formatARS(p.revenue)}</td>
                <td className="mono t-num t-cost">{formatARS(p.cogs)}</td>
                <td className="mono t-num t-money">
                  <span className={`mv-delta ${p.profit >= 0 ? 'up' : 'down'}`}>{formatARS(p.profit)}</span>
                </td>
                <td className="mono t-num">{p.marginPct.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="Sin ventas en el período." />}
      </div>

      {series.length > 0 && (
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Facturado vs costo</h2>
            <span className="dash-count">por día</span>
          </div>
          <div className="rep-chart">
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={series} margin={{ top: 6, right: 6, left: 0, bottom: 0 }}>
                <CartesianGrid {...CHART_GRID} vertical={false} />
                <XAxis dataKey="label" tick={CHART_TICK} interval="preserveStartEnd" minTickGap={16} axisLine={{ stroke: '#b9c0b8' }} tickLine={false} />
                <YAxis tickFormatter={compactARS} tick={CHART_TICK} width={44} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTip formatter={(v) => formatARS(v)} />} cursor={{ fill: '#e7f1fb' }} />
                <Bar dataKey="Facturado" name="Facturado" fill="#d7261d" radius={[3, 3, 0, 0]} barSize={14} />
                <Bar dataKey="Costo" name="Costo" fill="#c79a63" radius={[3, 3, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {top.length > 0 && (
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Ganancia por producto</h2>
            <span className="dash-count">bruta</span>
          </div>
          <div className="rep-chart">
            <ResponsiveContainer width="100%" height={Math.max(180, top.length * 34 + 20)}>
              <BarChart data={top} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={170}
                  tick={{ ...CHART_TICK, fill: '#43473c', fontSize: 11 }}
                  tickFormatter={(value) => (value.length > 28 ? `${value.slice(0, 26)}…` : value)}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTip formatter={(v) => formatARS(v)} />} cursor={{ fill: '#e7f1fb' }} />
                <Bar dataKey="profit" name="Ganancia" fill="#d7261d" radius={[0, 3, 3, 0]} barSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}

function StockReportScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/reports/stock')
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [])

  if (!data && !error) return <ScreenLoading label="Leyendo el stock…" />
  if (error) return <ScreenBlocked message={error} />

  const statusData = [
    { key: 'ok', name: 'Óptimo', value: data.statusCounts.ok, color: '#171a12' },
    { key: 'bajo', name: 'Bajo mínimo', value: data.statusCounts.bajo, color: '#ffc61a' },
    { key: 'sin', name: 'Sin stock', value: data.statusCounts.sin, color: '#d7261d' },
  ].filter((s) => s.value > 0)
  const top = data.topValue

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Reportes</span>
          <h1>Stock</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{formatARS(data.totals.value)}</strong>
          <em>valor del inventario · {data.totals.units} unidades</em>
        </div>
      </header>

      <div className="kpi-rack">
        <KpiTicket label="Productos" value={data.totals.products} note="en catálogo" />
        <KpiTicket label="Unidades" value={data.totals.units} note="en depósito" />
        <KpiTicket label="Valor del stock" value={formatARS(data.totals.value)} note="a precio venta" />
        <KpiTicket label="Ganancia potencial" value={formatARS(data.totals.potentialProfit)} note="valor − costo" />
      </div>

      <div className="rep-grid">
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Estado del stock</h2>
            <span className="dash-count">{data.totals.products} productos</span>
          </div>
          {statusData.length === 0 ? (
            <EmptyNote text="Catálogo vacío." />
          ) : (
            <>
              <div className="rep-chart">
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={52}
                      outerRadius={70}
                      paddingAngle={2}
                      stroke="#fbfcfa"
                      strokeWidth={2}
                    >
                      {statusData.map((s) => (
                        <Cell key={s.key} fill={s.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTip formatter={(v) => `${v} producto${v === 1 ? '' : 's'}`} />}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                data={statusData.map((s) => ({
                  key: s.key,
                  label: s.name,
                  color: s.color,
                  value: `${s.value} · ${data.totals.products ? Math.round((s.value / data.totals.products) * 100) : 0}%`,
                }))}
              />
            </>
          )}
        </section>

        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Top por valor</h2>
            <span className="dash-count">a precio venta</span>
          </div>
          {data.topValue.length === 0 ? (
            <EmptyNote text="Catálogo vacío." />
          ) : (
            <div className="rep-chart">
              <ResponsiveContainer width="100%" height={Math.max(220, top.length * 24 + 20)}>
                <BarChart data={top} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ ...CHART_TICK, fill: '#43473c', fontSize: 11 }}
                    tickFormatter={(value) => (value.length > 28 ? `${value.slice(0, 26)}…` : value)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTip formatter={(v) => formatARS(v)} />} cursor={{ fill: '#e7f1fb' }} />
                  <Bar dataKey="value" name="Valor" fill="#c8dcf2" radius={[0, 3, 3, 0]} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <section className="dash-card">
        <div className="dash-card-head">
          <h2>Stock bajo / agotado</h2>
          <span className="dash-count">{data.low.length} productos</span>
        </div>
        {data.low.length === 0 ? (
          <EmptyNote text="Nada bajo el mínimo. Stock en orden." />
        ) : (
          <div className="table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.low.map((p) => (
                  <tr key={p.id} className="inv-alert-row">
                    <td>
                      <span className="t-cell-name">
                        <strong>{p.name}</strong>
                        <em>{p.brand}</em>
                      </span>
                    </td>
                    <td className="mono t-num">{p.stock}</td>
                    <td className="mono t-num">{p.minStock}</td>
                    <td><StockBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function CustomersReportScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [days, setDays] = useState(30)

  useEffect(() => {
    let alive = true
    apiGet(`/api/admin/reports/customers?${days ? `days=${days}` : ''}`)
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [days])

  if (!data && !error) return <ScreenLoading label="Agrupando clientes…" />
  if (error) return <ScreenBlocked message={error} />

  const top = data.items.slice(0, 8)
  const recent = data.items.filter((c) => c.name !== 'Sin identificar')
  const recentData = recent.slice(0, 8).map((c, i) => ({ key: c.email || `c${i}`, label: c.name, value: c.total }))
  const recentTotal = recentData.reduce((sum, r) => sum + r.value, 0)

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Reportes</span>
          <h1>Clientes</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.totals.customers}</strong>
          <em>clientes identificados · {data.totals.total ? formatARS(data.totals.total) : ''} en compras</em>
        </div>
      </header>

      <ReportPeriodBar days={days} onChange={setDays} />

      <div className="kpi-rack">
        <KpiTicket label="Clientes" value={data.totals.customers} note="identificados" />
        <KpiTicket label="Compras totales" value={data.items.reduce((s, c) => s + c.count, 0)} note="en el período" />
        <KpiTicket label="Facturado" value={formatARS(data.totals.total)} note="en el período" />
      </div>

      <div className="rep-grid">
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Top clientes</h2>
            <span className="dash-count">por gasto</span>
          </div>
          {data.items.length === 0 ? (
            <EmptyNote text="Sin compras en el período." />
          ) : (
            <div className="rep-chart">
              <ResponsiveContainer width="100%" height={Math.max(200, top.length * 34 + 20)}>
                <BarChart data={top} layout="vertical" margin={{ top: 0, right: 12, left: 0, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={170}
                    tick={{ ...CHART_TICK, fill: '#43473c', fontSize: 11 }}
                    tickFormatter={(value) => (value.length > 28 ? `${value.slice(0, 26)}…` : value)}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip content={<ChartTip formatter={(v) => formatARS(v)} />} cursor={{ fill: '#e7f1fb' }} />
                  <Bar dataKey="total" name="Gasto" fill="#d7261d" radius={[0, 3, 3, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Participación</h2>
            <span className="dash-count">por cliente</span>
          </div>
          {recentData.length === 0 ? (
            <EmptyNote text="Sin compras en el período." />
          ) : (
            <>
              <div className="rep-chart">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={recentData}
                      dataKey="value"
                      nameKey="label"
                      innerRadius={52}
                      outerRadius={72}
                      paddingAngle={2}
                      stroke="#fbfcfa"
                      strokeWidth={2}
                    >
                      {recentData.map((r, i) => (
                        <Cell key={r.key} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTip formatter={(v) => formatARS(v)} />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ChartLegend
                data={recentData.map((r, i) => ({
                  key: r.key,
                  label: r.label,
                  color: CHART_COLORS[i % CHART_COLORS.length],
                  value: `${formatARS(r.value)} · ${recentTotal ? Math.round((r.value / recentTotal) * 100) : 0}%`,
                }))}
              />
            </>
          )}
        </section>
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Compras</th>
              <th>Total</th>
              <th>Ticket promedio</th>
              <th>Última</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c, idx) => (
              <tr key={idx}>
                <td>
                  <span className="t-cell-name">
                    <strong>{c.name}</strong>
                    {c.email && <em>{c.email}</em>}
                  </span>
                </td>
                <td className="mono t-num">{c.count}</td>
                <td className="mono t-num t-money">{formatARS(c.total)}</td>
                <td className="mono t-num">{formatARS(c.avg)}</td>
                <td className="t-date">{c.last ? shortDate(c.last) : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="Sin compras en el período." />}
      </div>
    </div>
  )
}

function promoStateChip(active, onLabel, offLabel) {
  return (
    <span className={`promo-state${active ? ' on' : ''}`}>
      {active ? onLabel : offLabel}
    </span>
  )
}

function CouponsScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/coupons')
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [refresh])

  const openNew = () => {
    setEditing(null)
    setForm({ code: '', percent: 10, active: true, description: '' })
    setFormOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c.id)
    setForm({ code: c.code, percent: c.percent, active: c.active, description: c.description })
    setFormOpen(true)
  }

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: key === 'active' ? e.target.checked : e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    try {
      const payload = { ...form, percent: Number(form.percent) }
      if (editing) {
        await apiPut(`/api/admin/coupons/${editing}`, payload)
      } else {
        await apiPost('/api/admin/coupons', payload)
      }
      setNote(editing ? 'Cupón actualizado.' : `Cupón ${form.code.toUpperCase()} creado.`)
      setFormOpen(false)
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c) => {
    setNote('')
    try {
      await apiPut(`/api/admin/coupons/${c.id}`, { active: !c.active })
      setNote(c.active ? 'Cupón desactivado.' : 'Cupón activado.')
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`¿Eliminar el cupón ${c.code}?`)) return
    setNote('')
    try {
      await apiDelete(`/api/admin/coupons/${c.id}`)
      setNote('Cupón eliminado.')
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    }
  }

  if (!data && !error) return <ScreenLoading label="Cargando cupones…" />
  if (error) return <ScreenBlocked message={error} />

  const activeCount = data.items.filter((c) => c.active).length

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Promociones</span>
          <h1>Cupones</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{activeCount}</strong>
          <em>cupones activos</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          El cliente ingresa el código en el checkout y recibe el descuento sobre el total.
        </p>
        {canManage && (
          <button type="button" className="primary-btn dash-add" onClick={openNew}>
            <IconPlus />
            Nuevo cupón
          </button>
        )}
      </div>

      {note && <p className="sale-note">{note}</p>}

      {formOpen && (
        <section className="dash-card promo-form">
          <div className="dash-card-head">
            <h2>{editing ? `Editar ${form.code}` : 'Nuevo cupón'}</h2>
            <button type="button" className="ghost-btn" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
          </div>
          <form onSubmit={submit}>
            <div className="pf-grid">
              <label className="pf-field">
                <span>Código</span>
                <input
                  type="text"
                  value={form.code}
                  onChange={set('code')}
                  placeholder="Ej.: BIENVENIDA10"
                  style={{ textTransform: 'uppercase' }}
                  required
                />
              </label>

              <label className="pf-field">
                <span>Descuento (%)</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={form.percent}
                  onChange={set('percent')}
                  required
                />
              </label>

              <label className="pf-field pf-full">
                <span>Descripción (opcional)</span>
                <input
                  type="text"
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Ej.: Bienvenida para clientes nuevos"
                />
              </label>

              <label className="pf-field pf-full promo-check">
                <input type="checkbox" checked={form.active} onChange={set('active')} />
                <span>Cupón activo</span>
              </label>
            </div>

            <div className="pf-actions">
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear cupón'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Descuento</th>
              <th>Descripción</th>
              <th>Estado</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((c) => (
              <tr key={String(c.id)} className={!c.active ? 'inv-muted-row' : ''}>
                <td>
                  <span className="t-cell-name">
                    <strong className="mono">{c.code}</strong>
                    <em>{shortDate(c.createdAt)}</em>
                  </span>
                </td>
                <td className="mono t-num t-money">{c.percent}%</td>
                <td className="t-desc">{c.description || '—'}</td>
                <td>{promoStateChip(c.active, 'Activo', 'Pausado')}</td>
                {canManage && (
                  <td>
                    <span className="row-actions">
                      <button
                        type="button"
                        className="row-btn"
                        title={c.active ? 'Pausar' : 'Activar'}
                        onClick={() => toggleActive(c)}
                      >
                        {c.active ? <IconCheck /> : <IconClock />}
                      </button>
                      <button
                        type="button"
                        className="row-btn"
                        title="Editar"
                        onClick={() => openEdit(c)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="row-btn row-btn-danger"
                        title="Eliminar"
                        onClick={() => remove(c)}
                      >
                        <IconTrash />
                      </button>
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && (
          <EmptyNote text="Todavía no hay cupones." />
        )}
      </div>
    </div>
  )
}

function ScreenBlocked({ message }) {
  return (
    <div className="dash-screen dash-unlock">
      <div className="unlock-card">
        <span className="unlock-icon">
          <IconChart />
        </span>
        <span className="dash-eyebrow">Algo se trabó</span>
        <h1>No pudimos leer el panel</h1>
        <p>{message}.</p>
      </div>
    </div>
  )
}

function MetaScreen({ kind, title, eyebrow, empty, canManage }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [formOpen, setFormOpen] = useState(false)

  const hasKey = kind === 'categories'
  const singular = hasKey ? 'categoría' : 'marca'
  const plural = hasKey ? 'categorías' : 'marcas'

  useEffect(() => {
    let alive = true
    apiGet(`/api/admin/${kind}`)
      .then((data) => {
        if (!alive) return
        setItems(data.items || [])
        setNote('')
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [kind, refresh])

  const openForm = (item = null) => {
    setEditing(item)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleSaved = (saved) => {
    closeForm()
    setNote(
      editing
        ? `${singular} actualizada: ${saved.name}`
        : `${singular} creada: ${saved.name}`,
    )
    setRefresh((n) => n + 1)
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar ${singular} "${item.name}"?`)) return
    try {
      const target = hasKey ? item.key : encodeURIComponent(item.name)
      await apiDelete(`/api/admin/${kind}/${target}`)
      setNote(`${singular} eliminada: ${item.name}`)
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    }
  }

  if (!items && !error) return <ScreenLoading label="Cargando la estantería…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{items.length}</strong>
          <em>en la estantería</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <span className="count-tag mono">
          {items.length} {plural}
        </span>
        {canManage && (
          <button type="button" className="primary-btn dash-add" onClick={() => openForm()}>
            <IconPlus />
            Agregar {singular}
          </button>
        )}
      </div>

      {note && <p className="sale-note">{note}</p>}

      {formOpen && (
        <MetaForm
          hasKey={hasKey}
          item={editing}
          noun={singular}
          path={`/api/admin/${kind}`}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Nombre</th>
              {hasKey && <th>Clave</th>}
              <th>Productos</th>
              <th>Estado</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={hasKey ? item.key : item.name}>
                <td>
                  <strong>{item.name}</strong>
                </td>
                {hasKey && <td className="mono t-cat">{item.key}</td>}
                <td className="mono t-num">{item.productCount}</td>
                <td>
                  <span className={`status-tag${item.active ? ' on' : ' off'}`}>
                    {item.active ? <IconCheck /> : <IconClock />}
                    {item.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                {canManage && (
                  <td>
                    <span className="row-actions">
                      <button
                        type="button"
                        className="row-btn"
                        aria-label={`Editar ${item.name}`}
                        onClick={() => openForm(item)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="row-btn row-btn-danger"
                        aria-label={`Eliminar ${item.name}`}
                        onClick={() => handleDelete(item)}
                      >
                        <IconTrash />
                      </button>
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <EmptyNote text={empty} />}
      </div>
    </div>
  )
}

function MetaForm({ hasKey, item, noun, path, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: item?.name || '',
    key: item?.key || '',
    active: item?.active !== false,
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    const body = hasKey ? form : { name: form.name, active: form.active }
    try {
      if (item) {
        const target = hasKey ? item.key : encodeURIComponent(item.name)
        const saved = await apiPut(`${path}/${target}`, body)
        onSaved(saved)
      } else {
        const saved = await apiPost(path, body)
        onSaved(saved)
      }
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <div className="product-overlay" onMouseDown={saving ? undefined : onClose}>
      <div
        className="product-panel"
        role="dialog"
        aria-modal="true"
        aria-label={item ? `Editar ${noun}` : `Agregar ${noun}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="product-head">
          <div>
            <span className="dash-eyebrow">Estantería</span>
            <h2>{item ? `Editar ${noun}` : `Agregar ${noun}`}</h2>
          </div>
          <button
            type="button"
            className="product-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <IconCross />
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="pf-grid">
            <label className="pf-field pf-full">
              <span>Nombre</span>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder={hasKey ? 'Ej. Audio' : 'Ej. Logitech'}
                required
              />
            </label>
            {hasKey && (
              <label className="pf-field pf-full">
                <span>Clave (identificador)</span>
                <input
                  type="text"
                  value={form.key}
                  onChange={set('key')}
                  placeholder="Ej. audio — se genera sola si la dejás vacía"
                />
              </label>
            )}
            <label className="pf-check pf-full">
              <input type="checkbox" checked={form.active} onChange={set('active')} />
              <span>{hasKey ? 'Categoría activa' : 'Marca activa'}</span>
            </label>
          </div>

          {error && <em className="unlock-error">{error}</em>}

          <div className="pf-actions">
            <button type="button" className="ghost-btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="primary-btn" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function OffersScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [params, setParams] = useState({ q: '', category: '', brand: '', page: 1 })
  const [note, setNote] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [edits, setEdits] = useState({})
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCats(res.categories || [])
      })
      .catch(() => {})
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrands(res.brands || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({
      q: params.q,
      page: String(params.page),
      limit: '10',
    })
    if (params.category) qs.set('category', params.category)
    if (params.brand) qs.set('brand', params.brand)
    apiGet(`/api/admin/offers?${qs}`)
      .then((res) => {
        if (!alive) return
        if (res.items.length === 0 && res.page > 1) {
          setParams((prev) => ({ ...prev, page: res.totalPages || 1 }))
          return
        }
        setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [params])

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const onCategory = (value) =>
    setParams((prev) => ({ ...prev, category: value, page: 1 }))

  const onBrand = (value) =>
    setParams((prev) => ({ ...prev, brand: value, page: 1 }))

  const oldPriceOf = (p) => edits[p.id]?.oldPrice ?? p.oldPrice ?? ''

  const priceOf = (p) => edits[p.id]?.price ?? p.price ?? ''

  const setField = (id, key) => (value) =>
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value },
    }))

  const hasEdit = (p) => Boolean(edits[p.id])

  const saveOffer = async (p) => {
    setSavingId(p.id)
    setNote('')
    try {
      await apiPost('/api/admin/offers', {
        productId: p.id,
        oldPrice: oldPriceOf(p),
        price: priceOf(p),
      })
      setNote(`Oferta guardada: ${p.name}`)
      setEdits((prev) => {
        const next = { ...prev }
        delete next[p.id]
        return next
      })
      setParams((prev) => ({ ...prev }))
    } catch (err) {
      setNote(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const removeOffer = async (p) => {
    if (!window.confirm(`¿Quitar "${p.name}" de las ofertas?`)) return
    setNote('')
    try {
      await apiDelete(`/api/admin/offers/${p.id}`)
      setNote(`Oferta removida: ${p.name}`)
      if (data && data.items.length === 1 && data.page > 1) {
        setParams((prev) => ({ ...prev, page: prev.page - 1 }))
      } else {
        setParams((prev) => ({ ...prev }))
      }
    } catch (err) {
      setNote(err.message)
    }
  }

  const handleAdded = (saved) => {
    setFormOpen(false)
    setNote(`Producto en oferta: ${saved.name}`)
    setParams((prev) => ({ ...prev, page: 1 }))
  }

  if (!data && !error) return <ScreenLoading label="Cargando ofertas…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Estantería</span>
          <h1>Ofertas de la semana</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>en oferta</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá producto, marca o categoría…"
            aria-label="Buscar ofertas"
          />
        </form>
        <div className="dash-filters">
          <SearchSelect
            id="stock-category-filter"
            label="Categoría"
            value={params.category}
            onChange={onCategory}
            options={cats.map((c) => ({ value: c.key, label: c.name }))}
          />
          <SearchSelect
            id="stock-brand-filter"
            label="Marca"
            value={params.brand}
            onChange={onBrand}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
        {canManage && (
          <button
            type="button"
            className="primary-btn dash-add"
            onClick={() => setFormOpen(true)}
          >
            <IconPlus />
            Poner en oferta
          </button>
        )}
      </div>

      {note && <p className="sale-note">{note}</p>}

      {formOpen && (
        <OfferForm onClose={() => setFormOpen(false)} onSaved={handleAdded} />
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Nuevo $</th>
              <th>Antes $</th>
              <th>Descuento</th>
              <th>Stock</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => {
              const old = Number(oldPriceOf(p))
              const cur = Number(priceOf(p))
              const discount =
                old > cur && cur > 0 ? Math.round((1 - cur / old) * 100) : 0
              return (
                <tr key={p.id}>
                  <td>
                    <span className="t-cell-product">
                      <img className="prod-thumb" src={p.image} alt="" loading="lazy" />
                      <span>
                        <strong>{p.name}</strong>
                        <em>{p.brand}</em>
                      </span>
                    </span>
                  </td>
                  <td className="mono t-num">{formatARS(p.price)}</td>
                  <td>
                    <input
                      className="price-input mono"
                      type="number"
                      min="1"
                      step="1"
                      value={priceOf(p)}
                      onChange={(e) => setField(p.id, 'price')(e.target.value)}
                      disabled={!canManage}
                      aria-label={`Nuevo precio de ${p.name}`}
                    />
                  </td>
                  <td>
                    <input
                      className="price-input mono"
                      type="number"
                      min="1"
                      step="1"
                      value={oldPriceOf(p)}
                      onChange={(e) => setField(p.id, 'oldPrice')(e.target.value)}
                      disabled={!canManage}
                      aria-label={`Precio anterior de ${p.name}`}
                    />
                  </td>
                  <td className="mono t-num t-money">
                    {discount > 0 ? `${discount}% OFF` : '—'}
                  </td>
                  <td className="mono t-num">{p.stock}</td>
                  {canManage && (
                    <td>
                      <span className="row-actions">
                        <button
                          type="button"
                          className="row-btn"
                          disabled={!hasEdit(p) || savingId === p.id}
                          onClick={() => saveOffer(p)}
                          aria-label={`Guardar oferta de ${p.name}`}
                        >
                          <IconCheck />
                        </button>
                        <button
                          type="button"
                          className="row-btn row-btn-danger"
                          onClick={() => removeOffer(p)}
                          aria-label={`Quitar ${p.name} de las ofertas`}
                        >
                          <IconTrash />
                        </button>
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {data.items.length === 0 && (
          <EmptyNote text="Todavía no hay productos en oferta." />
        )}
      </div>

      {data.totalPages > 1 && (
        <div className="dash-pager">
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={data.page <= 1}
          >
            ← Anterior
          </button>
          <span className="mono">
            Página {data.page} de {data.totalPages} · {data.total} ofertas
          </span>
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={data.page >= data.totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}

function OfferForm({ onClose, onSaved }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ productId: '', oldPrice: '', price: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/products?limit=100')
      .then((res) => {
        if (alive) setProducts(res.items || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const selected = products.find((p) => String(p.id) === String(form.productId))

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const selectProduct = (e) => {
    const id = e.target.value
    const p = products.find((x) => String(x.id) === String(id))
    setForm((f) => ({
      ...f,
      productId: id,
      oldPrice: p ? String(p.price) : '',
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = await apiPost('/api/admin/offers', {
        productId: form.productId,
        oldPrice: form.oldPrice,
        price: form.price,
      })
      onSaved(saved)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const newPrice = Number(form.price)
  const oldPriceNum = Number(form.oldPrice)
  const previewDiscount =
    oldPriceNum > newPrice && newPrice > 0
      ? Math.round((1 - newPrice / oldPriceNum) * 100)
      : 0

  return (
    <div className="product-overlay" onMouseDown={saving ? undefined : onClose}>
      <div
        className="product-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Poner en oferta"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="product-head">
          <div>
            <span className="dash-eyebrow">Estantería</span>
            <h2>Poner en oferta</h2>
          </div>
          <button
            type="button"
            className="product-close"
            onClick={onClose}
            aria-label="Cerrar"
          >
            <IconCross />
          </button>
        </header>

        <form onSubmit={submit}>
          <div className="pf-grid">
            <label className="pf-field pf-full">
              <span>Producto</span>
              <select value={form.productId} onChange={selectProduct} required>
                <option value="">Elegí un producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.brand}
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <p className="list-note pf-full">
                Precio actual de {selected.name}:{' '}
                <strong className="mono">{formatARS(selected.price)}</strong>
              </p>
            )}

            <label className="pf-field pf-full">
              <span>Nuevo precio ($)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.price}
                onChange={set('price')}
                placeholder={selected ? String(selected.price) : 'El precio con descuento'}
                required
              />
            </label>

            <label className="pf-field pf-full">
              <span>Precio anterior ($) — para mostrar el % OFF</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.oldPrice}
                onChange={set('oldPrice')}
                placeholder="Precio de lista"
              />
            </label>

            {selected && newPrice > 0 && (
              <p className="list-note pf-full">
                Queda en <strong className="mono">{formatARS(newPrice)}</strong>
                {previewDiscount > 0 && (
                  <>
                    {' '}
                    · <span className="tag-discount inline">{previewDiscount}% OFF</span>
                  </>
                )}
              </p>
            )}
          </div>

          {error && <em className="unlock-error">{error}</em>}

          <div className="pf-actions">
            <button type="button" className="ghost-btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="primary-btn" disabled={saving || !form.productId}>
              {saving ? 'Guardando…' : 'Poner en oferta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const IMPORT_EXAMPLE = [
  {
    name: 'Parlante Bluetooth Boom',
    brand: 'Sony',
    category: 'audio',
    price: 75000,
    stock: 12,
    freeShipping: true,
    badge: 'Nuevo',
  },
  {
    name: 'Mouse Inalámbrico Lite',
    brand: 'Logitech',
    category: 'perifericos',
    price: 18990,
    oldPrice: 24990,
    stock: 40,
  },
]

function ImportScreen({ canManage }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const loadExample = () => {
    setText(JSON.stringify(IMPORT_EXAMPLE, null, 2))
    setResult(null)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    setResult(null)

    let products
    try {
      products = JSON.parse(text)
    } catch {
      setError('El texto no es un JSON válido. Revisá comas, llaves y corchetes.')
      setBusy(false)
      return
    }

    try {
      const res = await apiPost('/api/admin/import/products', { products })
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Estantería</span>
          <h1>Importar productos</h1>
        </div>
      </header>

      {canManage ? (
        <form onSubmit={submit} className="import-wrap">
          <label className="pf-field">
            <span>Productos en formato JSON</span>
            <textarea
              className="import-textarea"
              rows={12}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setResult(null)
              }}
              placeholder='[{"name":"Teclado Gamer RGB","brand":"Logitech","category":"perifericos","price":45000}]'
            />
          </label>

          <p className="import-help">
            Requeridos: <strong>name</strong>, <strong>brand</strong>,{' '}
            <strong>category</strong> (clave válida) y <strong>price</strong>.
            Opcionales: oldPrice, stock, rating, freeShipping, badge, image,
            description y specs (arreglo o texto separado por coma).
          </p>

          <div className="pf-actions">
            <button type="button" className="ghost-btn" onClick={loadExample}>
              Cargar ejemplo
            </button>
            <button type="submit" className="primary-btn" disabled={busy}>
              {busy ? 'Importando…' : 'Importar productos'}
            </button>
          </div>

          {error && <em className="unlock-error">{error}</em>}

          {result && (
            <div className="import-result">
              <p>
                <strong>{result.created}</strong> producto(s) importado(s).
              </p>
              {result.skipped.length > 0 && (
                <>
                  <p>Se omitieron {result.skipped.length} fila(s):</p>
                  <ul>
                    {result.skipped.map((skip, index) => (
                      <li key={index}>
                        Línea {skip.index}: {skip.error}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </form>
      ) : (
        <div className="table-wrap">
          <EmptyNote text="Solo superadmins pueden importar productos." />
        </div>
      )}
    </div>
  )
}

const PERM_CODES = [
  'settings.manage',
  'users.manage',
  'catalog.manage',
  'coupons.manage',
  'offers.manage',
  'inventory.write',
  'sales.return',
  'quotes.delete',
]

const PERM_LABELS = {
  'settings.manage': 'Configuración del negocio',
  'users.manage': 'Usuarios del panel',
  'catalog.manage': 'Productos, categorías, marcas y precios',
  'coupons.manage': 'Cupones de descuento',
  'offers.manage': 'Ofertas de la semana',
  'inventory.write': 'Editar stock (ajustes, compras, mínimo y físico)',
  'sales.return': 'Devoluciones y reembolsos',
  'quotes.delete': 'Eliminar presupuestos',
}

function ToggleRow({ label, hint, checked, onChange, disabled = false }) {
  return (
    <label className="set-wrap">
      <span className="set-wrap-txt">
        <strong>{label}</strong>
        {hint && <em>{hint}</em>}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
    </label>
  )
}

function isErrorNote(text) {
  return /(No se pudo|No pod|No tenés|Ya existe|requeridos|inválido|vencida|incorrectas)/i.test(
    text || '',
  )
}

function SettingsNote({ text }) {
  if (!text) return null
  const error = isErrorNote(text)
  return (
    <p className={`sale-note ${error ? 'sale-note-err' : 'sale-note-ok'}`}>
      {text}
    </p>
  )
}

function SetImageField({ label, hint, value, uploading, onFile, onRemove, wide }) {
  return (
    <div className={wide ? 'set-image-box is-wide' : 'set-image-box'}>
      <span className="set-image-label">{label}</span>
      {value ? (
        <a
          className="set-image-preview"
          href={value}
          target="_blank"
          rel="noreferrer"
          title="Abrir imagen completa"
        >
          <img
            src={value}
            alt=""
            className={wide ? 'set-image-fit-cover' : 'set-image-fit-contain'}
          />
        </a>
      ) : (
        <div className="set-image-preview is-empty">
          <span className="set-image-empty">Sin imagen</span>
        </div>
      )}
      <div className="set-image-actions">
        <label className="primary-btn set-image-upload">
          {uploading ? 'Subiendo…' : 'Subir imagen'}
          <input
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            disabled={uploading}
            onChange={onFile}
          />
        </label>
        {value && (
          <>
            <a
              className="ghost-btn set-image-open"
              href={value}
              target="_blank"
              rel="noreferrer"
            >
              Ver
            </a>
            <button type="button" className="ghost-btn" onClick={onRemove}>
              Quitar
            </button>
          </>
        )}
      </div>
      {hint && <em className="set-hint">{hint}</em>}
    </div>
  )
}

function UsersScreen() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/users')
      .then((data) => {
        if (alive) setUsers(data)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [refresh])

  const openNew = () => {
    setEditing(null)
    setGeneratedPassword('')
    setForm({ name: '', email: '', role: 'admin' })
    setFormOpen(true)
  }

  const openEdit = (u) => {
    setEditing(u.id)
    setGeneratedPassword('')
    setForm({ name: u.name, role: u.role, password: '' })
    setFormOpen(true)
  }

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    setGeneratedPassword('')
    try {
      if (editing) {
        const payload = { name: form.name, role: form.role }
        if (form.password) payload.password = form.password
        await apiPut(`/api/admin/users/${editing}`, payload)
        setNote('Usuario actualizado.')
      } else {
        const created = await apiPost('/api/admin/users', {
          name: form.name,
          email: form.email,
          role: form.role,
        })
        setGeneratedPassword(created.password)
        setNote(`Usuario ${created.email} creado.`)
      }
      setFormOpen(false)
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u) => {
    setNote('')
    try {
      await apiPut(`/api/admin/users/${u.id}`, { active: !u.active })
      setNote(u.active ? 'Usuario desactivado.' : 'Usuario activado.')
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    }
  }

  if (!users && !error) return <ScreenLoading label="Cargando usuarios…" />
  if (error) return <ScreenBlocked message={error} />

  const activeCount = users.filter((u) => u.active).length

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Configuración</span>
          <h1>Usuarios</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{activeCount}</strong>
          <em>usuarios activos</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Quienes entran al panel deben activar acceso. Las contraseñas son generadas y no se guardan en texto plano.
        </p>
        <button type="button" className="primary-btn dash-add" onClick={openNew}>
          <IconPlus />
          Nuevo usuario
        </button>
      </div>

      <SettingsNote text={note} />

      {generatedPassword && (
        <div className="set-password-box">
          <span>Contraseña generada (mostrala una sola vez):</span>
          <code className="mono">{generatedPassword}</code>
        </div>
      )}

      {formOpen && (
        <section className="dash-card set-card">
          <div className="dash-card-head">
            <h2>{editing ? `Editar ${form.name || 'usuario'}` : 'Nuevo usuario'}</h2>
            <button type="button" className="ghost-btn" onClick={() => setFormOpen(false)}>
              <IconCross />
              Cerrar
            </button>
          </div>
          <form className="set-form" onSubmit={submit}>
            <label className="inv-field">
              <span>Nombre</span>
              <input
                value={form.name}
                onChange={set('name')}
                required
                minLength={2}
              />
            </label>
            <label className="inv-field">
              <span>Email</span>
              <input
                type="email"
                value={form.email || ''}
                onChange={set('email')}
                required
                disabled={!!editing}
              />
            </label>
            <label className="inv-field">
              <span>Rol</span>
              <select value={form.role} onChange={set('role')}>
                <option value="admin">admin</option>
                <option value="superadmin">superadmin</option>
              </select>
            </label>
            {editing && (
              <label className="inv-field">
                <span>Nueva contraseña (opcional)</span>
                <input
                  type="password"
                  value={form.password || ''}
                  onChange={set('password')}
                  autoComplete="new-password"
                />
              </label>
            )}
            <div className="set-actions">
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Alta</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <span className="t-cell-product">
                    <span className="user-avatar mono" aria-hidden="true">
                      {initials(u.name)}
                    </span>
                    <span>
                      <strong>{u.name}</strong>
                      <em>{u.email}</em>
                    </span>
                  </span>
                </td>
                <td>
                  <span className={`role-chip role-${u.role}`}>{u.role}</span>
                </td>
                <td>
                  <span className={`status-tag${u.active ? '' : ' status-muted'}`}>
                    {u.active ? <IconCheck /> : <IconCross />}
                    {u.active ? 'Activo' : 'Desactivado'}
                  </span>
                </td>
                <td className="t-date">{shortDate(u.createdAt)}</td>
                <td>
                  <span className="row-actions">
                    <button type="button" className="row-btn" aria-label={`Editar ${u.name}`} onClick={() => openEdit(u)}>
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className={`row-btn ${u.active ? 'row-btn-danger' : ''}`}
                      aria-label={u.active ? `Desactivar ${u.name}` : `Activar ${u.name}`}
                      onClick={() => toggleActive(u)}
                    >
                      {u.active ? <IconCross /> : <IconCheck />}
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SettingsFetcher({ render }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/settings')
      .then((res) => {
        if (alive) setData(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [])

  if (error) return <ScreenBlocked message={error} />
  if (!data) return <ScreenLoading label="Leyendo ajustes…" />
  return render(data)
}

function RolesScreen() {
  const save = async (selected) => {
    await apiPut('/api/admin/settings', {
      section: 'roles',
      value: { admin: selected },
    })
    return 'Permisos de admin guardados.'
  }

  return (
    <SettingsFetcher
      render={(settings) => {
        const adminPerms = new Set(settings.roles?.admin || [])
        return (
          <RolesScreenBody
            adminPerms={adminPerms}
            save={save}
          />
        )
      }}
    />
  )
}

function RolesScreenBody({ adminPerms, save }) {
  const [selected, setSelected] = useState([...adminPerms].sort())
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const applyToggle = (code) => {
    setNote('')
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    )
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    try {
      const msg = await save(selected)
      setNote(msg)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Configuración</span>
          <h1>Roles y permisos</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          El rol <strong>superadmin</strong> siempre tiene acceso total. El rol{' '}
          <strong>admin</strong> ve únicamente los módulos marcados acá.
        </p>
      </div>

      <SettingsNote text={note} />

      <form className="set-card set-roles" onSubmit={submit}>
        <h3>Permisos del rol admin</h3>
        <div className="set-toggles">
          {PERM_CODES.map((code) => (
            <ToggleRow
              key={code}
              label={PERM_LABELS[code]}
              hint={code}
              checked={selected.includes(code)}
              onChange={() => applyToggle(code)}
            />
          ))}
        </div>
        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar permisos'}
          </button>
        </div>
      </form>
    </div>
  )
}

function PaymentsScreen() {
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const saveAll = async (payments, checkout) => {
    setSaving(true)
    setNote('')
    try {
      await apiPut('/api/admin/settings', { section: 'payments', value: payments })
      await apiPut('/api/admin/settings', { section: 'checkout', value: checkout })
      setNote('Medios de pago guardados.')
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <PaymentsScreenBody
          settings={settings}
          saving={saving}
          note={note}
          onSave={saveAll}
        />
      )}
    />
  )
}

function PaymentsScreenBody({ settings, saving, note, onSave }) {
  const methods = settings.payments?.methods || { efectivo: true, tarjeta: true, transferencia: true }
  const [form, setForm] = useState({
    efectivo: methods.efectivo !== false,
    tarjeta: methods.tarjeta !== false,
    transferencia: methods.transferencia !== false,
    statementDescriptor: settings.checkout?.statementDescriptor || 'TechStore',
  })

  const toggle = (key) => (on) => setForm((f) => ({ ...f, [key]: on }))

  const submit = (e) => {
    e.preventDefault()
    onSave(
      { methods: { efectivo: form.efectivo, tarjeta: form.tarjeta, transferencia: form.transferencia } },
      { statementDescriptor: form.statementDescriptor.trim() || 'TechStore' },
    )
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Configuración</span>
          <h1>Métodos de pago</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Qué medios podés cobrar desde la caja del panel. La web siempre cobra con Mercado Pago.
        </p>
      </div>

      <SettingsNote text={note} />

      <form className="set-card" onSubmit={submit}>
        <h3>En la caja (panel)</h3>
        <div className="set-toggles">
          <ToggleRow label="Efectivo" hint="Pago en el local" checked={form.efectivo} onChange={toggle('efectivo')} />
          <ToggleRow label="Tarjeta" hint="Tarjeta de débito o crédito" checked={form.tarjeta} onChange={toggle('tarjeta')} />
          <ToggleRow label="Transferencia" hint="Transferencia bancaria" checked={form.transferencia} onChange={toggle('transferencia')} />
        </div>

        <h3>Mercado Pago</h3>
        <label className="inv-field">
          <span>Descriptor en el resumen (statement descriptor)</span>
          <input value={form.statementDescriptor} onChange={(e) => setForm((f) => ({ ...f, statementDescriptor: e.target.value }))} maxLength={32} />
        </label>
        <p className="set-hint">
          El texto que ven tus clientes en el resumen de la tarjeta al pagar por la web.
        </p>

        <div className="set-card set-info">
          <strong>Credenciales de Mercado Pago</strong>
          <p>
            La access token y la public key se leen del archivo <code>.env</code> del servidor
            (variables <code>MP_ACCESS_TOKEN</code> y <code>MP_PUBLIC_KEY</code>). No se guardan en
            la base de datos por seguridad.
          </p>
        </div>

        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

function StoreScreen() {
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const save = async (store) => {
    setSaving(true)
    setNote('')
    try {
      await apiPut('/api/admin/settings', { section: 'store', value: store })
      setNote('Datos del negocio guardados.')
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <StoreScreenBody settings={settings} saving={saving} note={note} onSave={save} />
      )}
    />
  )
}

function StoreScreenBody({ settings, saving, note, onSave }) {
  const store = settings.store || {}
  const [form, setForm] = useState({
    name: store.name || '',
    tagline: store.tagline || '',
    logoUrl: store.logoUrl || '',
    coverUrl: store.coverUrl || '',
    phone: store.phone || '',
    whatsapp: store.whatsapp || '',
    email: store.email || '',
    addressFull: store.addressFull || '',
    addressShort: store.addressShort || '',
    hours: store.hours || '',
    band: store.band || '',
  })
  const [uploading, setUploading] = useState(null)
  const [imageResult, setImageResult] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const uploadImage = async (which, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploading(which)
    setImageResult('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('field', which)
      const res = await apiUpload('/api/admin/settings/media', fd)
      setForm((f) => ({ ...f, [`${which}Url`]: res[which] }))
      setImageResult(
        `${which === 'logo' ? 'Logo' : 'Portada'} actualizado. Guardalo con los demás cambios.`,
      )
    } catch (err) {
      setImageResult(err.message)
    } finally {
      setUploading(null)
    }
  }

  const removeImage = (which) => {
    setImageResult('')
    setForm((f) => ({ ...f, [`${which}Url`]: '' }))
  }

  const submit = (e) => {
    e.preventDefault()
    onSave({ ...form, phone: form.phone.trim(), email: form.email.trim() })
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Configuración</span>
          <h1>Datos del negocio</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Estos datos se muestran en la tienda: cabecera, pie de página, mapa, portada y botón de WhatsApp.
        </p>
      </div>

      <SettingsNote text={note} />
      <SettingsNote text={imageResult} />

      <form className="set-card set-form" onSubmit={submit}>
        <h3>Logo y portada</h3>
        <div className="set-row set-images">
          <SetImageField
            label="Logo"
            hint="Aparece en el header y el pie de la tienda. PNG con fondo transparente recomendado."
            value={form.logoUrl}
            uploading={uploading === 'logo'}
            onFile={(e) => uploadImage('logo', e)}
            onRemove={() => removeImage('logo')}
          />
          <SetImageField
            label="Portada"
            hint="Imagen de fondo del hero de inicio. Si no hay, el hero queda sin imagen."
            value={form.coverUrl}
            uploading={uploading === 'cover'}
            onFile={(e) => uploadImage('cover', e)}
            onRemove={() => removeImage('cover')}
            wide
          />
        </div>

        <h3>Identidad</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>Nombre de la tienda</span>
            <input value={form.name} onChange={set('name')} required minLength={2} />
          </label>
          <label className="inv-field">
            <span>Frase corta (bajo el logo)</span>
            <input value={form.tagline} onChange={set('tagline')} />
          </label>
        </div>

        <h3>Contacto</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>Teléfono fijo</span>
            <input value={form.phone} onChange={set('phone')} placeholder="11 5555 4294" />
          </label>
          <label className="inv-field">
            <span>WhatsApp (sin + ni espacios)</span>
            <input value={form.whatsapp} onChange={set('whatsapp')} placeholder="5491155554294" />
          </label>
          <label className="inv-field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={set('email')} />
          </label>
        </div>

        <h3>Ubicación y horarios</h3>
        <div className="set-row">
          <label className="inv-field set-grow">
            <span>Dirección completa (para el mapa)</span>
            <input value={form.addressFull} onChange={set('addressFull')} />
          </label>
          <label className="inv-field">
            <span>Dirección corta (marcas de la tienda)</span>
            <input value={form.addressShort} onChange={set('addressShort')} />
          </label>
        </div>
        <label className="inv-field">
          <span>Horarios de atención</span>
          <input value={form.hours} onChange={set('hours')} />
        </label>

        <h3>Franja del pie de página</h3>
        <label className="inv-field">
          <span>Texto promocional</span>
          <textarea value={form.band} onChange={set('band')} rows={2} />
        </label>

        <div className="set-actions">
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}

function GeneralScreen() {
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  const save = async (shipping, general) => {
    setSaving(true)
    setNote('')
    try {
      await apiPut('/api/admin/settings', { section: 'shipping', value: shipping })
      await apiPut('/api/admin/settings', { section: 'general', value: general })
      setNote('Configuración general guardada.')
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SettingsFetcher
      render={(settings) => (
        <GeneralScreenBody settings={settings} saving={saving} note={note} onSave={save} />
      )}
    />
  )
}

function GeneralScreenBody({ settings, saving, note, onSave }) {
  const shipping = settings.shipping || {}
  const general = settings.general || {}
  const [form, setForm] = useState({
    cost: String(shipping.cost || 5999),
    freeThreshold: String(shipping.freeThreshold || 300000),
    label: shipping.label || 'Envío a domicilio',
  })
  const [marquee, setMarquee] = useState(
    (Array.isArray(general.marquee) ? general.marquee : []).filter(Boolean),
  )
  const [marqueeInput, setMarqueeInput] = useState('')
  const [steps, setSteps] = useState(
    (Array.isArray(general.installments) ? general.installments : []).map((s) => ({
      minPrice: String(s.minPrice || 0),
      months: String(s.months || 3),
    })),
  )

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const addMarquee = () => {
    const text = marqueeInput.trim()
    if (!text) return
    setMarquee((prev) => [...prev, text])
    setMarqueeInput('')
  }

  const addStep = () => {
    const last = steps[steps.length - 1]
    const nextMin = last ? Number(last.minPrice) * 2 : 50000
    setSteps((prev) => [...prev, { minPrice: String(nextMin), months: '3' }])
  }

  const submit = (e) => {
    e.preventDefault()
    onSave(
      {
        cost: Math.max(0, Number(form.cost) || 0),
        freeThreshold: Math.max(0, Number(form.freeThreshold) || 0),
        label: form.label.trim() || 'Envío a domicilio',
      },
      {
        marquee: marquee.filter(Boolean),
        installments: steps
          .map((s) => ({
            minPrice: Math.max(0, Number(s.minPrice) || 0),
            months: Math.max(1, Number(s.months) || 3),
          }))
          .sort((a, b) => a.minPrice - b.minPrice),
      },
    )
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Configuración</span>
          <h1>Configuración general</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Envíos, cuotas y la cinta superior de la tienda. Afecta el checkout, el carrito y las tarjetas de producto.
        </p>
      </div>

      <SettingsNote text={note} />

      <form className="set-card set-form" onSubmit={submit}>
        <h3>Envíos</h3>
        <div className="set-row">
          <label className="inv-field">
            <span>Costo de envío (ARS)</span>
            <input type="number" min="0" value={form.cost} onChange={set('cost')} className="mono" />
          </label>
          <label className="inv-field">
            <span>Envío gratis desde (ARS)</span>
            <input type="number" min="0" value={form.freeThreshold} onChange={set('freeThreshold')} className="mono" />
          </label>
          <label className="inv-field">
            <span>Nombre del envío</span>
            <input value={form.label} onChange={set('label')} />
          </label>
        </div>
        <p className="set-hint">Si el costo es 0, el envío es siempre gratis.</p>

        <h3>Cinta superior (marquee)</h3>
        <div className="set-list">
          {marquee.map((item, index) => (
            <div key={`${item}-${index}`} className="set-chip">
              <span>{item}</span>
              <button type="button" className="x-btn" aria-label={`Quitar ${item}`} onClick={() => setMarquee((prev) => prev.filter((_, i) => i !== index))}>
                <IconCross />
              </button>
            </div>
          ))}
          {marquee.length === 0 && <p className="set-empty">Sin mensajes. La cinta queda oculta.</p>}
        </div>
        <div className="set-inline-add">
          <input value={marqueeInput} onChange={(e) => setMarqueeInput(e.target.value)} placeholder="Nuevo mensaje…" />
          <button type="button" className="ghost-btn" onClick={addMarquee}>
            <IconPlus />
            Agregar
          </button>
        </div>

        <h3>Cuotas sin interés</h3>
        <p className="set-hint">Cada tramo define el tope de cuotas para compras desde el precio mínimo. Ordenalas sin importar el orden: se ordenan solas al guardar.</p>
        <div className="set-steps">
          {steps.map((step, index) => (
            <div key={index} className="set-inline-add">
              <label className="inv-field">
                <span>Desde (ARS)</span>
                <input type="number" min="0" className="mono" value={step.minPrice} onChange={(e) => setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, minPrice: e.target.value } : s)))} />
              </label>
              <label className="inv-field">
                <span>Cuotas</span>
                <input type="number" min="1" className="mono" value={step.months} onChange={(e) => setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, months: e.target.value } : s)))} />
              </label>
              <button type="button" className="x-btn" aria-label="Quitar tramo" onClick={() => setSteps((prev) => prev.filter((_, i) => i !== index))}>
                <IconCross />
              </button>
            </div>
          ))}
        </div>
        <div className="set-actions">
          <button type="button" className="ghost-btn" onClick={addStep}>
            <IconPlus />
            Agregar tramo
          </button>
          <button type="submit" className="primary-btn" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </div>
  )
}