import { useEffect, useState } from 'react'
import { formatARS } from '@/data/format'
import { BUSINESS_PLANS } from '@/data/plans'
import { apiDelete, apiGet, apiPost, apiPut, getSession } from '@/lib/api'
import { getSuperTenant } from '@/lib/tenant'
import { IconCheck, IconChevron, IconCross, IconEdit, IconPlus, IconSearch, IconTrash } from '@/components/Icons'
import { useToast } from '@/context/useToast'
import { useConfirm } from '@/context/useConfirm'
import { PERM_CODES, PERM_LABELS, ROLE_LABELS, initials, shortDate } from '../../consts.js'
import { BusinessCell, EmptyNote, FilterReset, ScreenBlocked, ScreenLoading, SortSelect, ToggleRow, ToggleSwitch } from '../common'

import Subscription from './components/Subscription'

import './styles.css'

const SUBSCRIPTION_LABELS = { unconfigured: 'Sin configurar', trial: 'En prueba', active: 'Activa', overdue: 'Vencida', paused: 'Pausada', cancelled: 'Cancelada' }
const BUSINESS_STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'paused', label: 'Pausados' },
]

function BusinessAdminEditor({ business, onClose, onUpdated }) {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [form, setForm] = useState({
    name: business.name || '',
    email: business.email || '',
    storeName: business.storeName || '',
    businessSlug: business.businessSlug || '',
    password: '',
  })
  const [saving, setSaving] = useState(false)
  const [action, setAction] = useState('')

  const set = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }))
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  const validSlug = !form.businessSlug || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(form.businessSlug.trim().toLowerCase())
  const canSave = form.name.trim().length >= 2 && form.storeName.trim().length >= 2 && validEmail && validSlug && (!form.password || form.password.length >= 6)

  const updateLocal = (patch) => onUpdated({ ...business, ...patch })

  const submit = async (event) => {
    event.preventDefault()
    if (!canSave || saving) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim(),
        storeName: form.storeName.trim(),
        businessSlug: form.businessSlug.trim().toLowerCase(),
      }
      if (form.password) payload.password = form.password
      const saved = await apiPut(`/api/admin/users/${business.id}`, payload)
      updateLocal({
        ...saved,
        name: payload.name,
        email: payload.email,
        storeName: payload.storeName,
        businessSlug: payload.businessSlug || null,
      })
      setForm((old) => ({ ...old, password: '' }))
      showToast('Datos del admin actualizados.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleAccess = async () => {
    const nextActive = !business.active
    if (!nextActive) {
      const ok = await confirm({
        title: 'Pausar acceso del negocio',
        message: <>El admin y sus operadores no podrán iniciar sesión hasta reactivarlo. La información del negocio se conserva.</>,
        confirmLabel: 'Pausar acceso',
      })
      if (!ok) return
    }
    setAction('access')
    try {
      const saved = await apiPut(`/api/admin/users/${business.id}`, { active: nextActive })
      updateLocal(saved)
      showToast(nextActive ? 'Acceso del negocio reactivado.' : 'Acceso del negocio pausado.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAction('')
    }
  }

  const toggleOnline = async () => {
    setAction('online')
    const online = !business.online
    try {
      await apiPut(`/api/admin/users/businesses/${business.id}/online`, { online })
      updateLocal({ online })
      showToast(online ? 'Pagos online activados.' : 'Pagos online pausados.', 'success')
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setAction('')
    }
  }

  return (
    <section className="dash-card business-editor">
      <div className="dash-card-head">
        <div>
          <span className="dash-eyebrow">Editar negocio</span>
          <h2>{business.storeName || business.name}</h2>
        </div>
        <button type="button" className="ghost-btn" onClick={onClose}>
          <IconCross />
          Cerrar
        </button>
      </div>
      <div className="business-editor-status">
        <span className={`status-tag${business.active ? '' : ' status-muted'}`}>
          {business.active ? <IconCheck /> : <IconCross />}
          {business.active ? 'Acceso activo' : 'Acceso pausado'}
        </span>
        <span className={`status-tag${business.online ? '' : ' status-muted'}`}>
          {business.online ? 'Pagos online activos' : 'Pagos online pausados'}
        </span>
      </div>
      <form className="set-form business-editor-form" onSubmit={submit}>
        <label className="inv-field">
          <span>Nombre del negocio</span>
          <input value={form.storeName} onChange={set('storeName')} minLength={2} maxLength={160} required />
        </label>
        <label className="inv-field">
          <span>Nombre del administrador</span>
          <input value={form.name} onChange={set('name')} minLength={2} required />
        </label>
        <label className="inv-field">
          <span>Email de acceso</span>
          <input type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label className="inv-field">
          <span>Slug de la tienda</span>
          <div className="slug-input">
            <span className="mono slug-prefix">{`${window.location.origin}/u/`}</span>
            <input value={form.businessSlug} onChange={set('businessSlug')} placeholder="mi-tienda" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
          </div>
          <span className="set-hint">Minúsculas, números y guiones. Cambiarlo modifica la URL pública.</span>
        </label>
        <label className="inv-field">
          <span>Nueva contraseña <small>(opcional)</small></span>
          <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" minLength={6} placeholder="Dejar vacía para no cambiarla" />
        </label>
        <div className="business-editor-actions">
          <button type="submit" className="primary-btn" disabled={saving || !canSave}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button type="button" className="ghost-btn" onClick={toggleAccess} disabled={Boolean(action)}>
            {action === 'access' ? 'Actualizando…' : business.active ? 'Pausar acceso' : 'Reactivar acceso'}
          </button>
          <button type="button" className="ghost-btn" onClick={toggleOnline} disabled={Boolean(action)}>
            {action === 'online' ? 'Actualizando…' : business.online ? 'Pausar pagos online' : 'Activar pagos online'}
          </button>
        </div>
      </form>
    </section>
  )
}

function BusinessesScreen({ current, onPick, onCreateAdmin, onBusinessUpdated }) {
  const [billingBusiness, setBillingBusiness] = useState(null)
  const [editingBusiness, setEditingBusiness] = useState(null)
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [statusMenuOpen, setStatusMenuOpen] = useState(false)

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/users/businesses')
      .then((data) => {
        if (alive) setItems(data && data.items ? data.items : [])
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [])

  if (billingBusiness) return <Subscription key={billingBusiness.id} business={billingBusiness} onBack={() => setBillingBusiness(null)} onUpdated={(subscription) => setItems((all) => all.map((b) => String(b.id) === String(billingBusiness.id) ? { ...b, subscription } : b))} />

  if (!items && !error) return <ScreenLoading label="Leyendo negocios…" />
  if (error) return <ScreenBlocked message={error} />

  const normalizedQuery = query.trim().toLowerCase()
  const visibleItems = items.filter((business) => {
    const matchesStatus = statusFilter === 'all' || (statusFilter === 'active' ? business.active : !business.active)
    if (!matchesStatus) return false
    if (!normalizedQuery) return true
    return [business.storeName, business.name, business.email, business.businessSlug]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(normalizedQuery))
  })
  const activeCount = items.filter((business) => business.active).length
  const pausedCount = items.length - activeCount
  const onlineCount = items.filter((business) => business.online).length
  const selectedStatus = BUSINESS_STATUS_OPTIONS.find((option) => option.value === statusFilter) || BUSINESS_STATUS_OPTIONS[0]

  return (
    <div className="dash-screen businesses-screen">
      <section className="businesses-hero">
        <div className="businesses-hero-copy">
          <span className="dash-eyebrow">Centro de control</span>
          <h1>Negocios y administradores</h1>
          <p>Gestioná el acceso, la tienda pública y la suscripción de cada negocio desde un solo lugar.</p>
        </div>
        <button type="button" className="primary-btn businesses-create" onClick={onCreateAdmin}>
          <IconPlus />
          Crear empresa
        </button>
      </section>

      <section className="businesses-kpis" aria-label="Resumen de negocios">
        <div className="business-kpi business-kpi-featured">
          <strong>{items.length}</strong>
          <span>negocios registrados</span>
          <small>Todos tus locales en una vista</small>
        </div>
        <div className="business-kpi">
          <strong>{activeCount}</strong>
          <span>accesos activos</span>
          <small>Admins y operadores habilitados</small>
        </div>
        <div className="business-kpi">
          <strong>{pausedCount}</strong>
          <span>pausados</span>
          <small>Datos preservados</small>
        </div>
        <div className="business-kpi">
          <strong>{onlineCount}</strong>
          <span>pagos online</span>
          <small>Tiendas listas para cobrar</small>
        </div>
      </section>

      {editingBusiness && (
        <BusinessAdminEditor
          business={editingBusiness}
          onClose={() => setEditingBusiness(null)}
          onUpdated={(updated) => {
            setItems((all) => all.map((item) => String(item.id) === String(updated.id) ? updated : item))
            setEditingBusiness(updated)
            onBusinessUpdated?.(updated)
          }}
        />
      )}

      {items.length === 0 && (
        <EmptyNote text="Todavía no hay negocios. Creá un admin de negocio en Usuarios." />
      )}

      {items.length > 0 && (
        <div className="businesses-toolbar">
          <label className="business-search">
            <IconSearch />
            <span className="sr-only">Buscar negocio</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por negocio, admin, email o slug"
              aria-label="Buscar por negocio, admin, email o slug"
            />
          </label>
          <div className={`business-filter${statusMenuOpen ? ' is-open' : ''}`}>
            <span id="business-status-label">Estado</span>
            <div className="business-status-select">
              <button
                type="button"
                className="business-filter-trigger"
                aria-label={`Estado: ${selectedStatus.label}`}
                aria-expanded={statusMenuOpen}
                aria-haspopup="listbox"
                onClick={() => setStatusMenuOpen((open) => !open)}
              >
                <strong>{selectedStatus.label}</strong>
                <IconChevron className={`business-filter-chevron${statusMenuOpen ? ' expanded' : ''}`} />
              </button>
              {statusMenuOpen && (
                <div className="business-status-options" role="listbox" aria-labelledby="business-status-label">
                  {BUSINESS_STATUS_OPTIONS.map((option) => {
                    const selected = option.value === statusFilter
                    return (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={`business-status-option${selected ? ' active' : ''}`}
                        onClick={() => {
                          setStatusFilter(option.value)
                          setStatusMenuOpen(false)
                        }}
                      >
                        <span>{option.label}</span>
                        {selected && <IconCheck aria-hidden="true" />}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
          <span className="business-results">{visibleItems.length} de {items.length}</span>
        </div>
      )}

      {items.length > 0 && visibleItems.length === 0 && (
        <EmptyNote text="No encontramos negocios con esos filtros." />
      )}

      <div className="biz-grid">
        {visibleItems.map((b) => {
          const selected = current && String(current) === String(b.id)
          return (
            <div key={b.id} className="biz-subscription-card">
              <button
                type="button"
                className={`biz-card${selected ? ' biz-card-active' : ''}`}
                onClick={() => onPick(b.id)}
                aria-label={`Abrir panel de ${b.storeName}`}
              >
                <span className="user-avatar mono" aria-hidden="true">
                  {initials(b.storeName)}
                </span>
                <span className="biz-card-main">
                  <span className="biz-card-title">
                    <strong>{b.storeName}</strong>
                    <span className={`status-tag${b.active ? '' : ' status-muted'}`}>
                      {b.active ? <IconCheck /> : <IconCross />}
                      {b.active ? 'Activo' : 'Pausado'}
                    </span>
                  </span>
                  <em>{b.name} · {b.email}</em>
                  {b.businessSlug ? <code className="mono">/u/{b.businessSlug}</code> : <code className="mono biz-card-no-slug">Sin slug público</code>}
                </span>
                {selected && (
                  <span className="biz-selected-badge">
                    <IconCheck />
                    En uso
                  </span>
                )}
              </button>
              <div className="biz-card-body">
                <div className="biz-card-metrics">
                  <span><strong>{b.productCount}</strong><small>Productos</small></span>
                  <span><strong>{b.orderCount}</strong><small>Ventas</small></span>
                  <span><strong>{b.operatorCount}</strong><small>Operadores</small></span>
                  <span><strong>{formatARS(b.revenue)}</strong><small>Facturación</small></span>
                </div>
                <div className="biz-card-summary">
                  <span className="biz-subscription-state">
                    <span className="biz-summary-dot" />
                    {SUBSCRIPTION_LABELS[b.subscription?.effectiveStatus] || 'Sin configurar'}
                    <b>{b.subscription?.plan || 'Sin plan'}</b>
                  </span>
                  <span className={`biz-online-state${b.online ? '' : ' is-paused'}`}>
                    {b.online ? 'Pagos online activos' : 'Pagos online pausados'}
                  </span>
                  {b.subscription?.dueDate && <small>Vence {b.subscription.dueDate.split('-').reverse().join('/')}</small>}
                </div>
                <div className="biz-card-actions">
                  <button type="button" className="ghost-btn" onClick={() => setEditingBusiness(b)}>
                    <IconEdit />
                    Editar admin
                  </button>
                  <button type="button" className="ghost-btn" onClick={() => setBillingBusiness(b)}>Suscripción</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


function UsersScreen({ allowBusinessCreate = false }) {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [formInitial, setFormInitial] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [sessionUser] = useState(() => getSession().user)
  const [businesses, setBusinesses] = useState(null)
  const isSuper = sessionUser?.role === 'superadmin'
  const showBusiness = isSuper && Array.isArray(businesses) && businesses.length > 0

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

  useEffect(() => {
    if (!isSuper) return undefined
    let alive = true
    apiGet('/api/admin/users/businesses')
      .then((data) => {
        if (alive) setBusinesses(data && data.items ? data.items : [])
      })
      .catch(() => {
        if (alive) setBusinesses([])
      })
    return () => {
      alive = false
    }
  }, [isSuper])

  const openNew = () => {
    setEditing(null)
    setGeneratedPassword('')
    const base = { name: '', storeName: '', email: '', role: 'admin', adminId: '', password: '', businessSlug: '', planCode: 'inicial' }
    setForm({ ...base })
    setFormInitial({ ...base })
    setFormOpen(true)
  }

  const openEdit = (u) => {
    setEditing(u.id)
    setGeneratedPassword('')
    const base = {
          name: u.name,
      storeName: u.storeName || '',
      email: u.email,
      role: u.role,
      password: '',
      adminId: u.adminId || '',
      businessSlug: u.businessSlug || '',
      planCode: u.subscription?.planCode || 'inicial',
    }
    setForm({ ...base })
    setFormInitial({ ...base })
    setFormOpen(true)
  }

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const formDirty = form !== null && JSON.stringify(form) !== JSON.stringify(formInitial || {})
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((form?.email || '').trim())
  const validRole = form?.role === 'operator' ? Boolean(form?.adminId) : Boolean(form?.role)
  const canSave = formDirty && (form?.name || '').trim().length >= 2 && validEmail && validRole

  const submit = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setGeneratedPassword('')
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role }
        if (form.password) payload.password = form.password
        if (form.role === 'operator' && form.adminId) payload.adminId = form.adminId
        if (form.role === 'admin') payload.businessSlug = String(form.businessSlug || '').trim()
        if (form.role === 'admin') payload.planCode = form.planCode
        await apiPut(`/api/admin/users/${editing}`, payload)
        showToast('Usuario actualizado.', 'success')
      } else {
        const payload = {
          name: form.name,
          storeName: form.storeName,
          email: form.email,
          role: form.role,
        }
        if (form.password) payload.password = form.password
        if (form.role === 'operator' && form.adminId) payload.adminId = form.adminId
        if (form.role === 'admin') payload.businessSlug = String(form.businessSlug || '').trim()
        if (form.role === 'admin') payload.planCode = form.planCode
        const created = await apiPost('/api/admin/users', payload)
        setGeneratedPassword(created.password || '')
        if (created.emailDelivery?.sent) {
          showToast(`Usuario ${created.email} creado. Acceso enviado por email.`, 'success')
        } else if (created.emailDelivery?.reason === 'email_not_configured') {
          showToast(`Usuario ${created.email} creado. El correo automático aún no está configurado.`, 'warning')
        } else if (created.emailDelivery) {
          showToast(`Usuario ${created.email} creado, pero no pudimos enviar el correo.`, 'warning')
        } else {
          showToast(`Usuario ${created.email} creado.`, 'success')
        }
      }
      setFormOpen(false)
      setRefresh((n) => n + 1)
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u) => {
    try {
      await apiPut(`/api/admin/users/${u.id}`, { active: !u.active })
      showToast(u.active ? 'Usuario desactivado.' : 'Usuario activado.', 'success')
      setRefresh((n) => n + 1)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const deleteUser = async (u) => {
    const ok = await confirm({
      title: 'Eliminar usuario',
      message: (
        <>
          ¿Eliminar a <strong>{u.name}</strong> ({u.email})? Esta acción no se puede deshacer.
        </>
      ),
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    try {
      await apiDelete(`/api/admin/users/${u.id}`)
      showToast('Usuario eliminado.', 'success')
      setRefresh((n) => n + 1)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (!users && !error) return <ScreenLoading label="Cargando usuarios…" />
  if (error) return <ScreenBlocked message={error} />

  const activeCount = users.filter((u) => u.active).length

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Administración</span>
          <h1>Usuarios</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{activeCount}</strong>
          <em>usuarios activos</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Definí la contraseña inicial del administrador. Cada admin puede cambiar su clave y la de sus operadores desde esta sección.
        </p>
        {(!isSuper || allowBusinessCreate) && <button type="button" className="primary-btn dash-add" onClick={openNew}>
          <IconPlus />
          {allowBusinessCreate ? 'Crear empresa' : 'Nuevo usuario'}
        </button>}
      </div>

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
              />
            </label>
            {isSuper && form.role === 'admin' && <label className="inv-field">
              <span>Nombre del negocio</span>
              <input value={form.storeName || ''} onChange={set('storeName')} placeholder="Ej. Electrónica Store" maxLength={160} />
            </label>}
            {isSuper && (
              <label className="inv-field">
                <span>Rol</span>
                <select value={form.role} onChange={set('role')}>
                  <option value="admin">Dueño</option>
                  <option value="operator">Vendedor</option>
                  {isSuper && <option value="superadmin">Dueño general</option>}
                </select>
              </label>
            )}
            {isSuper && form.role === 'operator' && (
              <label className="inv-field">
                <span>Negocio</span>
                <select value={form.adminId} onChange={set('adminId')} required>
                  <option value="">Elegí el negocio…</option>
                  {(businesses || []).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.storeName} — {b.email}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {isSuper && form.role === 'admin' && (
              <label className="inv-field">
                <span>Plan del negocio</span>
                <select value={form.planCode || 'inicial'} onChange={set('planCode')}>
                  {BUSINESS_PLANS.map((plan) => (
                    <option key={plan.code} value={plan.code}>
                      {plan.name} · {formatARS(plan.price)} / mes
                    </option>
                  ))}
                </select>
                <span className="set-hint">Define los módulos disponibles en el panel y los medios de cobro de esta tienda.</span>
              </label>
            )}
            {isSuper && form.role === 'admin' && (
              <label className="inv-field">
                <span>Slug de la tienda</span>
                <div className="slug-input">
                  <span className="mono slug-prefix">{`${window.location.origin}/u/`}</span>
                  <input
                    value={form.businessSlug || ''}
                    onChange={set('businessSlug')}
                    placeholder="mi-tienda"
                    pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  />
                </div>
                <span className="set-hint">
                  URL pública de este negocio. Minúsculas, números y guiones. Dejala vacía para quitarla.
                </span>
              </label>
            )}
            {!editing && (
              <label className="inv-field">
                <span>Contraseña inicial {form.role === 'admin' ? '(requerida)' : '(opcional)'}</span>
                <input
                  type="password"
                  value={form.password || ''}
                  onChange={set('password')}
                  autoComplete="new-password"
                  minLength={6}
                  required={form.role === 'admin'}
                />
                <span className="set-hint">Se enviará al email de acceso. El administrador podrá cambiarla después desde Usuarios.</span>
              </label>
            )}
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
              <button type="submit" className="primary-btn" disabled={saving || !canSave}>
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
              {showBusiness && <th>Negocio</th>}
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
                {showBusiness && <td><BusinessCell adminId={u.role === 'admin' ? u.id : u.adminId} businesses={businesses} /></td>}
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
                  <span className={`role-chip role-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
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
                    {!isSuper && <button type="button" className="row-btn" aria-label={`Editar ${u.name}`} onClick={() => openEdit(u)}>
                      <IconEdit />
                    </button>}
                    {!isSuper && <ToggleSwitch
                      checked={u.active}
                      label={u.active ? `Desactivar ${u.name}` : `Activar ${u.name}`}
                      onChange={() => toggleActive(u)}
                    />}
                    {!isSuper && !u.isSelf && (
                      <button
                        type="button"
                        className="row-btn row-btn-danger"
                        aria-label={`Eliminar ${u.name}`}
                        onClick={() => deleteUser(u)}
                      >
                        <IconTrash />
                      </button>
                    )}
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


function RolesScreen() {
  const { showToast } = useToast()
  const [sessionUser] = useState(() => getSession().user)
  const isSuper = sessionUser?.role === 'superadmin'
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [sortVal, setSortVal] = useState('recent')
  const [onlinePayments, setOnlinePayments] = useState(true)
  const [savingOnline, setSavingOnline] = useState(false)
  const PAGE_SIZE = 10

  const superTenantNow = isSuper ? getSuperTenant() : null

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/users')
      .then((list) => {
        if (!alive) return
        const all = Array.isArray(list) ? list : []
        const superTenant = isSuper ? getSuperTenant() : null
        const scoped = isSuper
          ? all.filter(
              (u) =>
                u.role !== 'superadmin' &&
                (String(u.id) === String(superTenant) ||
                  String(u.adminId || '') === String(superTenant)),
            )
          : all.filter((u) => u.role === 'operator')
        setUsers(scoped)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [isSuper])

  useEffect(() => {
    if (!superTenantNow) return undefined
    let alive = true
    apiGet('/api/admin/settings')
      .then((data) => {
        if (alive) setOnlinePayments(data?.payments?.online !== false)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [superTenantNow])

  const toggleOnline = (on) => {
    if (!superTenantNow) return
    setSavingOnline(true)
    apiPut(`/api/admin/users/businesses/${superTenantNow}/online`, { online: on })
      .then(() => {
        setOnlinePayments(on)
        showToast(
          on
            ? 'Pagos online activados para este negocio.'
            : 'Pagos online desactivados: la web de este negocio pasa a pedir por WhatsApp.',
          'success',
        )
      })
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setSavingOnline(false))
  }

  if (!users && !error) return <ScreenLoading label="Leyendo permisos…" />
  if (error) return <ScreenBlocked message={error} />

  const q = query.trim().toLowerCase()
  const filtered = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    : users
  const sorted = [...filtered].sort((a, b) => {
    if (sortVal === 'az') return String(a.name).localeCompare(String(b.name), 'es')
    if (sortVal === 'za') return String(b.name).localeCompare(String(a.name), 'es')
    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  })
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visible = sorted.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Administración</span>
          <h1>Permisos por usuario</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{users.length}</strong>
          <em>{isSuper ? 'usuarios del negocio' : 'operadores'}</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          {isSuper ? (
            <>
              Cada usuario tiene sus propios permisos: activá o desactivá los módulos que
              puede ver y usar. Los cambios aplican al instante, sin pedirle que vuelva a
              ingresar. El <strong>superadmin</strong> siempre tiene acceso total.
            </>
          ) : (
            <>
              Activá o desactivá qué módulos puede usar cada <strong>operador</strong> de tu
              negocio. Los cambios aplican al instante.
            </>
          )}
        </p>
      </div>

      <div className="dash-toolbar">
        <form
          className="dash-search"
          role="search"
          onSubmit={(e) => e.preventDefault()}
        >
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder={isSuper ? 'Buscar por nombre o email…' : 'Buscar operador por nombre o email…'}
            aria-label="Buscar usuarios"
          />
          {query && (
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setQuery('')
                setPage(1)
              }}
            >
              Limpiar
            </button>
          )}
        </form>
        <div className="dash-filters">
          <SortSelect id="users-sort" value={sortVal} onChange={setSortVal} />
          <FilterReset
            active={Boolean(query || sortVal !== 'recent')}
            onClick={() => {
              setQuery('')
              setPage(1)
              setSortVal('recent')
              setExpanded(null)
            }}
          />
        </div>
      </div>

      {isSuper && !superTenantNow && (
        <p className="list-note">
          Elegí un negocio con el selector para ver y editar los permisos de sus usuarios.
        </p>
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Módulos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
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
                  <span className={`role-chip role-${u.role}`}>{ROLE_LABELS[u.role] || u.role}</span>
                </td>
                <td className="t-date">
                  {Array.isArray(u.permissions)
                    ? `${u.permissions.length} de ${PERM_CODES.length} módulos`
                    : 'Sin módulos'}
                </td>
                <td>
                  <button
                    type="button"
                    className="ghost-btn"
                    onClick={() => setExpanded(expanded === u.id ? null : u.id)}
                  >
                    {expanded === u.id ? 'Ocultar' : 'Ver permisos'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && users.length > 0 && (
        <EmptyNote text="Ningún usuario coincide con la búsqueda." />
      )}

      {totalPages > 1 && (
        <div className="dash-pager">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
          >
            ← Anterior
          </button>
          <span className="mono">
            Página {safePage} de {totalPages} · {filtered.length}{' '}
            {isSuper ? 'usuarios' : 'operadores'}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}

      {users.length === 0 && !isSuper && (
        <p className="list-note">
          Todavía no tenés operadores. Creá uno desde la sección Usuarios.
        </p>
      )}

      {users
        .filter((u) => expanded === u.id)
        .map((u) => (
          <PermUserEditor
            key={u.id}
            user={u}
            onSaved={(t) => t && showToast(t, 'success')}
            isBusinessOwner={isSuper && u.role === 'admin'}
            onlinePayments={onlinePayments}
            savingOnline={savingOnline}
            onToggleOnline={toggleOnline}
          />
        ))}
    </div>
  )
}


function PermUserEditor({ user, onSaved, isBusinessOwner, onlinePayments, savingOnline, onToggleOnline }) {
  const { showToast } = useToast()
  const [perms, setPerms] = useState(user.permissions || [])
  const [saved, setSaved] = useState(user.permissions || [])
  const [saving, setSaving] = useState(null)

  const toggle = async (code) => {
    if (saving) return
    const next = perms.includes(code)
      ? perms.filter((c) => c !== code)
      : [...perms, code]
    setPerms(next)
    setSaving(code)
    try {
      const res = await apiPut(`/api/admin/users/${user.id}/permissions`, {
        permissions: next,
      })
      const result = res.permissions || next
      setPerms(result)
      setSaved(result)
      onSaved(`Permisos de ${user.name} actualizados.`)
    } catch (err) {
      setPerms(saved)
      showToast(err.message, 'error')
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="dash-card set-card set-roles">
      <div className="dash-card-head">
        <h2>Permisos de {user.name}</h2>
      </div>
      {isBusinessOwner && (
        <div className="set-toggles">
          <p className="set-hint">
            Este usuario es el <strong>admin del negocio</strong>: además de sus módulos, el
            súper admin decide si esta web cobra con Mercado Pago o pide el pedido por WhatsApp.
          </p>
          <ToggleRow
            label="Recibir pagos online"
            hint={
              onlinePayments
                ? 'La web cobra con Mercado Pago y el carrito usa el botón de pago.'
                : 'Desactivado: la web usa "Pedir por WhatsApp" con el número de Tienda online → Datos y contacto.'
            }
            checked={onlinePayments !== false}
            disabled={savingOnline}
            onChange={onToggleOnline}
          />
        </div>
      )}
      <div className="set-toggles">
        {PERM_CODES.map((code) => (
          <ToggleRow
            key={code}
            label={PERM_LABELS[code]}
            hint={code}
            checked={perms.includes(code)}
            disabled={saving !== null}
            onChange={() => toggle(code)}
          />
        ))}
      </div>
      {saving && <p className="list-note">Guardando…</p>}
    </section>
  )
}


export { BusinessesScreen, UsersScreen, RolesScreen, PermUserEditor }
