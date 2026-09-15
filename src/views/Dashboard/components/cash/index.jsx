import { useEffect, useState } from 'react'
import { formatARS } from '@/data/format'
import { apiGet, apiPost } from '@/lib/api'
import { IconPlus } from '@/components/Icons'
import { CASH_KIND_CHIPS, CASH_KIND_LABELS, fullDate, shortDate } from '../../consts.js'
import { EmptyNote, KpiTicket, ScreenBlocked, ScreenLoading } from '../common'

import './styles.css'

function CashCurrentScreen({ canManage, onView }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

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

  const { open, shift, lastShift, today } = data

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Fondo de caja</span>
          <h1>Caja actual</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{open ? formatARS(shift.expected) : 'cerrada'}</strong>
          <em>{open ? 'efectivo esperado' : 'sin turno abierto'}</em>
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
                Cerrar caja
              </button>
              {canManage && (
                <button type="button" className="btn" onClick={() => onView('cash-movements')}>
                  Nuevo movimiento
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="cash-hero-txt">
              <span className="dash-eyebrow">Caja cerrada</span>
              <strong className="cash-hero-amount">{lastShift ? `Turno #${lastShift.number} · ${formatARS(lastShift.closedBalance ?? 0)}` : 'Todavía no abriste caja'}</strong>
              <em>
                {lastShift
                  ? `cerrado ${shortDate(lastShift.closedAt)} · esperado ${formatARS(lastShift.expectedClose ?? 0)}`
                  : 'Abrí un turno para registrar el efectivo del cajón'}
              </em>
            </div>
            <div className="cash-hero-actions">
              <button type="button" className="btn cta" onClick={() => onView('cash-openclose')}>
                Abrir caja
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}


function CashMovementsScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [params, setParams] = useState({ kind: 'all', page: 1 })
  const [note, setNote] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ flow: 'in', amount: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '20' })
    if (params.kind !== 'all') qs.set('kind', params.kind)
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
  }, [params])

  if (!data && !error) return <ScreenLoading label="Leyendo los movimientos…" />
  if (error) return <ScreenBlocked message={error} />

  const addMovement = (e) => {
    e.preventDefault()
    if (saving) return
    setSaving(true)
    setNote('')
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
      .catch((err) => setNote(err.message))
      .finally(() => setSaving(false))
  }

  const { shift } = data

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Libro de caja</span>
          <h1>Movimientos</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{shift ? `turno #${shift.number}` : '—'}</strong>
          <em>{shift ? 'movimientos del cajón' : 'sin caja abierta'}</em>
        </div>
      </header>

      <div className="dash-toolbar">
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
            onClick={() => setFormOpen((v) => !v)}
          >
            <IconPlus /> Nuevo movimiento
          </button>
        )}
      </div>

      {note && <p className="sale-note">{note}</p>}

      {formOpen && canManage && (
        <form className="cash-form dash-card" onSubmit={addMovement}>
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
            <button type="submit" className="btn cta" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar movimiento'}
            </button>
            <button type="button" className="btn" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="sale-chips" role="group" aria-label="Filtrar movimientos">
        {CASH_KIND_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`sale-chip mono${params.kind === chip.id ? ' active' : ''}`}
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


function CashShiftScreen({ canManage }) {
  const [status, setStatus] = useState(null)
  const [shifts, setShifts] = useState(null)
  const [error, setError] = useState('')
  const [openForm, setOpenForm] = useState({ openingBalance: '0', note: '' })
  const [closeForm, setCloseForm] = useState({ countedBalance: '', note: '' })
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    apiGet('/api/admin/cash/status')
      .then(setStatus)
      .catch((err) => setError(err.message))
    apiGet('/api/admin/cash/shifts?limit=20')
      .then(setShifts)
      .catch((err) => console.warn('No se pudieron cargar los turnos de caja', err))
  }

  useEffect(() => {
    load()
  }, [])

  if (!status || !shifts) {
    if (error) return <ScreenBlocked message={error} />
    return <ScreenLoading label="Escuchando la campana…" />
  }

  const openBox = (e) => {
    e.preventDefault()
    if (busy) return
    setNote('')
    setBusy(true)
    apiPost('/api/admin/cash/shifts', {
      openingBalance: Number(openForm.openingBalance) || 0,
      note: openForm.note.trim(),
    })
      .then(() => {
        setOpenForm({ openingBalance: '0', note: '' })
        setNote('Caja abierta. Buenas ventas.')
        load()
      })
      .catch((err) => setNote(err.message))
      .finally(() => setBusy(false))
  }

  const closeBox = (e) => {
    e.preventDefault()
    if (busy) return
    setNote('')
    setBusy(true)
    apiPost('/api/admin/cash/shifts/close', {
      countedBalance: Number(closeForm.countedBalance) || 0,
      note: closeForm.note.trim(),
    })
      .then((res) => {
        const diff = res.shift.difference ?? 0
        setNote(
          diff === 0
            ? 'Caja cerrada y cuadrada.'
            : `Caja cerrada. Diferencia de ${formatARS(diff)} ${diff > 0 ? 'a favor' : 'en contra'}.`,
        )
        load()
      })
      .catch((err) => setNote(err.message))
      .finally(() => setBusy(false))
  }

  const current = status.shift

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Ronda de caja</span>
          <h1>Apertura / cierre</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{status.open ? 'abierta' : 'cerrada'}</strong>
          <em>{status.open ? `turno #${current.number}` : 'esperando apertura'}</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}

      <div className="dash-cols">
        {!status.open ? (
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
                <button type="submit" className="btn cta" disabled={busy}>
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
              <h2>Cerrar caja</h2>
            </div>
            <div className="cash-strip">
              <span>
                <em>Apertura</em>
                <strong className="mono">{formatARS(current.openingBalance)}</strong>
              </span>
              <span>
                <em>Ingresos</em>
                <strong className="mono">{formatARS(current.income)}</strong>
              </span>
              <span>
                <em>Egresos</em>
                <strong className="mono">{formatARS(current.outcome)}</strong>
              </span>
              <span>
                <em>Esperado</em>
                <strong className="mono">{formatARS(current.expected)}</strong>
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
                    placeholder={String(current.expected)}
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
                <button type="submit" className="btn cta" disabled={busy}>
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

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Turno</th>
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
                  <td className="mono">#{s.number}</td>
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


function CashCountScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ countedAmount: '', note: '' })
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const load = () => {
    apiGet('/api/admin/cash/status')
      .then((status) =>
        Promise.all([Promise.resolve(status), apiGet('/api/admin/cash/counts')]),
      )
      .then(([status, counts]) => setData({ status, counts }))
      .catch((err) => setError(err.message))
  }

  useEffect(() => {
    load()
  }, [])

  if (!data) {
    if (error) return <ScreenBlocked message={error} />
    return <ScreenLoading label="Contando los pesos…" />
  }

  const doArqueo = (e) => {
    e.preventDefault()
    if (busy) return
    setNote('')
    setBusy(true)
    apiPost('/api/admin/cash/counts', {
      countedAmount: Number(form.countedAmount) || 0,
      note: form.note.trim(),
    })
      .then((res) => {
        const diff = res.count.difference ?? 0
        setNote(
          diff === 0
            ? `Arqueo cuadra: esperado ${formatARS(res.count.expectedAmount)}.`
            : `Arqueo registrado. Diferencia de ${formatARS(diff)} ${diff > 0 ? 'a favor' : 'en contra'}.`,
        )
        setForm({ countedAmount: '', note: '' })
        load()
      })
      .catch((err) => setNote(err.message))
      .finally(() => setBusy(false))
  }

  const { status, counts } = data
  const expected = status.open ? status.shift.expected : 0

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Fondo de caja</span>
          <h1>Arqueos</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{counts.items.length}</strong>
          <em>arqueos registrados</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}

      {!status.open ? (
        <div className="dash-card">
          <EmptyNote text="No hay caja abierta. Arqueá después de abrir el turno." />
        </div>
      ) : (
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
              <button type="submit" className="btn cta" disabled={busy}>
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
              <th>Fecha</th>
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
                  <td className="t-date" title={fullDate(c.createdAt)}>
                    {shortDate(c.createdAt)}
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
        {counts.items.length === 0 && <EmptyNote text="Todavía no hay arqueos en el turno actual." />}
      </div>
    </div>
  )
}


export { CashCurrentScreen, CashMovementsScreen, CashShiftScreen, CashCountScreen }