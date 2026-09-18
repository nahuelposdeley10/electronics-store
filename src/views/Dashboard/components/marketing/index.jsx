import { useEffect, useState } from 'react'
import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api'
import { IconCheck, IconClock, IconEdit, IconPlus, IconTrash } from '@/components/Icons'
import { shortDate } from '../../consts.js'
import { EmptyNote, ScreenBlocked, ScreenLoading } from '../common'
import { useToast } from '@/context/useToast'

import './styles.css'

function promoStateChip(active, onLabel, offLabel) {
  return (
    <span className={`promo-state${active ? ' on' : ''}`}>
      {active ? onLabel : offLabel}
    </span>
  )
}

function CouponsScreen({ canManage }) {
  const { showToast } = useToast()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [formInitial, setFormInitial] = useState(null)
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
    const base = { code: '', percent: 10, active: true, description: '' }
    setForm({ ...base })
    setFormInitial({ ...base })
    setFormOpen(true)
  }

  const openEdit = (c) => {
    setEditing(c.id)
    const base = { code: c.code, percent: c.percent, active: c.active, description: c.description }
    setForm({ ...base })
    setFormInitial({ ...base })
    setFormOpen(true)
  }

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: key === 'active' ? e.target.checked : e.target.value }))

  const formDirty = form !== null && JSON.stringify(form) !== JSON.stringify(formInitial || {})
  const percentNum = Number(form?.percent)
  const canSave =
    formDirty &&
    (form?.code || '').trim().length > 0 &&
    Number.isFinite(percentNum) &&
    percentNum >= 1 &&
    percentNum <= 100

  const submit = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    try {
      const payload = { ...form, percent: Number(form.percent) }
      if (editing) {
        await apiPut(`/api/admin/coupons/${editing}`, payload)
      } else {
        await apiPost('/api/admin/coupons', payload)
      }
      showToast(editing ? 'Cupón actualizado.' : `Cupón ${form.code.toUpperCase()} creado.`, 'success')
      setFormOpen(false)
      setRefresh((n) => n + 1)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (c) => {
    try {
      await apiPut(`/api/admin/coupons/${c.id}`, { active: !c.active })
      showToast(c.active ? 'Cupón desactivado.' : 'Cupón activado.', 'success')
      setRefresh((n) => n + 1)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const remove = async (c) => {
    if (!window.confirm(`¿Eliminar el cupón ${c.code}?`)) return
    try {
      await apiDelete(`/api/admin/coupons/${c.id}`)
      showToast('Cupón eliminado.', 'success')
      setRefresh((n) => n + 1)
    } catch (err) {
      showToast(err.message, 'error')
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
              <button type="submit" className="primary-btn" disabled={saving || !canSave}>
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


export { CouponsScreen }