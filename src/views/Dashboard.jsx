import { useEffect, useMemo, useState } from 'react'
import { formatARS } from '../data/format'
import { apiConfirmOrder, apiDelete, apiGet, apiUpdate, apiUpload, clearSession, getSession, login as apiLogin } from '../lib/api'
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
    { id: 'products', label: 'Productos', icon: IconBox },
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
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`dash-nav-item${screen === id ? ' active' : ''}`}
              onClick={() => changeScreen(id)}
            >
              <Icon />
              {label}
            </button>
          ))}
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
                    {product.emoji} {product.name}
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
  const [products, setProducts] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [note, setNote] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/products')
      .then((data) => {
        if (alive) setProducts(data)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [refresh])

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
    setRefresh((n) => n + 1)
  }

  const handleDelete = async (product) => {
    if (!window.confirm(`¿Eliminar "${product.name}" ${product.brand} de la galería?`)) {
      return
    }
    try {
      await apiDelete(`/api/admin/products/${product.id}`)
      setNote(`Producto eliminado: ${product.name}`)
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    }
  }

  const filtered = useMemo(() => {
    if (!products) return []
    const q = query.trim().toLowerCase()
    if (!q) return products
    return products.filter((p) =>
      `${p.name} ${p.brand} ${p.category}`.toLowerCase().includes(q),
    )
  }, [products, query])

  if (!products && !error) return <ScreenLoading label="Cargando la estantería…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Estantería</span>
          <h1>Productos</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{products.length}</strong>
          <em>en la galería</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <label className="dash-search">
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá producto, marca o categoría…"
            aria-label="Buscar productos"
          />
        </label>
        <span className="count-tag mono">
          {filtered.length} de {products.length}
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
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="t-cell-product">
                    <span className="prod-emoji">{p.emoji}</span>
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
        {filtered.length === 0 && (
          <EmptyNote text="Ningún producto con ese nombre o marca." />
        )}
      </div>
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
    oldPrice: product?.oldPrice ?? '',
    stock: product?.stock ?? '',
    rating: product?.rating ?? '',
    freeShipping: product?.freeShipping ?? true,
    badge: product?.badge || '',
    emoji: product?.emoji || '',
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
              <span>Precio anterior ($)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.oldPrice}
                onChange={set('oldPrice')}
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
              <span>Emoji</span>
              <input
                type="text"
                value={form.emoji}
                onChange={set('emoji')}
                placeholder="Ej. ⌨️"
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