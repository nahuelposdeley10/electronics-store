import { useEffect, useState } from 'react'
import { formatARS } from '@/data/format'
import { apiConfirmOrder, apiDelete, apiGet, apiPost, apiPut } from '@/lib/api'
import { useOrderEvents } from '@/lib/useOrderEvents'
import { IconCross, IconPlus, IconRefresh, IconSearch, IconTrash } from '@/components/Icons'
import { PENDING_GROUP, PAYMENT_LABELS, PAYMENT_OPTIONS, QUOTE_STATUS_LABELS, fullDate, idDoc, itemsSummary, salePaymentLabel, shortDate, shortId } from '../../consts.js'
import { EmptyNote, ScreenBlocked, ScreenLoading, SortSelect, StatusTag } from '../common'
import { useToast } from '@/context/useToast'
import { useConfirm } from '@/context/useConfirm'

import './styles.css'

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
            {order.cashReceived != null && (
              <>
                <div>
                  <span className="detail-k">Recibido</span>
                  <strong className="mono">{formatARS(order.cashReceived)}</strong>
                </div>
                <div>
                  <span className="detail-k">Vuelto</span>
                  <strong className="mono">{formatARS(order.change)}</strong>
                </div>
              </>
            )}
            <div>
              <span className="detail-k">Vendedor</span>
              <strong>{order.soldBy || 'No registrado'}</strong>
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
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [params, setParams] = useState({ group: 'all', payment: 'all', from: '', to: '', q: '', page: 1 })
  const [query, setQuery] = useState('')
  const [rechecking, setRechecking] = useState({})
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
        showToast(
          changed
            ? `Pedido #${shortId(order.id)} verificado: ${order.status} → ${updated.status}`
            : `Pedido #${shortId(order.id)} verificado: sigue ${updated.status}`,
          'success',
        )
      })
      .catch((err) => showToast(err.message, 'error'))
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


function ReturnsScreen({ canManage }) {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [params, setParams] = useState({ filter: 'all', page: 1 })
  const [processing, setProcessing] = useState({})
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

  const doReturn = async (order) => {
    const ok = await confirm({
      title: 'Registrar devolución',
      message: (
        <>
          ¿Registrar la devolución de <strong>#{shortId(order.id)}</strong>? Saldrán{' '}
          <strong>{formatARS(order.total)}</strong> del stock de caja.
        </>
      ),
      confirmLabel: 'Registrar devolución',
    })
    if (!ok) return
    setProcessing((m) => ({ ...m, [order.id]: true }))
    apiPost(`/api/admin/orders/${order.id}/return`, {})
      .then((res) => {
        setData((prev) => (prev ? { ...prev, items: prev.items.map((o) => (o.id === order.id ? { ...o, status: res.status, returnedAt: res.returnedAt } : o)) } : prev))
        showToast(`Devolución de "#${shortId(order.id)}" registrada.`, 'success')
        setVersion((v) => v + 1)
      })
      .catch((err) => showToast(err.message, 'error'))
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
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [params, setParams] = useState({ status: 'all', q: '', sort: '', page: 1 })
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '10' })
    if (params.status !== 'all') qs.set('status', params.status)
    if (params.q) qs.set('q', params.q)
    if (params.sort) qs.set('sort', params.sort)
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

  const onSort = (value) =>
    setParams((prev) => ({ ...prev, sort: value, page: 1 }))

  const updateStatus = (quote, status) => {
    apiPut(`/api/admin/quotes/${quote._id}`, { status })
      .then((updated) => {
        setData((d) => ({ ...d, items: d.items.map((q) => (q._id === updated._id ? updated : q)) }))
        showToast(`Presupuesto #${quote.number} ${status === 'confirmed' ? 'confirmado' : 'cancelado'}.`, 'success')
      })
      .catch((err) => showToast(err.message, 'error'))
  }

  const cancelQuote = async (quote) => {
    const ok = await confirm({
      title: 'Cancelar presupuesto',
      message: (
        <>
          ¿Marcar el presupuesto <strong>#{quote.number}</strong> como cancelado?
        </>
      ),
      confirmLabel: 'Cancelar',
    })
    if (ok) updateStatus(quote, 'cancelled')
  }

  const deleteQuote = async (quote) => {
    const ok = await confirm({
      title: 'Eliminar presupuesto',
      message: (
        <>
          ¿Eliminar el presupuesto <strong>#{quote.number}</strong>?
        </>
      ),
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    try {
      await apiDelete(`/api/admin/quotes/${quote._id}`)
      setData((db) => ({ ...db, items: db.items.filter((q) => q._id !== quote._id), total: db.total - 1 }))
      showToast(`Presupuesto #${quote.number} eliminado.`, 'success')
    } catch (err) {
      showToast(err.message, 'error')
    }
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
        <SortSelect id="quotes-sort" value={params.sort} onChange={onSort} label="Cliente" />
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
                          <button type="button" className="row-btn" onClick={() => cancelQuote(quote)}>
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
  const { confirm } = useConfirm()
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
      .catch((err) => {
        if (alive) setError(err.message)
      })
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

  const removeLine = async (product) => {
    const ok = await confirm({
      title: 'Quitar del presupuesto',
      message: (
        <>
          ¿Quitar <strong>{product.name}</strong> del presupuesto?
        </>
      ),
      confirmLabel: 'Quitar',
    })
    if (ok) setLines((prev) => prev.filter((l) => l.product.id !== product.id))
  }

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
                <button type="button" className="row-btn row-btn-danger" onClick={() => removeLine(l.product)} aria-label="Quitar línea">
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


export { SaleDetail, SalesScreen, ReturnsScreen, QuotesScreen, QuoteForm }