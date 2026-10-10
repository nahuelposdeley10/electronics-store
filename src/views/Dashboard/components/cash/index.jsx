import { useEffect, useState } from 'react'
import { formatARS } from '@/data/format'
import { apiGet, apiPost } from '@/lib/api'
import { IconCheck, IconCross, IconEdit, IconLock, IconPlus } from '@/components/Icons'
import { CASH_KIND_CHIPS, CASH_KIND_LABELS, fullDate, shortDate } from '../../consts.js'
import { BusinessCell, EmptyNote, KpiTicket, OperatorSelect, ScreenBlocked, ScreenLoading } from '../common'
import SearchSelect from '@/components/SearchSelect'
import { useToast } from '@/context/useToast'
import { useCashEvents } from '@/lib/useCashEvents.js'

import './styles.css'

function operatorLabel(shift) {
  return shift?.operator?.name || shift?.operator?.email || shift?.openedBy || 'Operador sin identificar'
}

function CashOpenShifts({ shifts, onSelect, businesses = [] }) {
  if (!shifts?.length) return null
  const showBusiness = businesses.length > 0
  return (
    <section className="dash-card">
      <div className="dash-card-head">
        <div>
          <span className="dash-eyebrow">Control del equipo</span>
          <h2>Cajas abiertas</h2>
        </div>
        <span className="mono">{shifts.length}</span>
      </div>
      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              {showBusiness && <th>Negocio</th>}
              <th>Operador</th>
              <th>Turno</th>
              <th>Ventas</th>
              <th>Esperado</th>
              {onSelect && <th />}
            </tr>
          </thead>
          <tbody>
            {shifts.map((shift) => (
              <tr key={shift._id}>
                {showBusiness && <td><BusinessCell adminId={shift.adminId} businesses={businesses} /></td>}
                <td>
                  <span className="t-cell-name">
                    <strong>{operatorLabel(shift)}</strong>
                    {shift.operator?.email && shift.operator.email !== shift.operator.name && <em>{shift.operator.email}</em>}
                  </span>
                </td>
                <td className="mono">#{shift.number}</td>
                <td className="mono t-num">{formatARS(shift.sales || 0)}</td>
                <td className="mono t-num">{formatARS(shift.expected || 0)}</td>
                {onSelect && (
                  <td>
                    <button type="button" className="filter-reset-btn" onClick={() => onSelect(String(shift._id))}>
                      <IconEdit /> Administrar
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function CashCurrentScreen({ canManage, isAdmin, onView, businesses = [] }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useCashEvents(() => {
    apiGet('/api/admin/cash/status')
      .then(setData)
      .catch((err) => setError(err.message))
  })

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/cash/status')
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

  if (!data && !error) return <ScreenLoading label="Abriendo la caja…" />
  if (error) return <ScreenBlocked message={error} />

  const { open, shift, openShifts = [], lastShift, today } = data

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Fondo de caja</span>
          <h1>Caja actual</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{open ? formatARS(shift.expected) : isAdmin && openShifts.length ? `${openShifts.length} cajas` : 'cerrada'}</strong>
          <em>{open ? 'efectivo esperado' : isAdmin && openShifts.length ? 'abiertas por el equipo' : 'sin turno propio abierto'}</em>
        </div>
      </header>

      <div className="kpi-rack">
        {open ? (
          <>
            <KpiTicket label="Apertura" value={formatARS(shift.openingBalance)} note={`turno #${shift.number} · ${shortDate(shift.openedAt)}`} />
            <KpiTicket label="Ventas en efectivo" value={formatARS(shift.sales)} note={`${shift.salesCount} ventas`} />
            <KpiTicket label="Ingresos" value={formatARS(shift.income)} note="incluye ventas" />
            <KpiTicket label="Egresos" value={formatARS(shift.outcome)} note="gastos y devoluciones" />
          </>
        ) : (
          <>
            <KpiTicket label="Ventas hoy" value={formatARS(today.revenue)} note={`${today.orders} aprobadas`} />
            <KpiTicket label="Efectivo hoy" value={formatARS(today.cash)} note="pagos en efectivo" />
            <KpiTicket label="Turno" value={lastShift ? `#${lastShift.number}` : '—'} note={lastShift ? shortDate(lastShift.openedAt) : 'nunca abrí caja'} />
          </>
        )}
      </div>

      <div className="cash-hero dash-card">
        {open ? (
          <>
            <div className="cash-hero-txt">
              <span className="dash-eyebrow">{canManage ? 'Abierta por ' + (shift.openedBy || '—') : 'Caja abierta'}</span>
              <strong className="cash-hero-amount mono">{formatARS(shift.expected)}</strong>
              <em>
                apertura {formatARS(shift.openingBalance)} · ingresos {formatARS(shift.income)} · egresos {formatARS(shift.outcome)}
              </em>
            </div>
            <div className="cash-hero-actions">
              <button type="button" className="btn cta" onClick={() => onView('cash-openclose')}>
                <IconLock /> Cerrar caja
              </button>
              {canManage && (
                <button type="button" className="btn" onClick={() => onView('cash-movements')}>
                  <IconPlus /> Registrar ingreso/egreso
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="cash-hero-txt">
              <span className="dash-eyebrow">Caja propia cerrada</span>
              <strong className="cash-hero-amount">{lastShift ? `Turno #${lastShift.number} · ${formatARS(lastShift.closedBalance ?? 0)}` : 'Todavía no abriste caja'}</strong>
              <em>
                {lastShift
                  ? `cerrado ${shortDate(lastShift.closedAt)} · esperado ${formatARS(lastShift.expectedClose ?? 0)}`
                  : 'Abrí un turno propio para registrar tus ventas en efectivo'}
              </em>
            </div>
            <div className="cash-hero-actions">
              <button type="button" className="btn cta" onClick={() => onView('cash-openclose')}>
                <IconPlus /> Abrir caja
              </button>
            </div>
          </>
        )}
      </div>
      {isAdmin && <CashOpenShifts shifts={openShifts} onSelect={() => onView('cash-openclose')} businesses={businesses} />}
    </div>
  )
}


function CashMovementsScreen({ canManage, businesses = [] }) {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [params, setParams] = useState({ kind: 'all', operator: '', page: 1 })
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ flow: 'in', amount: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [realtimeTick, setRealtimeTick] = useState(0)

  useCashEvents(() => setRealtimeTick((tick) => tick + 1))

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '10' })
    if (params.kind !== 'all') qs.set('kind', params.kind)
    if (params.operator) qs.set('operator', params.operator)
    apiGet(`/api/admin/cash/movements?${qs}`)
      .then((res) => {
        if (!alive) return
        if (res.items.length === 0 && res.page > 1) {
          setParams((prev) => ({ ...prev, page: prev.page - 1 }))
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
  }, [params, realtimeTick])

  if (!data && !error) return <ScreenLoading label="Leyendo los movimientos…" />
  if (error) return <ScreenBlocked message={error} />

  const showBusiness = businesses.length > 0

  const movementValid = form.amount !== '' && Number.isFinite(Number(form.amount)) && Number(form.amount) > 0

  const closeForm = () => {
    if (saving) return
    setFormOpen(false)
  }

  const addMovement = (e) => {
    e.preventDefault()
    if (saving || !movementValid) return
    setSaving(true)
    apiPost('/api/admin/cash/movements', {
      flow: form.flow,
      amount: Number(form.amount),
      description: form.description.trim(),
    })
      .then(() => {
        setForm({ flow: 'in', amount: '', description: '' })
        setFormOpen(false)
        setParams((prev) => ({ ...prev, page: 1 }))
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setSaving(false))
  }

  const { shift, shifts = [] } = data
  const movementShift = shift || shifts[0]

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Libro de caja</span>
          <h1>Movimientos</h1>
        </div>
        <div className="dash-head-today">
            <strong className="mono">{shifts.length > 1 ? `${shifts.length} cajas` : movementShift ? `turno #${movementShift.number}` : '—'}</strong>
            <em>{shifts.length > 1 ? 'movimientos del equipo' : movementShift ? 'movimientos del cajón' : 'sin caja abierta'}</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <OperatorSelect
          id="movements-operator"
          value={params.operator}
          onChange={(value) => setParams((prev) => ({ ...prev, operator: value, page: 1 }))}
        />
        <div className="cash-summary">
          <strong className="mono">{formatARS(data.balance.net)}</strong>
          <em>
            neto · +{formatARS(data.balance.income)} / −{formatARS(data.balance.outcome)}
          </em>
        </div>
        {canManage && shift && (
          <button
            type="button"
            className="btn"
            onClick={() => setFormOpen(true)}
          >
            <IconPlus /> <IconPlus /> Registrar ingreso/egreso
          </button>
        )}
      </div>

      {formOpen && canManage && (
        <div className="product-overlay" onMouseDown={saving ? undefined : closeForm}>
          <div
            className="product-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Registrar ingreso o egreso"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <header className="product-head">
              <div>
                <span className="dash-eyebrow">Libro de caja</span>
                <h2>Registrar ingreso o egreso</h2>
              </div>
              <button type="button" className="product-close" onClick={closeForm} aria-label="Cerrar">
                <IconCross />
              </button>
            </header>
            <form onSubmit={addMovement}>
              <div className="cash-form-cols">
                <label className="set-field">
                  <span>Tipo</span>
                  <select
                    value={form.flow}
                    onChange={(e) => setForm((f) => ({ ...f, flow: e.target.value }))}
                  >
                    <option value="in">Ingreso (entra plata)</option>
                    <option value="out">Egreso (sale plata)</option>
                  </select>
                </label>
                <label className="set-field">
                  <span>Monto ($)</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0"
                    required
                  />
                </label>
                <label className="set-field">
                  <span>Concepto</span>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Ej: pago colilla, gastos, vueltos…"
                  />
                </label>
              </div>
              <div className="cash-form-foot">
                <button type="submit" className="btn cta" disabled={saving || !movementValid}><IconCheck />
                  {saving ? 'Guardando…' : 'Guardar ingreso/egreso'}
                </button>
                <button type="button" className="btn" onClick={closeForm} disabled={saving}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="sale-chips" role="group" aria-label="Filtrar movimientos">
        {CASH_KIND_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`sale-chip mono${params.kind === chip.id ? ' active' : ''}`}
            aria-pressed={params.kind === chip.id}
            onClick={() => setParams((prev) => ({ ...prev, kind: chip.id, page: 1 }))}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              {showBusiness && <th>Negocio</th>}
              <th>Fecha</th>
              <th>Concepto</th>
              <th>Tipo</th>
              <th>Operación</th>
              <th>Monto</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m._id}>
                {showBusiness && <td><BusinessCell adminId={m.adminId} businesses={businesses} /></td>}
                <td className="t-date" title={fullDate(m.createdAt)}>
                  {shortDate(m.createdAt)}
                </td>
                <td>
                  <span className="t-cell-name">
                    <strong>{m.description || '—'}</strong>
                    {m.ref && <em>#{String(m.ref).slice(-6).toUpperCase()}</em>}
                  </span>
                </td>
                <td>
                  <span className={`cash-kind ${m.kind}`}>{CASH_KIND_LABELS[m.kind] || m.kind}</span>
                </td>
                <td className="t-dim">{m.by || '—'}</td>
                <td className="mono">
                  <span className={`mv-delta ${m.flow === 'in' ? 'up' : 'down'}`}>
                    {m.flow === 'in' ? `+${formatARS(m.amount)}` : `−${formatARS(m.amount)}`}
                  </span>
                </td>
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


function CashShiftScreen({ canManage, isAdmin, businesses = [] }) {
  const { showToast } = useToast()
  const [status, setStatus] = useState(null)
  const [shifts, setShifts] = useState(null)
  const [error, setError] = useState('')
  const [openForm, setOpenForm] = useState({ openingBalance: '0', note: '' })
  const [closeForm, setCloseForm] = useState({ countedBalance: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [selectedShiftId, setSelectedShiftId] = useState('')

  const load = () => {
    apiGet('/api/admin/cash/status')
      .then(setStatus)
      .catch((err) => setError(err.message))
    apiGet('/api/admin/cash/shifts?limit=20')
      .then(setShifts)
      .catch((err) => console.warn('No se pudieron cargar los turnos de caja', err))
  }

  useCashEvents(() => load())

  useEffect(() => {
    load()
  }, [])

  if (!status || !shifts) {
    if (error) return <ScreenBlocked message={error} />
    return <ScreenLoading label="Escuchando la campana…" />
  }

  const showBusiness = businesses.length > 0

  const openBox = (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    apiPost('/api/admin/cash/shifts', {
      openingBalance: Number(openForm.openingBalance) || 0,
      note: openForm.note.trim(),
    })
      .then(() => {
        setOpenForm({ openingBalance: '0', note: '' })
        showToast('Caja abierta. Buenas ventas.', 'success')
        load()
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setBusy(false))
  }

  const closeBox = (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    apiPost('/api/admin/cash/shifts/close', {
      countedBalance: Number(closeForm.countedBalance) || 0,
      note: closeForm.note.trim(),
      shiftId: target?._id || null,
    })
      .then((res) => {
        const diff = res.shift.difference ?? 0
        showToast(
          diff === 0
            ? 'Caja cerrada y cuadrada.'
            : `Caja cerrada. Diferencia de ${formatARS(diff)} ${diff > 0 ? 'a favor' : 'en contra'}.`,
          'success',
        )
        setSelectedShiftId('')
        setCloseForm({ countedBalance: '', note: '' })
        load()
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setBusy(false))
  }

  const openShifts = status.openShifts || []
  const current = status.shift
  const selected = selectedShiftId ? openShifts.find((shift) => String(shift._id) === selectedShiftId) : null
  const target = selected || current
  const viewingOther = Boolean(selected && (!current || String(selected._id) !== String(current._id)))

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Ronda de caja</span>
          <h1>Apertura / cierre</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{target ? 'abierta' : 'cerrada'}</strong>
          <em>{target ? `turno #${target.number}` : 'esperando apertura propia'}</em>
        </div>
      </header>

      <div className="dash-cols">
        {!target ? (
          <section className="dash-card">
            <div className="dash-card-head">
              <h2>Abrir caja</h2>
            </div>
            {canManage ? (
              <form className="cash-form" onSubmit={openBox}>
                <label className="set-field">
                  <span>Fondo inicial ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={openForm.openingBalance}
                    onChange={(e) => setOpenForm((f) => ({ ...f, openingBalance: e.target.value }))}
                    placeholder="0"
                  />
                </label>
                <label className="set-field">
                  <span>Nota de apertura</span>
                  <input
                    type="text"
                    value={openForm.note}
                    onChange={(e) => setOpenForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Ej: apertura de caja, lunes"
                  />
                </label>
                <button type="submit" className="btn cta" disabled={busy}><IconPlus />
                  {busy ? 'Abriendo…' : 'Abrir caja'}
                </button>
              </form>
            ) : (
              <p className="sale-note">Necesitás permiso de caja para abrir un turno.</p>
            )}
          </section>
        ) : (
          <section className="dash-card">
            <div className="dash-card-head">
                <h2>{viewingOther ? `Cerrar caja de ${operatorLabel(target)}` : 'Cerrar mi caja'}</h2>
            </div>
            <div className="cash-strip">
              <span>
                <em>Apertura</em>
                <strong className="mono">{formatARS(target.openingBalance)}</strong>
              </span>
              <span>
                <em>Ingresos</em>
                <strong className="mono">{formatARS(target.income)}</strong>
              </span>
              <span>
                <em>Egresos</em>
                <strong className="mono">{formatARS(target.outcome)}</strong>
              </span>
              <span>
                <em>Esperado</em>
                <strong className="mono">{formatARS(target.expected)}</strong>
              </span>
            </div>
            {canManage ? (
              <form className="cash-form" onSubmit={closeBox}>
                <label className="set-field">
                  <span>Efectivo contado ($)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={closeForm.countedBalance}
                    onChange={(e) => setCloseForm((f) => ({ ...f, countedBalance: e.target.value }))}
                    placeholder={String(target.expected)}
                    required
                  />
                </label>
                <label className="set-field">
                  <span>Nota de cierre</span>
                  <input
                    type="text"
                    value={closeForm.note}
                    onChange={(e) => setCloseForm((f) => ({ ...f, note: e.target.value }))}
                    placeholder="Ej: cierre de jornada"
                  />
                </label>
                <button type="submit" className="btn cta" disabled={busy}><IconLock />
                  {busy ? 'Cerrando…' : 'Cerrar caja'}
                </button>
              </form>
            ) : (
              <p className="sale-note">Necesitás permiso de caja para cerrar el turno.</p>
            )}
          </section>
        )}

        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Último turno</h2>
          </div>
          {status.lastShift ? (
            <div className="cash-strip">
              <span>
                <em>Turno</em>
                <strong className="mono">#{status.lastShift.number}</strong>
              </span>
              <span>
                <em>Esperado</em>
                <strong className="mono">{formatARS(status.lastShift.expectedClose ?? 0)}</strong>
              </span>
              <span>
                <em>Contado</em>
                <strong className="mono">{formatARS(status.lastShift.closedBalance ?? 0)}</strong>
              </span>
              <span>
                <em>Diferencia</em>
                <strong className={`mono ${(status.lastShift.difference ?? 0) === 0 ? '' : (status.lastShift.difference ?? 0) > 0 ? 'cash-diff-pos' : 'cash-diff-neg'}`}>
                  {formatARS(status.lastShift.difference ?? 0)}
                </strong>
              </span>
            </div>
          ) : (
            <EmptyNote text="Sin turnos cerrados todavía." />
          )}
        </section>
      </div>

      {isAdmin && openShifts.length > 0 && (
        <section className="dash-card">
          <div className="dash-card-head">
            <div>
              <span className="dash-eyebrow">Control del equipo</span>
              <h2>Cajas abiertas</h2>
            </div>
            <span className="mono">{openShifts.length}</span>
          </div>
          <div className="table-wrap">
            <table className="dash-table">
              <thead>
                <tr>
                  {showBusiness && <th>Negocio</th>}
                  <th>Operador</th>
                  <th>Turno</th>
                  <th>Esperado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {openShifts.map((shift) => (
                  <tr key={shift._id}>
                    {showBusiness && <td><BusinessCell adminId={shift.adminId} businesses={businesses} /></td>}
                    <td>
                      <span className="t-cell-name">
                        <strong>{operatorLabel(shift)}</strong>
                        {shift.operator?.email && shift.operator.email !== shift.operator.name && <em>{shift.operator.email}</em>}
                      </span>
                    </td>
                    <td className="mono">#{shift.number}</td>
                    <td className="mono t-num">{formatARS(shift.expected || 0)}</td>
                    <td>
                      <button type="button" className="filter-reset-btn" onClick={() => setSelectedShiftId(String(shift._id))}>
                        {selectedShiftId === String(shift._id) ? 'Seleccionada' : 'Ver / cerrar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              {showBusiness && <th>Negocio</th>}
              <th>Turno</th>
              <th>Operador</th>
              <th>Apertura</th>
              <th>Apertura $</th>
              <th>Ingresos</th>
              <th>Egresos</th>
              <th>Esperado</th>
              <th>Cierre $</th>
              <th>Diferencia</th>
              <th>Cierre</th>
            </tr>
          </thead>
          <tbody>
            {shifts.items.map((s) => {
              const diff = s.difference ?? 0
              return (
                <tr key={s._id}>
                  {showBusiness && <td><BusinessCell adminId={s.adminId} businesses={businesses} /></td>}
                  <td className="mono">#{s.number}</td>
                  <td>
                    <span className="t-cell-name">
                      <strong>{operatorLabel(s)}</strong>
                      {s.operator?.email && s.operator.email !== s.operator.name && <em>{s.operator.email}</em>}
                    </span>
                  </td>
                  <td className="t-date" title={fullDate(s.openedAt)}>
                    {shortDate(s.openedAt)}
                  </td>
                  <td className="mono t-num">{formatARS(s.openingBalance)}</td>
                  <td className="mono t-num">{formatARS(s.income)}</td>
                  <td className="mono t-num">{formatARS(s.outcome)}</td>
                  <td className="mono t-num">{formatARS(s.expected)}</td>
                  <td className="mono t-num">{s.closedBalance === null ? '—' : formatARS(s.closedBalance)}</td>
                  <td className="mono t-num">
                    <span className={`mv-delta ${diff >= 0 ? 'up' : 'down'}`}>
                      {s.closedBalance === null ? '—' : `${diff >= 0 ? '+' : '−'}${formatARS(Math.abs(diff))}`}
                    </span>
                  </td>
                  <td className="t-dim">
                    {s.closedAt ? `${shortDate(s.closedAt)} · ${s.closedBy || '—'}` : 'abierto'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {shifts.items.length === 0 && <EmptyNote text="Todavía no hay turnos registrados." />}
      </div>
    </div>
  )
}


function CashCountScreen({ canManage, isAdmin, businesses = [] }) {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ countedAmount: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [shifts, setShifts] = useState([])
  const [shiftId, setShiftId] = useState('')
  const [operator, setOperator] = useState('')

  const loadCounts = () => {
    const qs = new URLSearchParams()
    if (shiftId) qs.set('shiftId', shiftId)
    if (operator) qs.set('operator', operator)
    return apiGet(`/api/admin/cash/counts?${qs}`)
  }

  const applyCounts = (counts) => setData((d) => (d ? { ...d, counts } : d))

  useCashEvents(() => {
    Promise.all([
      apiGet('/api/admin/cash/status'),
      loadCounts(),
      apiGet('/api/admin/cash/shifts?limit=100'),
    ])
      .then(([status, counts, shiftsRes]) => {
        setData((current) => (current ? { status, counts } : current))
        setShifts(shiftsRes.items || [])
      })
      .catch((err) => setError(err.message))
  })

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/cash/status')
      .then((status) =>
        Promise.all([
          Promise.resolve(status),
          apiGet('/api/admin/cash/counts'),
          apiGet('/api/admin/cash/shifts?limit=100'),
        ]),
      )
      .then(([status, counts, shiftsRes]) => {
        if (!alive) return
        setData({ status, counts })
        setShifts(shiftsRes.items || [])
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams()
    if (shiftId) qs.set('shiftId', shiftId)
    if (operator) qs.set('operator', operator)
    apiGet(`/api/admin/cash/counts?${qs}`)
      .then((counts) => {
        if (alive) setData((d) => (d ? { ...d, counts } : d))
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [shiftId, operator])

  if (!data) {
    if (error) return <ScreenBlocked message={error} />
    return <ScreenLoading label="Contando los pesos…" />
  }

  const showBusiness = businesses.length > 0

  const doArqueo = (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    apiPost('/api/admin/cash/counts', {
      countedAmount: Number(form.countedAmount) || 0,
      note: form.note.trim(),
    })
      .then((res) => {
        const diff = res.count.difference ?? 0
        showToast(
          diff === 0
            ? `Arqueo cuadra: esperado ${formatARS(res.count.expectedAmount)}.`
            : `Arqueo registrado. Diferencia de ${formatARS(diff)} ${diff > 0 ? 'a favor' : 'en contra'}.`,
          'success',
        )
        setForm({ countedAmount: '', note: '' })
        return loadCounts().then(applyCounts)
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setBusy(false))
  }

  const { status, counts } = data
  const expected = status.open ? status.shift.expected : 0
  const viewingClosed = Boolean(shiftId)

  const shiftOptions = shifts
    .filter((s) => s.status === 'closed' || isAdmin || (status.open && String(s._id) !== String(status.shift._id)))
    .sort((a, b) => new Date(b.openedAt) - new Date(a.openedAt))
    .map((s) => ({
      value: String(s._id),
      label: `${operatorLabel(s)} · turno #${s.number} · ${shortDate(s.openedAt)}`,
    }))

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Fondo de caja</span>
          <h1>Arqueos</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{counts.items.length}</strong>
          <em>{viewingClosed ? 'arqueos del turno seleccionado' : 'arqueos del turno actual'}</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <OperatorSelect
          id="counts-operator"
          value={operator}
          onChange={setOperator}
        />
        <SearchSelect
          id="counts-shift"
          label="Turno"
          allLabel={status.open ? `Turno actual · #${status.shift.number}` : 'Sin turno abierto'}
          allValue=""
          value={shiftId}
          onChange={setShiftId}
          options={shiftOptions}
        />
      </div>

      {status.open && !viewingClosed && (
        <section className="dash-card">
          <div className="dash-card-head">
            <h2>Nuevo arqueo · turno #{counts.shift ? counts.shift.number : status.shift.number}</h2>
          </div>
          {canManage ? (
            <form className="cash-form" onSubmit={doArqueo}>
              <label className="set-field">
                <span>Efectivo esperado ($)</span>
                <input type="number" value={expected} disabled />
              </label>
              <label className="set-field">
                <span>Efectivo contado ($)</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.countedAmount}
                  onChange={(e) => setForm((f) => ({ ...f, countedAmount: e.target.value }))}
                  placeholder={String(expected)}
                  required
                />
              </label>
              <label className="set-field">
                <span>Nota</span>
                <input
                  type="text"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Ej: arqueo de mitad de día"
                />
              </label>
              <button type="submit" className="btn cta" disabled={busy}><IconCheck />
                {busy ? 'Registrando…' : 'Registrar arqueo'}
              </button>
            </form>
          ) : (
            <p className="sale-note">Necesitás permiso de caja para registrar arqueos.</p>
          )}
        </section>
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              {showBusiness && <th>Negocio</th>}
              <th>Fecha</th>
              <th>Turno</th>
              <th>Esperado</th>
              <th>Contado</th>
              <th>Diferencia</th>
              <th>Nota</th>
              <th>Por</th>
            </tr>
          </thead>
          <tbody>
            {counts.items.map((c) => {
              const diff = c.difference ?? 0
              return (
                <tr key={c._id}>
                  {showBusiness && <td><BusinessCell adminId={c.adminId} businesses={businesses} /></td>}
                  <td className="t-date" title={fullDate(c.createdAt)}>
                    {shortDate(c.createdAt)}
                  </td>
                  <td className="mono t-dim">
                    {counts.shift ? `#${counts.shift.number}` : '—'}
                  </td>
                  <td className="mono t-num">{formatARS(c.expectedAmount)}</td>
                  <td className="mono t-num">{formatARS(c.countedAmount)}</td>
                  <td className="mono t-num">
                    <span className={`mv-delta ${diff >= 0 ? 'up' : 'down'}`}>
                      {diff >= 0 ? '+' : '−'}
                      {formatARS(Math.abs(diff))}
                    </span>
                  </td>
                  <td className="t-dim">{c.note || '—'}</td>
                  <td className="t-dim">{c.by || '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {counts.items.length === 0 && (
          <EmptyNote text={viewingClosed ? 'No hay arqueos en el turno seleccionado.' : 'Todavía no hay arqueos en el turno actual.'} />
        )}
      </div>
    </div>
  )
}


export { CashCurrentScreen, CashMovementsScreen, CashShiftScreen, CashCountScreen }
