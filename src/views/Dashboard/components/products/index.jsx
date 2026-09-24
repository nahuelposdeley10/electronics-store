import { useEffect, useState } from 'react'
import { formatARS } from '@/data/format'
import SearchSelect from '@/components/SearchSelect'
import { apiDelete, apiGet, apiPost, apiPut, apiUpdate, apiUpload } from '@/lib/api'
import { productImage } from '@/lib/productImage'
import { IconCheck, IconClock, IconCross, IconEdit, IconLock, IconPlus, IconSearch, IconTrash } from '@/components/Icons'
import { CATEGORY_LABELS, IMPORT_EXAMPLE, stockStatusOf } from '../../consts.js'
import { EmptyNote, ScreenBlocked, ScreenLoading, SortSelect, StockValue } from '../common'
import { loadCatalogOptions } from '../common/catalogOptions.js'
import { useToast } from '@/context/useToast'
import { useConfirm } from '@/context/useConfirm'

import './styles.css'

function ProductsScreen({ canManage }) {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [params, setParams] = useState({ q: '', category: '', brand: '', sort: '', page: 1 })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [bulk, setBulk] = useState({ mode: 'percent', value: '', category: 'todas' })
  const [bulkSaving, setBulkSaving] = useState(false)

  useEffect(() => {
    let alive = true
    loadCatalogOptions()
      .then(({ categories, brands }) => {
        if (!alive) return
        setCats(categories)
        setBrands(brands)
      })
      .catch((err) => console.warn('No se pudieron cargar categorías o marcas', err))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      q: params.q,
      page: String(params.page),
      limit: '10',
    })
    if (params.category) paramsString.set('category', params.category)
    if (params.brand) paramsString.set('brand', params.brand)
    if (params.sort) paramsString.set('sort', params.sort)
    apiGet(`/api/admin/products?${paramsString}`)
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
  }, [params])

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const onCategory = (value) =>
    setParams((prev) => ({ ...prev, category: value, page: 1 }))

  const onBrand = (value) =>
    setParams((prev) => ({ ...prev, brand: value, page: 1 }))

  const onSort = (value) =>
    setParams((prev) => ({ ...prev, sort: value, page: 1 }))

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
    showToast(
      editing
        ? `Producto actualizado: ${saved.name}`
        : `Producto agregado: ${saved.name}`,
      'success',
    )
    setParams((prev) => ({ ...prev, page: 1 }))
  }

  const handleDelete = async (product) => {
    const ok = await confirm({
      title: 'Eliminar producto',
      message: (
        <>
          ¿Eliminar <strong>"{product.name}" {product.brand}</strong> de la galería?
        </>
      ),
      confirmLabel: 'Eliminar',
    })
    if (!ok) return
    try {
      await apiDelete(`/api/admin/products/${product.id}`)
      showToast(`Producto eliminado: ${product.name}`, 'success')
      if (data && data.items.length === 1 && data.page > 1) {
        setParams((prev) => ({ ...prev, page: prev.page - 1 }))
      } else {
        setParams((prev) => ({ ...prev }))
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const applyBulk = async (e) => {
    e.preventDefault()
    if (bulk.value === '' || Number(bulk.value) === 0) return
    setBulkSaving(true)
    try {
      await apiPost('/api/admin/prices/bulk', {
        mode: bulk.mode,
        value: Number(bulk.value),
        category: bulk.category,
      })
      const bucket = bulk.category === 'todas' ? 'todas las categorías' : bulk.category
      showToast(`Ajuste masivo aplicado a ${bucket}`, 'success')
      setBulk((b) => ({ ...b, value: '' }))
      setParams((prev) => ({ ...prev }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setBulkSaving(false)
    }
  }

  if (!data && !error) return <ScreenLoading label="Cargando la estantería…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Estantería</span>
          <h1>Productos</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>en la galería</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá producto, marca o categoría…"
            aria-label="Buscar productos"
          />
        </form>
        <div className="dash-filters">
          <label className="sort-field">
            <span>Categoría</span>
            <SearchSelect
              id="products-category-filter"
              value={params.category}
              onChange={onCategory}
              options={[
                ...cats.map((c) => ({ value: c.key, label: c.name })),
                { value: ':none:', label: 'Sin categoría' },
              ]}
            />
          </label>
          <label className="sort-field">
            <span>Marca</span>
            <SearchSelect
              id="products-brand-filter"
              value={params.brand}
              onChange={onBrand}
              options={[
                ...brands.map((b) => ({ value: b, label: b })),
                { value: ':none:', label: 'Sin marca' },
              ]}
            />
          </label>
          <SortSelect id="products-sort" value={params.sort} onChange={onSort} />
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
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

      {canManage && (
        <form className="bulk-bar" onSubmit={applyBulk}>
          <strong>Ajuste masivo</strong>
          <label className="bulk-field">
            <span>Categoría</span>
            <SearchSelect
              id="bulk-category-filter"
              value={bulk.category}
              onChange={(v) => setBulk((b) => ({ ...b, category: v }))}
              allLabel="Todas"
              allValue="todas"
              options={cats.map((c) => ({ value: c.key, label: c.name }))}
            />
          </label>
          <label className="bulk-field">
            <span>Modo</span>
            <select
              value={bulk.mode}
              onChange={(e) => setBulk((b) => ({ ...b, mode: e.target.value }))}
            >
              <option value="percent">Porcentaje (+/-)</option>
              <option value="round">Redondear a</option>
              <option value="set">Precio fijo</option>
            </select>
          </label>
          <label className="bulk-field">
            <span>{bulk.mode === 'round' ? 'Redondear a…' : 'Valor'}</span>
            <input
              type="number"
              value={bulk.value}
              onChange={(e) => setBulk((b) => ({ ...b, value: e.target.value }))}
              placeholder={
                bulk.mode === 'percent'
                  ? 'Ej. 10 o -5'
                  : bulk.mode === 'round'
                    ? 'Ej. 100'
                    : 'Ej. 50000'
              }
              required
            />
          </label>
          <button
            type="submit"
            className="primary-btn"
            disabled={bulkSaving || bulk.value === '' || Number(bulk.value) === 0}
          >
            {bulkSaving ? 'Aplicando…' : 'Aplicar ajuste'}
          </button>
        </form>
      )}

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
              <th>Costo</th>
              <th>Ganancia</th>
              <th>Stock</th>
              <th>Vendidos</th>
              <th>Ingresos</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id} className={`stock-row-${stockStatusOf(p.stock, p.minStock)}`}>
                <td>
                  <span className="t-cell-product">
                    <img className="prod-thumb" src={productImage(p.image)} alt="" loading="lazy" />
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
                <td className="mono t-num t-cost">{p.costPrice ? formatARS(p.costPrice) : '—'}</td>
                <td className="mono t-num t-margin">
                  {p.costPrice ? (
                    <span className={p.price - p.costPrice >= 0 ? 'mv-delta up' : 'mv-delta down'}>
                      {formatARS(p.price - p.costPrice)}
                    </span>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="mono t-num"><StockValue stock={p.stock} min={p.minStock} /></td>
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
        {data.items.length === 0 && (
          <EmptyNote text="Ningún producto con ese nombre, marca o categoría." />
        )}
      </div>

      {data.totalPages > 1 && (
        <div className="dash-pager">
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={data.page <= 1}
          >
            ← Anterior
          </button>
          <span className="mono">
            Página {data.page} de {data.totalPages} · {data.total} productos
          </span>
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={data.page >= data.totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}


function ProductForm({ product, onClose, onSaved }) {
  const seed = () => ({
    name: product?.name || '',
    brand: product?.brand || '',
    category: product?.category || 'audio',
    price: product?.price ?? '',
    costPrice: product?.costPrice ?? '',
    stock: product?.stock ?? '',
    rating: product?.rating ?? '',
    freeShipping: product?.freeShipping ?? true,
    badge: product?.badge || '',
    description: product?.description || '',
    specs: product?.specs?.join(', ') || '',
  })
  const [form, setForm] = useState(seed)
  const [initial] = useState(seed)
  const [image, setImage] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [brandOptions, setBrandOptions] = useState([])
  const [categoryOptions, setCategoryOptions] = useState([])

  useEffect(() => {
    let alive = true
    loadCatalogOptions()
      .then(({ categories, brands }) => {
        if (!alive) return
        setBrandOptions(brands)
        setCategoryOptions(categories)
      })
      .catch((err) => console.warn('No se pudieron cargar categorías o marcas', err))
    return () => {
      alive = false
    }
  }, [])

  const formDirty = JSON.stringify(form) !== JSON.stringify(initial) || Boolean(image)
  const valid =
    (form.name || '').trim().length >= 2 &&
    (form.brand || '').trim().length >= 2 &&
    Number(form.price) > 0
  const canSave = formDirty && valid

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!canSave) return
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

  const brandList =
    form.brand && !brandOptions.includes(form.brand)
      ? [...brandOptions, form.brand]
      : brandOptions
  const baseCatList =
    categoryOptions.length > 0
      ? categoryOptions
      : Object.entries(CATEGORY_LABELS).map(([key, name]) => ({ key, name }))
  const catList =
    form.category && !baseCatList.some((c) => c.key === form.category)
      ? [...baseCatList, { key: form.category, name: form.category }]
      : baseCatList

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
              <SearchSelect
                id="pf-brand"
                allLabel="Seleccioná una marca…"
                value={form.brand}
                onChange={(v) => setForm((f) => ({ ...f, brand: v }))}
                options={brandList.map((b) => ({ value: b, label: b }))}
              />
            </label>

            <label className="pf-field">
              <span>Categoría</span>
              <SearchSelect
                id="pf-category"
                allLabel="Seleccioná una categoría…"
                value={form.category}
                onChange={(v) => setForm((f) => ({ ...f, category: v }))}
                options={catList.map((c) => ({ value: c.key, label: c.name }))}
              />
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
              <span>Costo ($)</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.costPrice || 0}
                disabled
                className="pf-locked"
                title="Se carga desde Inventario"
              />
            </label>

            <label className="pf-field">
              <span>Stock</span>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock || 0}
                disabled
                className="pf-locked"
                title="Se carga desde Inventario"
              />
            </label>

            <p className="pf-lock-note pf-full">
              <IconLock />
              Costo y stock se cargan desde Inventario (compras y movimientos).
            </p>

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
              {product && !image && (
                <img className="pf-preview" src={productImage(product.image)} alt="" />
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
              disabled={saving || !canSave}
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


function MetaScreen({ kind, title, eyebrow, empty, canManage }) {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [items, setItems] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [refresh, setRefresh] = useState(0)
  const [formOpen, setFormOpen] = useState(false)

  const hasKey = kind === 'categories'
  const singular = hasKey ? 'categoría' : 'marca'
  const plural = hasKey ? 'categorías' : 'marcas'

  useEffect(() => {
    let alive = true
    apiGet(`/api/admin/${kind}`)
      .then((data) => {
        if (!alive) return
        setItems(data.items || [])
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [kind, refresh])

  const openForm = (item = null) => {
    setEditing(item)
    setFormOpen(true)
  }

  const closeForm = () => {
    setFormOpen(false)
    setEditing(null)
  }

  const handleSaved = (saved) => {
    closeForm()
    showToast(
      editing
        ? `${singular} actualizada: ${saved.name}`
        : `${singular} creada: ${saved.name}`,
      'success',
    )
    setRefresh((n) => n + 1)
  }

  const handleDelete = async (item) => {
    const used = item.productCount || 0
    const options =
      used > 0
        ? {
            title: `Eliminar ${singular}`,
            message: (
              <>
                {used === 1 ? '1 producto usa' : `${used} productos usan`} esta {singular} y{' '}
                quedará{used === 1 ? '' : 'n'} <strong>sin {singular}</strong>. No se verá en la
                web hasta que le asignes una {singular}. ¿Eliminar de todos modos?
              </>
            ),
            confirmLabel: 'Eliminar igual',
          }
        : {
            title: `Eliminar ${singular}`,
            message: <>¿Eliminar {singular.toLowerCase()} <strong>"{item.name}"</strong>?</>,
            confirmLabel: 'Eliminar',
          }
    const ok = await confirm(options)
    if (!ok) return
    try {
      const target = hasKey ? item.key : encodeURIComponent(item.name)
      const reassign = used > 0 ? '?reassign=1' : ''
      await apiDelete(`/api/admin/${kind}/${target}${reassign}`)
      showToast(
        used > 0
          ? `${singular} eliminada: ${item.name} · ${used} producto${used === 1 ? '' : 's'} quedaron sin ${singular}`
          : `${singular} eliminada: ${item.name}`,
        'success',
      )
      setRefresh((n) => n + 1)
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  if (!items && !error) return <ScreenLoading label="Cargando la estantería…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">{eyebrow}</span>
          <h1>{title}</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{items.length}</strong>
          <em>en la estantería</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <span className="count-tag mono">
          {items.length} {plural}
        </span>
        {canManage && (
          <button type="button" className="primary-btn dash-add" onClick={() => openForm()}>
            <IconPlus />
            Agregar {singular}
          </button>
        )}
      </div>

      {formOpen && (
        <MetaForm
          hasKey={hasKey}
          item={editing}
          noun={singular}
          path={`/api/admin/${kind}`}
          onClose={closeForm}
          onSaved={handleSaved}
        />
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Nombre</th>
              {hasKey && <th>Clave</th>}
              <th>Productos</th>
              <th>Estado</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={hasKey ? item.key : item.name}>
                <td>
                  <strong>{item.name}</strong>
                </td>
                {hasKey && <td className="mono t-cat">{item.key}</td>}
                <td className="mono t-num">{item.productCount}</td>
                <td>
                  <span className={`status-tag${item.active ? ' on' : ' off'}`}>
                    {item.active ? <IconCheck /> : <IconClock />}
                    {item.active ? 'Activa' : 'Inactiva'}
                  </span>
                </td>
                {canManage && (
                  <td>
                    <span className="row-actions">
                      <button
                        type="button"
                        className="row-btn"
                        aria-label={`Editar ${item.name}`}
                        onClick={() => openForm(item)}
                      >
                        <IconEdit />
                      </button>
                      <button
                        type="button"
                        className="row-btn row-btn-danger"
                        aria-label={`Eliminar ${item.name}`}
                        onClick={() => handleDelete(item)}
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
        {items.length === 0 && <EmptyNote text={empty} />}
      </div>
    </div>
  )
}


function MetaForm({ hasKey, item, noun, path, onClose, onSaved }) {
  const seed = () => ({
    name: item?.name || '',
    key: item?.key || '',
    active: item?.active !== false,
  })
  const [form, setForm] = useState(seed)
  const [initial] = useState(seed)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const formDirty = JSON.stringify(form) !== JSON.stringify(initial)
  const valid = (form.name || '').trim().length >= 2
  const canSave = formDirty && valid

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
    }))

  const submit = async (e) => {
    e.preventDefault()
    if (!canSave) return
    setSaving(true)
    setError('')
    const body = hasKey ? form : { name: form.name, active: form.active }
    try {
      if (item) {
        const target = hasKey ? item.key : encodeURIComponent(item.name)
        const saved = await apiPut(`${path}/${target}`, body)
        onSaved(saved)
      } else {
        const saved = await apiPost(path, body)
        onSaved(saved)
      }
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
        aria-label={item ? `Editar ${noun}` : `Agregar ${noun}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="product-head">
          <div>
            <span className="dash-eyebrow">Estantería</span>
            <h2>{item ? `Editar ${noun}` : `Agregar ${noun}`}</h2>
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
                placeholder={hasKey ? 'Ej. Audio' : 'Ej. Logitech'}
                required
              />
            </label>
            {hasKey && (
              <label className="pf-field pf-full">
                <span>Clave (identificador)</span>
                <input
                  type="text"
                  value={form.key}
                  onChange={set('key')}
                  placeholder="Ej. audio — se genera sola si la dejás vacía"
                />
              </label>
            )}
            <label className="pf-check pf-full">
              <input type="checkbox" checked={form.active} onChange={set('active')} />
              <span>{hasKey ? 'Categoría activa' : 'Marca activa'}</span>
            </label>
          </div>

          {error && <em className="unlock-error">{error}</em>}

          <div className="pf-actions">
            <button type="button" className="ghost-btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="primary-btn" disabled={saving || !canSave}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function OffersScreen({ canManage }) {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [params, setParams] = useState({ q: '', category: '', brand: '', sort: '', page: 1 })
  const [savingId, setSavingId] = useState(null)
  const [edits, setEdits] = useState({})
  const [formOpen, setFormOpen] = useState(false)

  useEffect(() => {
    let alive = true
    loadCatalogOptions()
      .then(({ categories, brands }) => {
        if (!alive) return
        setCats(categories)
        setBrands(brands)
      })
      .catch((err) => console.warn('No se pudieron cargar categorías o marcas', err))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({
      q: params.q,
      page: String(params.page),
      limit: '10',
    })
    if (params.category) qs.set('category', params.category)
    if (params.brand) qs.set('brand', params.brand)
    if (params.sort) qs.set('sort', params.sort)
    apiGet(`/api/admin/offers?${qs}`)
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
  }, [params])

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const onCategory = (value) =>
    setParams((prev) => ({ ...prev, category: value, page: 1 }))

  const onBrand = (value) =>
    setParams((prev) => ({ ...prev, brand: value, page: 1 }))

  const onSort = (value) =>
    setParams((prev) => ({ ...prev, sort: value, page: 1 }))

  const oldPriceOf = (p) => edits[p.id]?.oldPrice ?? p.oldPrice ?? ''

  const priceOf = (p) => edits[p.id]?.price ?? p.price ?? ''

  const setField = (id, key) => (value) =>
    setEdits((prev) => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [key]: value },
    }))

  const hasEdit = (p) => Boolean(edits[p.id])

  const saveOffer = async (p) => {
    setSavingId(p.id)
    try {
      await apiPost('/api/admin/offers', {
        productId: p.id,
        oldPrice: oldPriceOf(p),
        price: priceOf(p),
      })
      showToast(`Oferta guardada: ${p.name}`, 'success')
      setEdits((prev) => {
        const next = { ...prev }
        delete next[p.id]
        return next
      })
      setParams((prev) => ({ ...prev }))
    } catch (err) {
      showToast(err.message, 'error')
    } finally {
      setSavingId(null)
    }
  }

  const removeOffer = async (p) => {
    const ok = await confirm({
      title: 'Quitar de ofertas',
      message: (
        <>
          ¿Quitar <strong>"{p.name}"</strong> de las ofertas?
        </>
      ),
      confirmLabel: 'Quitar',
    })
    if (!ok) return
    try {
      await apiDelete(`/api/admin/offers/${p.id}`)
      showToast(`Oferta removida: ${p.name}`, 'success')
      if (data && data.items.length === 1 && data.page > 1) {
        setParams((prev) => ({ ...prev, page: prev.page - 1 }))
      } else {
        setParams((prev) => ({ ...prev }))
      }
    } catch (err) {
      showToast(err.message, 'error')
    }
  }

  const handleAdded = (saved) => {
    setFormOpen(false)
    showToast(`Producto en oferta: ${saved.name}`, 'success')
    setParams((prev) => ({ ...prev, page: 1 }))
  }

  if (!data && !error) return <ScreenLoading label="Cargando ofertas…" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Estantería</span>
          <h1>Ofertas de la semana</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>en oferta</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscá producto, marca o categoría…"
            aria-label="Buscar ofertas"
          />
        </form>
        <div className="dash-filters">
          <SearchSelect
            id="stock-category-filter"
            label="Categoría"
            value={params.category}
            onChange={onCategory}
            options={cats.map((c) => ({ value: c.key, label: c.name }))}
          />
          <SearchSelect
            id="stock-brand-filter"
            label="Marca"
            value={params.brand}
            onChange={onBrand}
            options={brands.map((b) => ({ value: b, label: b }))}
          />
          <SortSelect id="offers-sort" value={params.sort} onChange={onSort} />
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
        {canManage && (
          <button
            type="button"
            className="primary-btn dash-add"
            onClick={() => setFormOpen(true)}
          >
            <IconPlus />
            Poner en oferta
          </button>
        )}
      </div>

      {formOpen && (
        <OfferForm onClose={() => setFormOpen(false)} onSaved={handleAdded} />
      )}

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Precio</th>
              <th>Nuevo $</th>
              <th>Antes $</th>
              <th>Descuento</th>
              <th>Stock</th>
              {canManage && <th>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => {
              const old = Number(oldPriceOf(p))
              const cur = Number(priceOf(p))
              const discount =
                old > cur && cur > 0 ? Math.round((1 - cur / old) * 100) : 0
              return (
                <tr key={p.id} className={`stock-row-${stockStatusOf(p.stock, p.minStock)}`}>
                  <td>
                    <span className="t-cell-product">
                      <img className="prod-thumb" src={productImage(p.image)} alt="" loading="lazy" />
                      <span>
                        <strong>{p.name}</strong>
                        <em>{p.brand}</em>
                      </span>
                    </span>
                  </td>
                  <td className="mono t-num">{formatARS(p.price)}</td>
                  <td>
                    <input
                      className="price-input mono"
                      type="number"
                      min="1"
                      step="1"
                      value={priceOf(p)}
                      onChange={(e) => setField(p.id, 'price')(e.target.value)}
                      disabled={!canManage}
                      aria-label={`Nuevo precio de ${p.name}`}
                    />
                  </td>
                  <td>
                    <input
                      className="price-input mono"
                      type="number"
                      min="1"
                      step="1"
                      value={oldPriceOf(p)}
                      onChange={(e) => setField(p.id, 'oldPrice')(e.target.value)}
                      disabled={!canManage}
                      aria-label={`Precio anterior de ${p.name}`}
                    />
                  </td>
                  <td className="mono t-num t-money">
                    {discount > 0 ? `${discount}% OFF` : '—'}
                  </td>
                  <td className="mono t-num"><StockValue stock={p.stock} min={p.minStock} /></td>
                  {canManage && (
                    <td>
                      <span className="row-actions">
                        <button
                          type="button"
                          className="row-btn"
                          disabled={!hasEdit(p) || savingId === p.id}
                          onClick={() => saveOffer(p)}
                          aria-label={`Guardar oferta de ${p.name}`}
                        >
                          <IconCheck />
                        </button>
                        <button
                          type="button"
                          className="row-btn row-btn-danger"
                          onClick={() => removeOffer(p)}
                          aria-label={`Quitar ${p.name} de las ofertas`}
                        >
                          <IconTrash />
                        </button>
                      </span>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
        {data.items.length === 0 && (
          <EmptyNote text="Todavía no hay productos en oferta." />
        )}
      </div>

      {data.totalPages > 1 && (
        <div className="dash-pager">
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={data.page <= 1}
          >
            ← Anterior
          </button>
          <span className="mono">
            Página {data.page} de {data.totalPages} · {data.total} ofertas
          </span>
          <button
            type="button"
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={data.page >= data.totalPages}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}


function OfferForm({ onClose, onSaved }) {
  const [products, setProducts] = useState([])
  const [form, setForm] = useState({ productId: '', oldPrice: '', price: '' })
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

  const selected = products.find((p) => String(p.id) === String(form.productId))

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  const selectProduct = (e) => {
    const id = e.target.value
    const p = products.find((x) => String(x.id) === String(id))
    setForm((f) => ({
      ...f,
      productId: id,
      oldPrice: p ? String(p.price) : '',
    }))
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.productId || !(newPrice > 0)) return
    setSaving(true)
    setError('')
    try {
      const saved = await apiPost('/api/admin/offers', {
        productId: form.productId,
        oldPrice: form.oldPrice,
        price: form.price,
      })
      onSaved(saved)
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  const newPrice = Number(form.price)
  const oldPriceNum = Number(form.oldPrice)
  const previewDiscount =
    oldPriceNum > newPrice && newPrice > 0
      ? Math.round((1 - newPrice / oldPriceNum) * 100)
      : 0

  return (
    <div className="product-overlay" onMouseDown={saving ? undefined : onClose}>
      <div
        className="product-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Poner en oferta"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="product-head">
          <div>
            <span className="dash-eyebrow">Estantería</span>
            <h2>Poner en oferta</h2>
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
              <span>Producto</span>
              <select value={form.productId} onChange={selectProduct} required>
                <option value="">Elegí un producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.brand}
                  </option>
                ))}
              </select>
            </label>

            {selected && (
              <p className="list-note pf-full">
                Precio actual de {selected.name}:{' '}
                <strong className="mono">{formatARS(selected.price)}</strong>
              </p>
            )}

            <label className="pf-field pf-full">
              <span>Nuevo precio ($)</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.price}
                onChange={set('price')}
                placeholder={selected ? String(selected.price) : 'El precio con descuento'}
                required
              />
            </label>

            <label className="pf-field pf-full">
              <span>Precio anterior ($) — para mostrar el % OFF</span>
              <input
                type="number"
                min="1"
                step="1"
                value={form.oldPrice}
                onChange={set('oldPrice')}
                placeholder="Precio de lista"
              />
            </label>

            {selected && newPrice > 0 && (
              <p className="list-note pf-full">
                Queda en <strong className="mono">{formatARS(newPrice)}</strong>
                {previewDiscount > 0 && (
                  <>
                    {' '}
                    · <span className="tag-discount inline">{previewDiscount}% OFF</span>
                  </>
                )}
              </p>
            )}
          </div>

          {error && <em className="unlock-error">{error}</em>}

          <div className="pf-actions">
            <button type="button" className="ghost-btn" onClick={onClose} disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="primary-btn" disabled={saving || !form.productId || !(newPrice > 0)}>
              {saving ? 'Guardando…' : 'Poner en oferta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}


function ImportScreen({ canManage }) {
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const loadExample = () => {
    setText(JSON.stringify(IMPORT_EXAMPLE, null, 2))
    setResult(null)
    setError('')
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    setError('')
    setResult(null)

    let products
    try {
      products = JSON.parse(text)
    } catch {
      setError('El texto no es un JSON válido. Revisá comas, llaves y corchetes.')
      setBusy(false)
      return
    }

    try {
      const res = await apiPost('/api/admin/import/products', { products })
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Estantería</span>
          <h1>Importar productos</h1>
        </div>
      </header>

      {canManage ? (
        <form onSubmit={submit} className="import-wrap">
          <label className="pf-field">
            <span>Productos en formato JSON</span>
            <textarea
              className="import-textarea"
              rows={12}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setResult(null)
              }}
              placeholder='[{"name":"Teclado Gamer RGB","brand":"Logitech","category":"perifericos","price":45000}]'
            />
          </label>

          <p className="import-help">
            Requeridos: <strong>name</strong>, <strong>brand</strong>,{' '}
            <strong>category</strong> (clave válida) y <strong>price</strong>.
            Opcionales: oldPrice, stock, rating, freeShipping, badge, image,
            description y specs (arreglo o texto separado por coma).
          </p>

          <div className="pf-actions">
            <button type="button" className="ghost-btn" onClick={loadExample}>
              Cargar ejemplo
            </button>
            <button type="submit" className="primary-btn" disabled={busy || !text.trim()}>
              {busy ? 'Importando…' : 'Importar productos'}
            </button>
          </div>

          {error && <em className="unlock-error">{error}</em>}

          {result && (
            <div className="import-result">
              <p>
                <strong>{result.created}</strong> producto(s) importado(s).
              </p>
              {result.skipped.length > 0 && (
                <>
                  <p>Se omitieron {result.skipped.length} fila(s):</p>
                  <ul>
                    {result.skipped.map((skip, index) => (
                      <li key={index}>
                        Línea {skip.index}: {skip.error}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
        </form>
      ) : (
        <div className="table-wrap">
          <EmptyNote text="Solo superadmins pueden importar productos." />
        </div>
      )}
    </div>
  )
}


export { ProductsScreen, ProductForm, MetaScreen, MetaForm, OffersScreen, OfferForm, ImportScreen }