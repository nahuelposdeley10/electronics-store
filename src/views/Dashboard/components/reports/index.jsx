import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatARS } from '@/data/format'
import { apiGet } from '@/lib/api'
import { CHART_COLORS, CHART_GRID, CHART_TICK, chartDayShort, compactARS, reportPaymentLabel, shortDate, shortId } from '../../consts.js'
import { ChartLegend, ChartTip, EmptyNote, KpiTicket, ReportPeriodBar, ScreenBlocked, ScreenLoading, StatusTag, StockBadge } from '../common'

import './styles.css'

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


export { OverviewScreen, SalesReportScreen, ProductsReportScreen, ProfitReportScreen, StockReportScreen, CustomersReportScreen }