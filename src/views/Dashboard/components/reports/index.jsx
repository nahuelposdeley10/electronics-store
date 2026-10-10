import { useEffect, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Label, LabelList, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatARS } from '@/data/format'
import { apiGet } from '@/lib/api'
import { IconReport } from '@/components/Icons'
import { CHART_COLORS, CHART_GRID, CHART_TICK, chartDayShort, compactARS, reportPaymentLabel, shortDate, shortId, stockStatusOf } from '../../consts.js'
import { BusinessCell, ChartLegend, ChartTip, EmptyNote, KpiTicket, ReportPeriodBar, ScreenBlocked, ScreenLoading, StatusTag, StockBadge, StockValue } from '../common'

import './styles.css'

function OverviewScreen({ data, onView, businesses = [], canViewReports = false }) {
  const [trendDays, setTrendDays] = useState(7)
  const [trend, setTrend] = useState(null)
  const [trendError, setTrendError] = useState(false)
  useEffect(() => {
    let active = true
    apiGet(`/api/admin/reports/sales?days=${trendDays * 2}`)
      .then((result) => { if (active) { setTrend(result.series || []); setTrendError(false) } })
      .catch(() => { if (active) setTrendError(true) })
    return () => { active = false }
  }, [trendDays])
  const trendCurrent = trend?.slice(-trendDays) || []
  const trendPrevious = trend?.slice(-trendDays * 2, -trendDays) || []
  const currentTotal = trendCurrent.reduce((sum, day) => sum + (Number(day.total) || 0), 0)
  const previousTotal = trendPrevious.reduce((sum, day) => sum + (Number(day.total) || 0), 0)
  const trendChange = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : null
  const trendChart = trendCurrent.map((day, index) => ({
    label: chartDayShort(day.date),
    currentDate: day.date,
    previousDate: trendPrevious[index]?.date,
    current: Number(day.total) || 0,
    previous: Number(trendPrevious[index]?.total) || 0,
  }))
  const showBusiness = businesses.length > 0
  const kpis = [
    { label: 'Ingresos', value: formatARS(data.revenue), note: 'total acumulado' },
    { label: 'Ventas aprobadas', value: data.counts.salesCount, note: 'pagadas' },
    { label: 'Pendientes', value: data.counts.pendingCount, note: 'requieren seguimiento' },
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

      <div className="kpi-rack overview-kpis">
        {kpis.map((kpi) => (
          <KpiTicket key={kpi.label} {...kpi} />
        ))}
      </div>

      <section className="dash-card overview-trend">
        <div className="dash-card-head overview-trend-head">
          <div><h2>Evolución de ventas</h2><p>Ingresos aprobados · comparación con el período anterior</p></div>
          <div className="overview-trend-actions" role="group" aria-label="Período de ventas">
            <button type="button" className={trendDays === 7 ? 'is-active' : ''} aria-pressed={trendDays === 7} onClick={() => setTrendDays(7)}>7 días</button>
            <button type="button" className={trendDays === 30 ? 'is-active' : ''} aria-pressed={trendDays === 30} onClick={() => setTrendDays(30)}>30 días</button>
          </div>
          {canViewReports && <button type="button" className="overview-report-link" onClick={() => onView('report-sales', { days: trendDays })}><IconReport /> Ver reporte detallado →</button>}
        </div>
        {trendError ? (
          <div className="overview-trend-message">No se pudo cargar la evolución de ventas.</div>
        ) : !trend ? (
          <div className="overview-trend-message" role="status">Cargando evolución de ventas…</div>
        ) : (
          <>
            <div className="overview-trend-summary">
              <div><span>Período actual</span><strong>{formatARS(currentTotal)}</strong></div>
              <div><span>Período anterior</span><strong>{formatARS(previousTotal)}</strong></div>
              <div><span>Variación</span><strong className={trendChange === null ? '' : trendChange >= 0 ? 'is-positive' : 'is-negative'}>{trendChange === null ? (currentTotal > 0 ? 'Sin base comparable' : 'Sin variación') : `${trendChange > 0 ? '+' : ''}${trendChange.toFixed(1)}%`}</strong></div>
            </div>
            {trendCurrent.every((day) => !Number(day.total)) && trendPrevious.every((day) => !Number(day.total)) ? (
              <div className="overview-trend-message">Todavía no hay ventas aprobadas en estos períodos.</div>
            ) : (
              <div className="overview-trend-chart">
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={trendChart} margin={{ top: 12, right: 10, bottom: 0, left: 0 }}>
                    <defs><linearGradient id="overviewSalesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#438be8" stopOpacity={0.24}/><stop offset="100%" stopColor="#438be8" stopOpacity={0.01}/></linearGradient></defs>
                    <CartesianGrid vertical={false} stroke="var(--gal-line)" strokeDasharray="3 5"/>
                    <XAxis dataKey="label" tick={{ fill: 'var(--gal-ink-soft)', fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={20}/>
                    <YAxis tickFormatter={compactARS} tick={{ fill: 'var(--gal-ink-soft)', fontSize: 11 }} tickLine={false} axisLine={false} width={62}/>
                    <Tooltip content={({ active, payload }) => {
                      if (!active || !payload?.length) return null
                      const row = payload[0]?.payload
                      return <div className="overview-trend-tooltip"><strong>{row?.currentDate || ''}</strong><span>Actual: {formatARS(row?.current || 0)}</span><span>Anterior ({row?.previousDate || '—'}): {formatARS(row?.previous || 0)}</span></div>
                    }}/>
                    <Area type="monotone" name="Período anterior" dataKey="previous" stroke="#92a6bd" strokeWidth={2} strokeDasharray="5 5" fill="none" dot={false}/>
                    <Area type="monotone" name="Período actual" dataKey="current" stroke="#438be8" strokeWidth={2.8} fill="url(#overviewSalesFill)" dot={false} activeDot={{ r: 5 }}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="overview-trend-legend"><span><i className="is-current"/> Período actual</span><span><i className="is-previous"/> Período anterior (alineado por día)</span></div>
          </>
        )}
      </section>
      <div className="overview-section-label"><div><strong>Actividad comercial</strong><span>Productos destacados y operaciones recientes</span></div></div>
      <div className="dash-cols">
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Productos más vendidos</h2>
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
                    <span className="overview-product-track" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, (Number(product.units) / Math.max(1, ...data.bestSellers.map((item) => Number(item.units) || 0))) * 100))}%` }} /></span>
                  </span>
                  {showBusiness && <BusinessCell adminId={product.adminId} businesses={businesses} />}
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
                  {showBusiness && <BusinessCell adminId={order.adminId} businesses={businesses} />}
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


function SalesReportScreen({ initialDays = 30 }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [days, setDays] = useState(initialDays)

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

      <div className="kpi-rack overview-kpis">
        <KpiTicket label="Facturado" value={formatARS(data.totals.total)} note="en el período" />
        <KpiTicket label="Ventas" value={data.totals.count} note={`${data.totals.units} unidades`} />
        <KpiTicket label="Ticket promedio" value={formatARS(data.totals.avgTicket)} note="por venta" />
        <KpiTicket label="Devoluciones" value={data.refunded.count} note={formatARS(data.refunded.total)} />
      </div>

      <div className="rep-grid">
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Facturado por día</h2>
            <span className="rep-inline-legend">
              <span><i className="rep-legend-line rep-legend-line-red" /> facturado</span>
              <span><i className="rep-legend-line rep-legend-line-dark" /> ventas</span>
            </span>
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
                  <Area yAxisId="0" type="monotone" dataKey="total" name="Facturado" stroke="#d7261d" strokeWidth={2.5} fill="url(#areaSales)" dot={{ r: 2.5, fill: '#fbfcfa', stroke: '#d7261d', strokeWidth: 1.5 }} activeDot={{ r: 5, stroke: '#fbfcfa', strokeWidth: 2 }} />
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
                      <Label value={formatARS(payTotal)} position="center" className="rep-pie-total" />
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
                <span key={s.key} className={`payment-tag pm-${s.key}`}>{s.key} · {s.count}</span>
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


function ProductsReportScreen({ businesses = [] }) {
  const showBusiness = businesses.length > 0
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

      <div className="kpi-rack overview-kpis">
        <KpiTicket label="Unidades" value={data.totals.units} note="vendidas" />
        <KpiTicket label="Productos" value={data.totals.uniqueProducts} note="con movimiento" />
        <KpiTicket label="Facturado" value={formatARS(data.totals.revenue)} note="en el período" />
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              {showBusiness && <th>Negocio</th>}
              <th>Producto</th>
              <th>Unidades</th>
              <th>Precio medio</th>
              <th>Facturado</th>
              <th>Stock hoy</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={`${p.adminId || 'global'}:${p.productId}`} className={`stock-row-${stockStatusOf(p.stock, p.minStock)}`}>
                {showBusiness && <td><BusinessCell adminId={p.adminId} businesses={businesses} /></td>}
                <td>
                  <span className="t-cell-name">
                    <strong title={p.name}>{p.name}</strong>
                    <em>{p.brand || `#${p.productId}`}</em>
                  </span>
                </td>
                <td className="mono t-num">{p.units}</td>
                <td className="mono t-num">{formatARS(p.avgPrice)}</td>
                <td className="mono t-num t-money">{formatARS(p.revenue)}</td>
                <td>
                  <span className="stock-cell">
                    <StockValue stock={p.stock} min={p.minStock} />
                    <StockBadge status={stockStatusOf(p.stock, p.minStock)} />
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
                  <Bar dataKey="units" name="Unidades" fill="#d7261d" radius={[0, 4, 4, 0]} barSize={16}>
                    <LabelList dataKey="units" position="right" formatter={(value) => `${value} uds`} className="rep-bar-label" />
                  </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}


function ProfitReportScreen({ businesses = [] }) {
  const showBusiness = businesses.length > 0
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

      <div className="kpi-rack overview-kpis">
        <KpiTicket label="Facturado" value={formatARS(data.totals.revenue)} note="ventas" />
        <KpiTicket label="Costo" value={formatARS(data.totals.cogs)} note={`${data.totals.units} uds`} />
        <KpiTicket label="Ganancia bruta" value={formatARS(data.totals.profit)} note={`${data.totals.marginPct.toFixed(1)}%`} />
        <KpiTicket label="Compras a proveedores" value={formatARS(data.totals.spentOnPurchases)} note={`${data.totals.purchaseCount} compras`} />
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              {showBusiness && <th>Negocio</th>}
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
              <tr key={`${p.adminId || 'global'}:${p.productId}`}>
                {showBusiness && <td><BusinessCell adminId={p.adminId} businesses={businesses} /></td>}
                <td>
                  <span className="t-cell-name">
                    <strong title={p.name}>{p.name}</strong>
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
                <Bar dataKey="Facturado" name="Facturado" fill="#d7261d" radius={[4, 4, 0, 0]} barSize={14} />
                <Bar dataKey="Costo" name="Costo" fill="#c79a63" radius={[4, 4, 0, 0]} barSize={14} />
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
                <Bar dataKey="profit" name="Ganancia" fill="#d7261d" radius={[0, 4, 4, 0]} barSize={16}>
                  <LabelList dataKey="profit" position="right" formatter={compactARS} className="rep-bar-label" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  )
}


function StockReportScreen({ businesses = [] }) {
  const showBusiness = businesses.length > 0
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

      <div className="kpi-rack overview-kpis">
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
                      <Label value={data.totals.products} position="center" className="rep-pie-total" />
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
                  <Bar dataKey="value" name="Valor" fill="#8fb6dc" radius={[0, 4, 4, 0]} barSize={12}>
                    <LabelList dataKey="value" position="right" formatter={compactARS} className="rep-bar-label" />
                  </Bar>
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
                  {showBusiness && <th>Negocio</th>}
                  <th>Producto</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.low.map((p) => (
                  <tr key={`${p.adminId || 'global'}:${p.id}`} className={`stock-row-${stockStatusOf(p.stock, p.minStock)}`}>
                    {showBusiness && <td><BusinessCell adminId={p.adminId} businesses={businesses} /></td>}
                    <td>
                      <span className="t-cell-name">
                      <strong title={p.name}>{p.name}</strong>
                        <em>{p.brand}</em>
                      </span>
                    </td>
                    <td className="mono t-num"><StockValue stock={p.stock} min={p.minStock} /></td>
                    <td className="mono t-num">{p.minStock}</td>
                    <td><StockBadge status={stockStatusOf(p.stock, p.minStock)} /></td>
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


function CustomersReportScreen({ businesses = [] }) {
  const showBusiness = businesses.length > 0
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

      <div className="kpi-rack overview-kpis">
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
                  <Bar dataKey="total" name="Gasto" fill="#d7261d" radius={[0, 4, 4, 0]} barSize={16}>
                    <LabelList dataKey="total" position="right" formatter={compactARS} className="rep-bar-label" />
                  </Bar>
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
                      <Label value={formatARS(recentTotal)} position="center" className="rep-pie-total" />
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
              {showBusiness && <th>Negocio</th>}
              <th>Cliente</th>
              <th>Compras</th>
              <th>Total</th>
              <th>Ticket promedio</th>
              <th>Última</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((c, idx) => (
              <tr key={`${c.adminId || 'global'}:${c.key || idx}`}>
                {showBusiness && <td><BusinessCell adminId={c.adminId} businesses={businesses} /></td>}
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
