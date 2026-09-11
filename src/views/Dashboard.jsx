import { useEffect, useMemo, useState } from 'react'
import { formatARS } from '../data/format'
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
  IconLock,
  IconLogout,
  IconPlus,
  IconRefresh,
  IconSearch,
  IconSearchOff,
  IconTrash,
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
const REJECTED_GROUP = new Set(['rejected', 'cancelled', 'charged_back'])

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
  const [attempt, setAttempt] = useState(0)

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
      children: [
        { id: 'products', label: 'Productos' },
        ...(user?.role === 'superadmin'
          ? [
              { id: 'product-categories', label: 'Categorías' },
              { id: 'product-brands', label: 'Marcas' },
              { id: 'product-variants', label: 'Variantes' },
              { id: 'product-prices', label: 'Precios' },
              { id: 'product-offers', label: 'Ofertas' },
              { id: 'product-import', label: 'Importar productos' },
            ]
          : []),
      ],
    },
    { id: 'sales', label: 'Ventas', icon: IconCard },
  ]

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
              ? screen === 'products' || screen.startsWith('product-')
              : screen === item.id
            return (
              <div key={item.id} className="dash-nav-group">
                <button
                  type="button"
                  className={`dash-nav-item${active ? ' active' : ''}`}
                  onClick={() => changeScreen(item.id)}
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
          <ProductsScreen canManage={user?.role === 'superadmin'} />
        )}
        {gate === 'ready' && screen === 'product-categories' && (
          <MetaScreen
            kind="categories"
            title="Categorías"
            eyebrow="Estantería"
            empty="Todavía no hay categorías."
            canManage={user?.role === 'superadmin'}
          />
        )}
        {gate === 'ready' && screen === 'product-brands' && (
          <MetaScreen
            kind="brands"
            title="Marcas"
            eyebrow="Estantería"
            empty="Todavía no hay marcas."
            canManage={user?.role === 'superadmin'}
          />
        )}
        {gate === 'ready' && screen === 'product-variants' && (
          <VariantsScreen canManage={user?.role === 'superadmin'} />
        )}
        {gate === 'ready' && screen === 'product-prices' && (
          <PricesScreen canManage={user?.role === 'superadmin'} />
        )}
        {gate === 'ready' && screen === 'product-offers' && (
          <OffersScreen canManage={user?.role === 'superadmin'} />
        )}
        {gate === 'ready' && screen === 'product-import' && (
          <ImportScreen canManage={user?.role === 'superadmin'} />
        )}
        {gate === 'ready' && screen === 'sales' && <SalesScreen />}
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
            <button type="button" onClick={() => onView('sales')}>
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
  const [params, setParams] = useState({ q: '', page: 1 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      q: params.q,
      page: String(params.page),
      limit: '10',
    })
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

function SalesScreen() {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('all')
  const [rechecking, setRechecking] = useState({})
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/orders')
      .then((data) => {
        if (alive) setOrders(data)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [])

  const recheck = async (order) => {
    setRechecking((m) => ({ ...m, [order.id]: true }))
    try {
      const data = await apiConfirmOrder(order.id)
      const changed = data.status !== order.status
      setOrders((list) =>
        list.map((o) =>
          o.id === data.id
            ? { ...o, status: data.status, paymentId: data.paymentId, payer: data.payer }
            : o,
        ),
      )
      setNote(
        changed
          ? `Pedido #${shortId(order.id)} verificado: ${order.status} → ${data.status}`
          : `Pedido #${shortId(order.id)} verificado: sigue ${data.status}`,
      )
    } catch (err) {
      setNote(err.message)
    } finally {
      setRechecking((m) => ({ ...m, [order.id]: false }))
    }
  }

  useOrderEvents((data) => {
    setOrders((list) =>
      list
        ? list.map((o) =>
            o.id === data.id
              ? { ...o, status: data.status, paymentId: data.paymentId, payer: data.payer || o.payer }
              : o,
          )
        : list,
    )
  })

  const groups = useMemo(() => {
    const counts = {
      all: 0,
      approved: 0,
      pending: 0,
      rejected: 0,
    }
    const list = orders || []
    for (const order of list) {
      counts.all += 1
      if (order.status === 'approved') counts.approved += 1
      if (PENDING_GROUP.has(order.status)) counts.pending += 1
      if (REJECTED_GROUP.has(order.status)) counts.rejected += 1
    }
    return counts
  }, [orders])

  const filtered = useMemo(() => {
    const list = orders || []
    if (filter === 'all') return list
    if (filter === 'pending') return list.filter((o) => PENDING_GROUP.has(o.status))
    if (filter === 'rejected')
      return list.filter((o) => REJECTED_GROUP.has(o.status))
    return list.filter((o) => o.status === filter)
  }, [orders, filter])

  if (!orders && !error) return <ScreenLoading label="Contando las ventas…" />
  if (error) return <ScreenBlocked message={error} />

  const chips = [
    { id: 'all', label: 'Todas', count: groups.all },
    { id: 'approved', label: 'Aprobadas', count: groups.approved },
    { id: 'pending', label: 'Pendientes', count: groups.pending },
    { id: 'rejected', label: 'Rechazadas', count: groups.rejected },
  ]

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Libro de caja</span>
          <h1>Ventas</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{groups.all}</strong>
          <em>pedidos registrados</em>
        </div>
      </header>

      <div className="sale-chips" role="group" aria-label="Filtrar por estado">
        {chips.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`sale-chip mono${filter === chip.id ? ' active' : ''}`}
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
              <th>Pedido</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Detalle</th>
              <th>Cupón</th>
              <th>Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
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
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <EmptyNote text="Aún no hay ventas con ese estado." />
        )}
      </div>
    </div>
  )
}

function itemsSummary(items) {
  const names = (items || []).map((item) => item.name)
  if (names.length === 0) return '—'
  if (names.length <= 2) return names.join(' · ')
  return `${names.slice(0, 2).join(' · ')} +${names.length - 2} más`
}

function ProductForm({ product, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    name: product?.name || '',
    brand: product?.brand || '',
    category: product?.category || 'audio',
    price: product?.price ?? '',
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

function VariantsScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [params, setParams] = useState({ q: '', page: 1 })
  const [productOptions, setProductOptions] = useState([])
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/products?limit=100')
      .then((res) => {
        if (alive) setProductOptions(res.items || [])
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
    apiGet(`/api/admin/variants?${qs}`)
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

  const openForm = (variant = null) => {
    setEditing(variant)
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
        ? `Variante actualizada: ${saved.name}`
        : `Variante creada: ${saved.name}`,
    )
    setParams((prev) => ({ ...prev, page: 1 }))
  }

  const handleDelete = async (variant) => {
    if (!window.confirm(`¿Eliminar la variante "${variant.name}"?`)) return
    try {
      await apiDelete(`/api/admin/variants/${variant.id}`)
      setNote(`Variante eliminada: ${variant.name}`)
      if (data && data.items.length === 1 && data.page > 1) {
        setParams((prev) => ({ ...prev, page: prev.page - 1 }))
      } else {
        setParams((prev) => ({ ...prev }))
      }
    } catch (err) {
      setNote(err.message)
    }
  }

  if (!data && !error) return <ScreenLoading label="Cargando variantes…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Estantería</span>
          <h1>Variantes</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>en total</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá por producto, variante o SKU…"
            aria-label="Buscar variantes"
          />
        </form>
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
            Agregar variante
          </button>
        )}
      </div>

      {note && <p className="sale-note">{note}</p>}

      {formOpen && (
        <VariantForm
          item={editing}
          products={productOptions}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Variante</th>
              <th>SKU</th>
              <th>Precio</th>
              <th>Stock</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((v) => (
              <tr key={v.id}>
                <td>
                  <span className="t-cell-product">
                    <span>
                      <strong>{v.productName}</strong>
                      <em>{v.productBrand}</em>
                    </span>
                  </span>
                </td>
                <td>
                  <strong>{v.name}</strong>
                </td>
                <td className="mono t-cat">{v.sku || '—'}</td>
                <td className="mono t-num">{v.price ? formatARS(v.price) : 'Base'}</td>
                <td className="mono t-num">{v.stock}</td>
                {canManage && (
                  <td>
                    <span className="row-actions">
                      <button
                        type="button"
                        className="row-btn"
                        aria-label={`Editar ${v.name}`}
                        onClick={() => openForm(v)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="row-btn row-btn-danger"
                        aria-label={`Eliminar ${v.name}`}
                        onClick={() => handleDelete(v)}
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
          <EmptyNote text="Aún no hay variantes." />
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
            Página {data.page} de {data.totalPages} · {data.total} variantes
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

function VariantForm({ item, products, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({
    product: item?.product ?? products[0]?.id ?? '',
    name: item?.name || '',
    sku: item?.sku || '',
    price: item && item.price > 0 ? item.price : '',
    stock: item?.stock ?? '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const saved = item
        ? await apiPut(`/api/admin/variants/${item.id}`, form)
        : await apiPost('/api/admin/variants', form)
      onSaved(saved)
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
        aria-label={item ? 'Editar variante' : 'Agregar variante'}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="product-head">
          <div>
            <span className="dash-eyebrow">Estantería</span>
            <h2>{item ? 'Editar variante' : 'Agregar variante'}</h2>
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
              <select value={form.product} onChange={set('product')} required>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.brand}
                  </option>
                ))}
              </select>
            </label>

            <label className="pf-field">
              <span>Nombre de la variante</span>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                placeholder="Ej. Negro 128GB"
                required
              />
            </label>

            <label className="pf-field">
              <span>SKU</span>
              <input
                type="text"
                value={form.sku}
                onChange={set('sku')}
                placeholder="Opcional"
              />
            </label>

            <label className="pf-field">
              <span>Precio ($) — vacío usa el precio base</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.price}
                onChange={set('price')}
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

function PricesScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [params, setParams] = useState({ q: '', page: 1 })
  const [cats, setCats] = useState([])
  const [note, setNote] = useState('')
  const [edits, setEdits] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [bulk, setBulk] = useState({ mode: 'percent', value: '', category: 'todas' })
  const [bulkSaving, setBulkSaving] = useState(false)

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/categories')
      .then((res) => {
        if (alive) setCats(res.items || [])
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
      limit: '20',
    })
    apiGet(`/api/admin/prices?${qs}`)
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

  const valueOf = (p, key) => {
    const edit = edits[p.id]
    if (!edit) return p[key] ?? ''
    return edit[key] ?? ''
  }

  const setEdit = (p, key, value) =>
    setEdits((prev) => ({
      ...prev,
      [p.id]: { ...(prev[p.id] || {}), [key]: value },
    }))

  const hasEdit = (p) => Boolean(edits[p.id])

  const saveOne = async (p) => {
    const edit = edits[p.id]
    setSavingId(p.id)
    setNote('')
    try {
      await apiPost('/api/admin/prices', {
        productId: p.id,
        price: edit.price !== undefined ? edit.price : p.price,
        oldPrice: edit.oldPrice !== undefined ? edit.oldPrice : p.oldPrice ?? '',
      })
      setNote(`${p.name}: precio guardado`)
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

  const applyBulk = async (e) => {
    e.preventDefault()
    setBulkSaving(true)
    setNote('')
    try {
      const mode = bulk.mode
      const value = Number(bulk.value)
      await apiPost('/api/admin/prices/bulk', { mode, value, category: bulk.category })
      const bucket = bulk.category === 'todas' ? 'todas las categorías' : bulk.category
      setNote(`Ajuste aplicado a ${bucket}`)
      setBulk({ ...bulk, value: '' })
      setParams((prev) => ({ ...prev }))
    } catch (err) {
      setNote(err.message)
    } finally {
      setBulkSaving(false)
    }
  }

  if (!data && !error) return <ScreenLoading label="Leyendo precios…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Estantería</span>
          <h1>Precios</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>productos</em>
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
            aria-label="Buscar precios"
          />
        </form>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
      </div>

      <form className="bulk-bar" onSubmit={applyBulk}>
        <strong>Ajuste masivo</strong>
        <label className="bulk-field">
          <span>Categoría</span>
          <select
            value={bulk.category}
            onChange={(e) => setBulk((b) => ({ ...b, category: e.target.value }))}
          >
            <option value="todas">Todas</option>
            {cats.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
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
              bulk.mode === 'percent' ? 'Ej. 10 o -5' : bulk.mode === 'round' ? 'Ej. 100' : 'Ej. 50000'
            }
            required
          />
        </label>
        <button type="submit" className="primary-btn" disabled={bulkSaving}>
          {bulkSaving ? 'Aplicando…' : 'Aplicar ajuste'}
        </button>
      </form>

      {note && <p className="sale-note">{note}</p>}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Categoría</th>
              <th>Precio ($)</th>
              <th>Antes ($)</th>
              <th>Stock</th>
              {canManage && <th>Guardar</th>}
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
                <td>
                  <input
                    className="price-input mono"
                    type="number"
                    min="1"
                    step="1"
                    value={valueOf(p, 'price')}
                    onChange={(e) => setEdit(p, 'price', e.target.value)}
                    disabled={!canManage}
                    aria-label={`Precio de ${p.name}`}
                  />
                </td>
                <td>
                  <input
                    className="price-input mono"
                    type="number"
                    min="1"
                    step="1"
                    value={valueOf(p, 'oldPrice')}
                    onChange={(e) => setEdit(p, 'oldPrice', e.target.value)}
                    disabled={!canManage}
                    aria-label={`Precio anterior de ${p.name}`}
                  />
                </td>
                <td className="mono t-num">{p.stock}</td>
                {canManage && (
                  <td>
                    <button
                      type="button"
                      className="row-btn"
                      disabled={!hasEdit(p) || savingId === p.id}
                      onClick={() => saveOne(p)}
                      aria-label={`Guardar precio de ${p.name}`}
                    >
                      <IconCheck />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && (
          <EmptyNote text="No encontramos productos con esa búsqueda." />
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

function OffersScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [params, setParams] = useState({ q: '', page: 1 })
  const [note, setNote] = useState('')
  const [savingId, setSavingId] = useState(null)
  const [edits, setEdits] = useState({})
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({
      q: params.q,
      page: String(params.page),
      limit: '10',
    })
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