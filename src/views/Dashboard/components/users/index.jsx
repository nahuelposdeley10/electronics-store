import { useEffect, useState } from 'react'
import { formatARS } from '@/data/format'
import { apiDelete, apiGet, apiPost, apiPut, getSession } from '@/lib/api'
import { getSuperTenant } from '@/lib/tenant'
import { IconCheck, IconCross, IconEdit, IconPlus, IconSearch, IconTrash } from '@/components/Icons'
import { PERM_CODES, PERM_LABELS, initials, shortDate } from '../../consts.js'
import { EmptyNote, ScreenBlocked, ScreenLoading, SettingsNote, ToggleRow } from '../common'

import './styles.css'

function BusinessesScreen({ current, onPick }) {
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')

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

  if (!items && !error) return <ScreenLoading label="Leyendo negocios…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Super admin</span>
          <h1>Elegí el negocio</h1>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Como super admin ves todos los negocios. Elegí uno para operar su panel:
          ventas, inventario, caja, reportes y configuración.
        </p>
      </div>

      {items.length === 0 && (
        <EmptyNote text="Todavía no hay negocios. Creá un admin de negocio en Usuarios." />
      )}

      <div className="biz-grid">
        {items.map((b) => {
          const selected = current && String(current) === String(b.id)
          return (
            <button
              key={b.id}
              type="button"
              className={`biz-card${selected ? ' biz-card-active' : ''}`}
              onClick={() => onPick(b.id)}
            >
              <span className="user-avatar mono" aria-hidden="true">
                {initials(b.storeName)}
              </span>
              <span className="biz-card-meta">
                <strong>{b.storeName}</strong>
                <em>{b.name} · {b.email}</em>
                {b.businessSlug && <code className="mono">/u/{b.businessSlug}</code>}
              </span>
              <span className="biz-card-stats">
                <span>{b.productCount} productos</span>
                <span>{b.orderCount} ventas</span>
                <span>{formatARS(b.revenue)}</span>
                <span>{b.operatorCount} operadores</span>
              </span>
              {selected && (
                <span className="status-tag">
                  <IconCheck />
                  Seleccionado
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}


function UsersScreen() {
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [note, setNote] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [saving, setSaving] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [refresh, setRefresh] = useState(0)
  const [sessionUser] = useState(() => getSession().user)
  const [businesses, setBusinesses] = useState(null)
  const isSuper = sessionUser?.role === 'superadmin'

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
    setForm({ name: '', email: '', role: 'admin', adminId: '', password: '', businessSlug: '' })
    setFormOpen(true)
  }

  const openEdit = (u) => {
    setEditing(u.id)
    setGeneratedPassword('')
    setForm({
      name: u.name,
      email: u.email,
      role: u.role,
      password: '',
      adminId: u.adminId || '',
      businessSlug: u.businessSlug || '',
    })
    setFormOpen(true)
  }

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    setGeneratedPassword('')
    try {
      if (editing) {
        const payload = { name: form.name, email: form.email, role: form.role }
        if (form.password) payload.password = form.password
        if (form.role === 'operator' && form.adminId) payload.adminId = form.adminId
        if (form.role === 'admin') payload.businessSlug = String(form.businessSlug || '').trim()
        await apiPut(`/api/admin/users/${editing}`, payload)
        setNote('Usuario actualizado.')
      } else {
        const payload = {
          name: form.name,
          email: form.email,
          role: form.role,
        }
        if (form.password) payload.password = form.password
        if (form.role === 'operator' && form.adminId) payload.adminId = form.adminId
        if (form.role === 'admin') payload.businessSlug = String(form.businessSlug || '').trim()
        const created = await apiPost('/api/admin/users', payload)
        setGeneratedPassword(created.password || '')
        setNote(`Usuario ${created.email} creado.`)
      }
      setFormOpen(false)
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (u) => {
    setNote('')
    try {
      await apiPut(`/api/admin/users/${u.id}`, { active: !u.active })
      setNote(u.active ? 'Usuario desactivado.' : 'Usuario activado.')
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    }
  }

  const deleteUser = async (u) => {
    if (!window.confirm(`¿Eliminar a ${u.name} (${u.email})? Esta acción no se puede deshacer.`)) return
    setNote('')
    try {
      await apiDelete(`/api/admin/users/${u.id}`)
      setNote('Usuario eliminado.')
      setRefresh((n) => n + 1)
    } catch (err) {
      setNote(err.message)
    }
  }

  if (!users && !error) return <ScreenLoading label="Cargando usuarios…" />
  if (error) return <ScreenBlocked message={error} />

  const activeCount = users.filter((u) => u.active).length

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Configuración</span>
          <h1>Usuarios</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{activeCount}</strong>
          <em>usuarios activos</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <p className="list-note">
          Podés definir la contraseña del usuario o dejarla en blanco para generarla. Nunca se guarda en texto plano.
        </p>
        <button type="button" className="primary-btn dash-add" onClick={openNew}>
          <IconPlus />
          Nuevo usuario
        </button>
      </div>

      <SettingsNote text={note} />

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
            {isSuper && (
              <label className="inv-field">
                <span>Rol</span>
                <select value={form.role} onChange={set('role')}>
                  <option value="admin">admin</option>
                  <option value="operator">operator</option>
                  <option value="superadmin">superadmin</option>
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
                <span>Contraseña (dejala vacía para generar una)</span>
                <input
                  type="password"
                  value={form.password || ''}
                  onChange={set('password')}
                  autoComplete="new-password"
                  minLength={6}
                />
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
              <button type="submit" className="primary-btn" disabled={saving}>
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
                  <span className={`role-chip role-${u.role}`}>{u.role}</span>
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
                    <button type="button" className="row-btn" aria-label={`Editar ${u.name}`} onClick={() => openEdit(u)}>
                      <IconEdit />
                    </button>
                    <button
                      type="button"
                      className={`row-btn ${u.active ? 'row-btn-danger' : ''}`}
                      aria-label={u.active ? `Desactivar ${u.name}` : `Activar ${u.name}`}
                      onClick={() => toggleActive(u)}
                    >
                      {u.active ? <IconCross /> : <IconCheck />}
                    </button>
                    {!u.isSelf && (
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
  const [sessionUser] = useState(() => getSession().user)
  const isSuper = sessionUser?.role === 'superadmin'
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)
  const [note, setNote] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8

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

  if (!users && !error) return <ScreenLoading label="Leyendo permisos…" />
  if (error) return <ScreenBlocked message={error} />

  const superTenantNow = isSuper ? getSuperTenant() : null

  const q = query.trim().toLowerCase()
  const filtered = q
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      )
    : users
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const visible = filtered.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  )

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Configuración</span>
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

      <SettingsNote text={note} />

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
                  <span className={`role-chip role-${u.role}`}>{u.role}</span>
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
          <PermUserEditor key={u.id} user={u} onSaved={setNote} />
        ))}
    </div>
  )
}


function PermUserEditor({ user, onSaved }) {
  const [perms, setPerms] = useState(user.permissions || [])
  const [saved, setSaved] = useState(user.permissions || [])
  const [saving, setSaving] = useState(null)
  const [error, setError] = useState('')

  const toggle = async (code) => {
    if (saving) return
    setError('')
    onSaved('')
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
      setError(err.message)
    } finally {
      setSaving(null)
    }
  }

  return (
    <section className="dash-card set-card set-roles">
      <div className="dash-card-head">
        <h2>Permisos de {user.name}</h2>
      </div>
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
      <SettingsNote text={error} />
    </section>
  )
}


export { BusinessesScreen, UsersScreen, RolesScreen, PermUserEditor }