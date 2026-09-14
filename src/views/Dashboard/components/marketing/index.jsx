import { useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api'
import { IconCheck, IconClock, IconEdit, IconPlus, IconTrash } from '@/components/Icons'
import { shortDate } from '../../consts.js'
import { EmptyNote, ScreenBlocked, ScreenLoading } from '../common'

import './styles.css'

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
      setNote(editing ? 'CupÃ³n actualizado.' : `CupÃ³n ${form.code.toUpperCase()} creado.`)
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
      setNote(c.active ? 'CupÃ³n desactivado.' : 'CupÃ³n activado.')
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`Â¿Eliminar el cupÃ³n ${c.code}?`)) return
    setNote('')
    try {
      await apiDelete(`/api/admin/coupons/${c.id}`)
      setNote('CupÃ³n eliminado.')
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    }
  }

  if (!data && !error) return <ScreenLoading label="Cargando cuponesâ€¦" />
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
          El cliente ingresa el cÃ³digo en el checkout y recibe el descuento sobre el total.
        </p>
        {canManage && (
          <button type="button" className="primary-btn dash-add" onClick={openNew}>
            <IconPlus />
            Nuevo cupÃ³n
          </button>
        )}
      </div>

      {note && <p className="sale-note">{note}</p>}

      {formOpen && (
        <section className="dash-card promo-form">
          <div className="dash-card-head">
            <h2>{editing ? `Editar ${form.code}` : 'Nuevo cupÃ³n'}</h2>
            <button type="button" className="ghost-btn" onClick={() => setFormOpen(false)}>
              Cancelar
            </button>
          </div>
          <form onSubmit={submit}>
            <div className="pf-grid">
              <label className="pf-field">
                <span>CÃ³digo</span>
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
                <span>DescripciÃ³n (opcional)</span>
                <input
                  type="text"
                  value={form.description}
                  onChange={set('description')}
                  placeholder="Ej.: Bienvenida para clientes nuevos"
                />
              </label>

              <label className="pf-field pf-full promo-check">
                <input type="checkbox" checked={form.active} onChange={set('active')} />
                <span>CupÃ³n activo</span>
              </label>
            </div>

            <div className="pf-actions">
              <button type="submit" className="primary-btn" disabled={saving}>
                {saving ? 'Guardandoâ€¦' : editing ? 'Guardar cambios' : 'Crear cupÃ³n'}
              </button>
            </div>
          </form>
        </section>
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>CÃ³digo</th>
              <th>Descuento</th>
              <th>DescripciÃ³n</th>
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
                <td className="t-desc">{c.description || 'â€”'}</td>
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
          <EmptyNote text="TodavÃ­a no hay cupones." />
        )}
      </div>
    </div>
  )
}


export { CouponsScreen }