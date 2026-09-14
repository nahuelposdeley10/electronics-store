import { useEffect, useState } from 'react'
import { formatARS } from '@/data/format'
import SearchSelect from '@/components/SearchSelect'
import { apiGet, apiPost, apiPut } from '@/lib/api'
import { IconCheck, IconCross, IconPlus, IconSearch } from '@/components/Icons'
import { CATEGORY_LABELS, MOVEMENT_CHIPS, MOVEMENT_TYPE_LABELS, shortDate, fullDate, itemsSummary } from '../../consts.js'
import { EmptyNote, ScreenBlocked, ScreenLoading, StockBadge } from '../common'

import './styles.css'

function StockScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [params, setParams] = useState({ q: '', low: '', category: '', brand: '', page: 1 })

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCats(res.categories || [])
      })
      .catch((err) => console.warn('No se pudieron cargar las categorÃ­as', err))
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrands(res.brands || [])
      })
      .catch((err) => console.warn('No se pudieron cargar las marcas', err))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      q: params.q,
      low: params.low,
      page: String(params.page),
      limit: '50',
    })
    if (params.category) paramsString.set('category', params.category)
    if (params.brand) paramsString.set('brand', params.brand)
    apiGet(`/api/admin/inventory/stock?${paramsString}`)
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

  const toggleLow = () => {
    setParams((prev) => ({ ...prev, low: prev.low ? '' : '1', page: 1 }))
  }

  if (!data && !error) return <ScreenLoading label="Contando el stockâ€¦" />
  if (error) return <ScreenBlocked message={error} />

  const lowCount = data.items.filter((p) => p.status !== 'ok').length

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Stock actual</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>productos en el depÃ³sito</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BuscÃ¡ producto, marca o categorÃ­aâ€¦"
            aria-label="Buscar en stock"
          />
        </form>
        <div className="dash-filters">
          <SearchSelect
            id="stock-category-filter"
            label="CategorÃ­a"
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
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
        <div className="sale-chips">
          <button
            type="button"
            className={`sale-chip mono${params.low ? ' active' : ''}`}
            onClick={toggleLow}
          >
            Solo stock bajo <span>{lowCount}</span>
          </button>
        </div>
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>CategorÃ­a</th>
              <th>Precio</th>
              <th>Stock</th>
              <th>MÃ­nimo</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className="t-cell-product">
                    {p.image ? <img className="prod-thumb" src={p.image} alt="" loading="lazy" /> : <span className="prod-thumb empty" />}
                    <span>
                      <strong>{p.name}</strong>
                      <em>{p.brand}</em>
                    </span>
                  </span>
                </td>
                <td className="t-cat">{CATEGORY_LABELS[p.category] || p.category}</td>
                <td className="mono t-num t-money">{formatARS(p.price)}</td>
                <td>
                  <span className="stock-cell">
                    <strong className="mono">{p.stock}</strong>
                    <StockBadge status={p.status} />
                  </span>
                </td>
                <td className="mono t-num">{p.minStock}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="No hay productos que coincidan con el filtro." />}
      </div>

      {data.total > data.pageSize && (
        <div className="dash-pager">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            â† Anterior
          </button>
          <span className="mono">
            pÃ¡gina {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente â†’
          </button>
        </div>
      )}
    </div>
  )
}


function MovementsScreen() {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [params, setParams] = useState({ type: '', q: '', page: 1 })

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      type: params.type,
      q: params.q,
      page: String(params.page),
      limit: '20',
    })
    apiGet(`/api/admin/inventory/movements?${paramsString}`)
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

  if (!data && !error) return <ScreenLoading label="Leyendo los movimientosâ€¦" />
  if (error) return <ScreenBlocked message={error} />

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Movimientos</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>anotaciones de stock</em>
        </div>
      </header>

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BuscÃ¡ por productoâ€¦"
            aria-label="Buscar movimientos"
          />
        </form>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
      </div>

      <div className="sale-chips" role="group" aria-label="Filtrar movimientos">
        {MOVEMENT_CHIPS.map((chip) => (
          <button
            key={chip.id}
            type="button"
            className={`sale-chip mono${params.type === chip.id ? ' active' : ''}`}
            onClick={() => setParams((prev) => ({ ...prev, type: chip.id, page: 1 }))}
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
              <th>Producto</th>
              <th>Tipo</th>
              <th>VariaciÃ³n</th>
              <th>Antes â†’ DespuÃ©s</th>
              <th>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((m) => (
              <tr key={m.id}>
                <td className="t-date" title={fullDate(m.createdAt)}>
                  {shortDate(m.createdAt)}
                </td>
                <td>
                  <span className="t-cell-name">
                    <strong>{m.productName}</strong>
                    <em>#{m.productId}</em>
                  </span>
                </td>
                <td>
                  <span className={`mv-type ${m.type}`}>{MOVEMENT_TYPE_LABELS[m.type] || m.type}</span>
                </td>
                <td className="mono">
                  <span className={`mv-delta ${m.delta >= 0 ? 'up' : 'down'}`}>
                    {m.delta >= 0 ? `+${m.delta}` : m.delta}
                  </span>
                </td>
                <td className="mono t-num">
                  {m.stockBefore} â†’ {m.stockAfter}
                </td>
                <td className="t-dim">{m.reason || 'â€”'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="TodavÃ­a no hay movimientos con esos filtros." />}
      </div>

      {data.total > data.pageSize && (
        <div className="dash-pager">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            â† Anterior
          </button>
          <span className="mono">
            pÃ¡gina {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente â†’
          </button>
        </div>
      )}
    </div>
  )
}


function AdjustmentsScreen({ canManage }) {
  const [products, setProducts] = useState([])
  const [movements, setMovements] = useState(null)
  const [error, setError] = useState('')
  const [params, setParams] = useState({ type: 'ajuste', q: '', page: 1 })
  const [form, setForm] = useState({ productId: '', delta: '', reason: '' })
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/products?limit=100')
      .then((res) => {
        if (alive) setProducts(res.items || [])
      })
      .catch((err) => console.warn('No se pudieron cargar los productos para ajustes', err))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const paramsString = new URLSearchParams({
      type: params.type,
      q: params.q,
      page: String(params.page),
      limit: '10',
    })
    apiGet(`/api/admin/inventory/movements?${paramsString}`)
      .then((res) => {
        if (alive) setMovements(res)
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [params])

  const submitAdjustment = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    try {
      const res = await apiPost('/api/admin/inventory/adjustments', {
        productId: Number(form.productId),
        delta: Number(form.delta),
        reason: form.reason.trim(),
      })
      const product = products.find((p) => p.id === Number(form.productId))
      setNote(`Ajuste aplicado en "${product?.name || res.movement.productName}" â†’ stock ${res.stock}`)
      setForm((f) => ({ ...f, delta: '', reason: '' }))
      setMovements((prev) => (prev ? { ...prev } : prev))
      setParams((prev) => ({ ...prev }))
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (error) return <ScreenBlocked message={error} />
  if (!movements) return <ScreenLoading label="Preparando ajustesâ€¦" />

  const selectedProduct = form.productId
    ? products.find((p) => p.id === Number(form.productId))
    : null
  const resultingStock =
    selectedProduct && form.delta !== ''
      ? selectedProduct.stock + Number(form.delta)
      : null

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Ajustes de stock</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{movements.total}</strong>
          <em>ajustes registrados</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}
      {!canManage && (
        <p className="sale-note">Solo el superadmin puede aplicar ajustes.</p>
      )}

      <div className="inv-grid">
        <form className="inv-panel" onSubmit={submitAdjustment}>
          <h2>Ajustar stock manualmente</h2>
          <label className="inv-field">
            <span>Producto</span>
            <select
              value={form.productId}
              onChange={(e) => setForm((f) => ({ ...f, productId: e.target.value }))}
              required
            >
              <option value="">ElegÃ­ un productoâ€¦</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} Â· {p.brand} (stock {p.stock})
                </option>
              ))}
            </select>
          </label>
          {selectedProduct && (
            <div className="inv-stock-hint mono">
              <span>Stock actual: <strong>{selectedProduct.stock}</strong></span>
              {resultingStock !== null && !Number.isNaN(resultingStock) && (
                <span className={resultingStock < 0 ? 'inv-stock-neg' : ''}>
                  despuÃ©s: <strong>{resultingStock}</strong>
                </span>
              )}
            </div>
          )}
          <label className="inv-field">
            <span>Cantidad (+o âˆ’)</span>
            <input
              type="number"
              value={form.delta}
              onChange={(e) => setForm((f) => ({ ...f, delta: e.target.value }))}
              placeholder="Ej. 5 suma, -3 resta"
              required
            />
          </label>
          <label className="inv-field">
            <span>Motivo</span>
            <input
              type="text"
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              placeholder="Ej. Se encontrÃ³ mercaderÃ­a en depÃ³sito"
              required
            />
          </label>
          <button type="submit" className="primary-btn" disabled={saving || !canManage}>
            {saving ? 'Aplicandoâ€¦' : 'Aplicar ajuste'}
          </button>
        </form>

        <div className="inv-panel">
          <h2>Ãšltimos ajustes</h2>
          <div className="inv-mov-list">
            {movements.items.length === 0 && <p className="inv-empty">TodavÃ­a no hay ajustes.</p>}
            {movements.items.slice(0, 10).map((m) => (
              <div key={m.id} className="inv-mov-item">
                <div className="inv-mov-top">
                  <strong>{m.productName}</strong>
                  <span className={`mv-delta ${m.delta >= 0 ? 'up' : 'down'}`}>
                    {m.delta >= 0 ? `+${m.delta}` : m.delta}
                  </span>
                </div>
                <div className="inv-mov-sub">
                  <span>{m.reason || 'â€”'}</span>
                  <em>{shortDate(m.createdAt)}</em>
                </div>
                <div className="inv-mov-stock mono">{m.stockBefore} â†’ {m.stockAfter}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}


function MinStockScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [drafts, setDrafts] = useState({})
  const [savingId, setSavingId] = useState(null)
  const [note, setNote] = useState('')
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [params, setParams] = useState({ page: 1, q: '', category: '', brand: '' })

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCats(res.categories || [])
      })
      .catch((err) => console.warn('No se pudieron cargar las categorÃ­as', err))
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrands(res.brands || [])
      })
      .catch((err) => console.warn('No se pudieron cargar las marcas', err))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '50' })
    if (params.q) qs.set('q', params.q)
    if (params.category) qs.set('category', params.category)
    if (params.brand) qs.set('brand', params.brand)
    apiGet(`/api/admin/inventory/stock?${qs}`)
      .then((res) => {
        if (!alive) return
        setData(res)
        setDrafts((prev) => {
          const next = { ...prev }
          for (const p of res.items) {
            if (next[p.id] === undefined) next[p.id] = String(p.minStock)
          }
          return next
        })
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [version, params])

  const saveMin = async (product) => {
    setSavingId(product.id)
    setNote('')
    try {
      const res = await apiPut('/api/admin/inventory/min-stock', {
        productId: product.id,
        minStock: Number(drafts[product.id]),
      })
      setNote(`MÃ­nimo guardado: "${product.name}" â‰¥ ${res.minStock}`)
      setVersion((v) => v + 1)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSavingId(null)
    }
  }

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const onCategory = (value) =>
    setParams((prev) => ({ ...prev, category: value, page: 1 }))

  const onBrand = (value) =>
    setParams((prev) => ({ ...prev, brand: value, page: 1 }))

  if (!data && !error) return <ScreenLoading label="Leyendo los mÃ­nimosâ€¦" />
  if (error) return <ScreenBlocked message={error} />

  const lowCount = data.items.filter((p) => p.status !== 'ok').length

  const minUntouched = (product) =>
    String(drafts[product.id] ?? String(product.minStock)) === String(product.minStock)

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Stock mÃ­nimo</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{lowCount}</strong>
          <em>productos bajo el mÃ­nimo</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}
      {!canManage && (
        <p className="sale-note">Solo el administrador puede cambiar los mÃ­nimos.</p>
      )}

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BuscÃ¡ producto, marca o categorÃ­aâ€¦"
            aria-label="Buscar en stock mÃ­nimo"
          />
        </form>
        <div className="dash-filters">
          <SearchSelect
            id="stock-category-filter"
            label="CategorÃ­a"
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
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
      </div>

      <div className="table-wrap">
        <table className="dash-table">
          <thead>
            <tr>
              <th>Producto</th>
              <th>Stock</th>
              <th>MÃ­nimo</th>
              {canManage && <th>Guardar</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((p) => (
              <tr key={p.id} className={p.status !== 'ok' ? 'inv-alert-row' : ''}>
                <td>
                  <span className="t-cell-name">
                    <strong>{p.name}</strong>
                    <em>{p.brand}</em>
                  </span>
                </td>
                <td>
                  <span className="stock-cell">
                    <strong className="mono">{p.stock}</strong>
                    <StockBadge status={p.status} />
                  </span>
                </td>
                <td>
                  {canManage ? (
                    <input
                      className="inv-min-input mono"
                      type="number"
                      min="0"
                      value={drafts[p.id] ?? String(p.minStock)}
                      onChange={(e) => setDrafts((d) => ({ ...d, [p.id]: e.target.value }))}
                      aria-label={`MÃ­nimo de ${p.name}`}
                    />
                  ) : (
                    <span className="mono">{p.minStock}</span>
                  )}
                </td>
                {canManage && (
                  <td>
                    <button
                      type="button"
                      className={`min-save-btn${savingId === p.id ? ' saving' : ''}`}
                      disabled={savingId === p.id || minUntouched(p)}
                      onClick={() => saveMin(p)}
                    >
                      {savingId === p.id ? <span className="min-save-spin" /> : <IconCheck />}
                      {savingId === p.id ? 'Guardando' : 'Guardar'}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {data.items.length === 0 && <EmptyNote text="No hay productos para configurar." />}
      </div>

      {data.total > data.pageSize && (
        <div className="dash-pager">
          <button
            type="button"
            disabled={data.page <= 1}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
          >
            â† Anterior
          </button>
          <span className="mono">
            pÃ¡gina {data.page} de {data.totalPages}
          </span>
          <button
            type="button"
            disabled={data.page >= data.totalPages}
            onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
          >
            Siguiente â†’
          </button>
        </div>
      )}
    </div>
  )
}


function PurchasesScreen({ canManage }) {
  const [products, setProducts] = useState([])
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [params, setParams] = useState({ q: '', page: 1 })
  const [version, setVersion] = useState(0)
  const [form, setForm] = useState({
    supplier: '',
    invoice: '',
    lines: [{ productId: '', quantity: '1', cost: '' }],
  })
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/products?limit=100')
      .then((res) => {
        if (alive) setProducts(res.items || [])
      })
      .catch((err) => console.warn('No se pudieron cargar los productos para compras', err))
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
    apiGet(`/api/admin/inventory/purchases?${paramsString}`)
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

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const updateLine = (index, field, value) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((line, i) => (i === index ? { ...line, [field]: value } : line)),
    }))
  }

  const addLine = () => {
    setForm((f) => ({ ...f, lines: [...f.lines, { productId: '', quantity: '1', cost: '' }] }))
  }

  const removeLine = (index) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.length > 1 ? f.lines.filter((_, i) => i !== index) : f.lines,
    }))
  }

  const submitPurchase = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    try {
      const items = form.lines
        .map((l) => ({
          productId: Number(l.productId),
          quantity: Math.floor(Number(l.quantity)),
          cost: Number(l.cost),
        }))
        .filter((l) => Number.isFinite(l.productId) && l.quantity > 0 && Number.isFinite(l.cost) && l.cost >= 0)
      if (items.length === 0) {
        setNote('ElegÃ­ un producto y cargÃ¡ cantidad y costo.')
        setSaving(false)
        return
      }
      const res = await apiPost('/api/admin/inventory/purchases', {
        supplier: form.supplier.trim(),
        invoice: form.invoice.trim(),
        items,
      })
      setNote(`Compra #${res.purchase.number} registrada â€” total ${formatARS(res.purchase.total)}. Stock actualizado.`)
      setForm({
        supplier: '',
        invoice: '',
        lines: [{ productId: '', quantity: '1', cost: '' }],
      })
      setVersion((v) => v + 1)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  if (!data && !error) return <ScreenLoading label="Preparando comprasâ€¦" />
  if (error) return <ScreenBlocked message={error} />

  const lineTotal = (line) => (Number(line.quantity) || 0) * (Number(line.cost) || 0)
  const purchaseTotal = form.lines.reduce((sum, line) => sum + lineTotal(line), 0)

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Compras a proveedores</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>compras registradas</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}
      {!canManage && (
        <p className="sale-note">Solo el superadmin puede cargar compras.</p>
      )}

      <div className="inv-grid">
        <form className="inv-panel" onSubmit={submitPurchase}>
          <h2>Nueva compra</h2>
          <label className="inv-field">
            <span>Proveedor</span>
            <input
              type="text"
              value={form.supplier}
              onChange={(e) => setForm((f) => ({ ...f, supplier: e.target.value }))}
              placeholder="Ej. Full Hogar - Distribuidora"
              required
            />
          </label>
          <label className="inv-field">
            <span>NÂº factura / remito</span>
            <input
              type="text"
              value={form.invoice}
              onChange={(e) => setForm((f) => ({ ...f, invoice: e.target.value }))}
              placeholder="Opcional"
            />
          </label>

          <div className="pur-lines">
            {form.lines.map((line, index) => (
              <div key={index} className="pur-line">
                <div className="pur-line-top">
                  <label className="pur-line-field pur-line-product">
                    <span>Producto</span>
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(index, 'productId', e.target.value)}
                      required
                    >
                      <option value="">ElegÃ­â€¦</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} Â· {p.brand} (stock {p.stock})
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    className="pur-line-remove"
                    aria-label="Quitar lÃ­nea"
                    onClick={() => removeLine(index)}
                    disabled={form.lines.length <= 1}
                  >
                    <IconCross />
                  </button>
                </div>
                <div className="pur-line-bottom">
                  <label className="pur-line-field">
                    <span>Cant.</span>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    />
                  </label>
                  <label className="pur-line-field">
                    <span>Costo/u</span>
                    <input
                      type="number"
                      min="0"
                      value={line.cost}
                      onChange={(e) => updateLine(index, 'cost', e.target.value)}
                      placeholder="0"
                    />
                  </label>
                  <div className="pur-line-total mono">{formatARS(lineTotal(line))}</div>
                </div>
              </div>
            ))}
          </div>

          <button type="button" className="ghost-btn pur-add" onClick={addLine}>
            <IconPlus /> Agregar producto
          </button>

          <div className="pur-total">
            <span>Total de la compra</span>
            <strong className="mono">{formatARS(purchaseTotal)}</strong>
          </div>

          <button type="submit" className="primary-btn" disabled={saving || !canManage}>
            {saving ? 'Guardandoâ€¦' : 'Registrar compra'}
          </button>
        </form>

        <div className="inv-panel">
          <h2>Ãšltimas compras</h2>
          <div className="dash-toolbar inv-toolbar">
            <form className="dash-search" role="search" onSubmit={submitSearch}>
              <IconSearch />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="BuscÃ¡ por proveedorâ€¦"
                aria-label="Buscar compras"
              />
            </form>
          </div>
          {data.items.length === 0 && <p className="inv-empty">TodavÃ­a no hay compras.</p>}
          <div className="inv-mov-list">
            {data.items.map((p) => (
              <div key={p.id} className="inv-mov-item">
                <div className="inv-mov-top">
                  <strong>
                    #{p.number} Â· {p.supplier}
                  </strong>
                  <span className="mono pur-item-total">{formatARS(p.total)}</span>
                </div>
                <div className="inv-mov-sub">
                  <span>{itemsSummary(p.items)}</span>
                  <em>{shortDate(p.createdAt)}</em>
                </div>
                {p.invoice && <div className="inv-mov-stock">Fact. {p.invoice}</div>}
              </div>
            ))}
          </div>
          {data.total > data.pageSize && (
            <div className="dash-pager">
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                â† Anterior
              </button>
              <span className="mono">
                pÃ¡gina {data.page} de {data.totalPages}
              </span>
              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Siguiente â†’
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


function PhysicalInventoryScreen({ canManage }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [counts, setCounts] = useState({})
  const [note, setNote] = useState('')
  const [result, setResult] = useState(null)
  const [saving, setSaving] = useState(false)
  const [version, setVersion] = useState(0)
  const [query, setQuery] = useState('')
  const [cats, setCats] = useState([])
  const [brands, setBrands] = useState([])
  const [params, setParams] = useState({ page: 1, q: '', category: '', brand: '' })

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCats(res.categories || [])
      })
      .catch((err) => console.warn('No se pudieron cargar las categorÃ­as', err))
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrands(res.brands || [])
      })
      .catch((err) => console.warn('No se pudieron cargar las marcas', err))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const qs = new URLSearchParams({ page: String(params.page), limit: '50' })
    if (params.q) qs.set('q', params.q)
    if (params.category) qs.set('category', params.category)
    if (params.brand) qs.set('brand', params.brand)
    apiGet(`/api/admin/inventory/stock?${qs}`)
      .then((res) => {
        if (!alive) return
        setData(res)
        setCounts((prev) => {
          const next = { ...prev }
          for (const p of res.items) {
            if (next[p.id] === undefined) next[p.id] = String(p.stock)
          }
          return next
        })
      })
      .catch((err) => {
        if (alive) setError(err.message)
      })
    return () => {
      alive = false
    }
  }, [version, params])

  const submitCount = async (e) => {
    e.preventDefault()
    setSaving(true)
    setNote('')
    setResult(null)
    try {
      const countsBody = (data.items || [])
        .map((p) => ({ productId: p.id, units: Number(counts[p.id]) }))
        .filter((row) => Number.isFinite(row.units) && row.units >= 0)
      if (countsBody.length === 0) {
        setNote('CargÃ¡ al menos un conteo.')
        setSaving(false)
        return
      }
      const res = await apiPost('/api/admin/inventory/physical', { counts: countsBody })
      setResult(res)
      setNote(`Inventario guardado: ${res.updated} producto${res.updated === 1 ? '' : 's'} actualizado${res.updated === 1 ? '' : 's'}.`)
      setVersion((v) => v + 1)
    } catch (err) {
      setNote(err.message)
    } finally {
      setSaving(false)
    }
  }

  const submitSearch = (e) => {
    e.preventDefault()
    setParams((prev) => ({ ...prev, q: query.trim(), page: 1 }))
  }

  const onCategory = (value) =>
    setParams((prev) => ({ ...prev, category: value, page: 1 }))

  const onBrand = (value) =>
    setParams((prev) => ({ ...prev, brand: value, page: 1 }))

  if (!data && !error) return <ScreenLoading label="Preparando el conteoâ€¦" />
  if (error) return <ScreenBlocked message={error} />

  const diffFor = (product) => {
    const counted = Number(counts[product.id])
    return Number.isFinite(counted) ? counted - product.stock : 0
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Inventario</span>
          <h1>Inventario fÃ­sico</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{data.total}</strong>
          <em>productos por contar</em>
        </div>
      </header>

      {note && <p className="sale-note">{note}</p>}
      {!canManage && (
        <p className="sale-note">Solo el administrador puede guardar el conteo.
        </p>
      )}

      <div className="dash-toolbar">
        <form className="dash-search" role="search" onSubmit={submitSearch}>
          <IconSearch />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="BuscÃ¡ producto, marca o categorÃ­aâ€¦"
            aria-label="Buscar en inventario fÃ­sico"
          />
        </form>
        <div className="dash-filters">
          <SearchSelect
            id="stock-category-filter"
            label="CategorÃ­a"
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
        </div>
        <span className="count-tag mono">
          {data.items.length} de {data.total}
        </span>
      </div>

      <form onSubmit={submitCount}>
        <div className="table-wrap">
          <table className="dash-table">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Stock actual</th>
                <th>Conteo fÃ­sico</th>
                <th>Diferencia</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((p) => {
                const diff = diffFor(p)
                return (
                  <tr key={p.id} className={diff !== 0 ? 'inv-alert-row' : ''}>
                    <td>
                      <span className="t-cell-name">
                        <strong>{p.name}</strong>
                        <em>{p.brand || ''}</em>
                      </span>
                    </td>
                    <td className="mono t-num">{p.stock}</td>
                    <td>
                      <input
                        className="inv-count-input mono"
                        type="number"
                        min="0"
                        value={counts[p.id] ?? ''}
                        onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))}
                        aria-label={`Conteo de ${p.name}`}
                      />
                    </td>
                    <td>
                      <span className={`mv-delta ${diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'}`}>
                        {diff > 0 ? `+${diff}` : diff}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {data.items.length === 0 && <EmptyNote text="No hay productos para contar." />}
        </div>

        {result && (
          <div className="inv-result">
            <h3>Resultado del conteo</h3>
            <ul>
              {result.results.map((r) =>
                r.status === 'igual' ? null : (
                  <li key={r.productId}>
                    <span>{r.name}</span>
                    <em className="mono">
                      era {r.stockBefore} â†’ {r.units} ({r.delta > 0 ? `+${r.delta}` : r.delta})
                    </em>
                  </li>
                ),
              )}
            </ul>
            {result.updated === 0 && <p className="inv-empty">Todo cuadrÃ³: el conteo coincide con el stock.</p>}
          </div>
        )}

        <div className="inv-submit">
          <button type="submit" className="primary-btn" disabled={saving || !canManage}>
            {saving ? 'Guardandoâ€¦' : 'Guardar inventario fÃ­sico'}
          </button>
          {data.total > data.pageSize && (
            <div className="dash-pager" style={{ marginTop: 0 }}>
              <button
                type="button"
                disabled={data.page <= 1}
                onClick={() => setParams((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                â† Anterior
              </button>
              <span className="mono">
                pÃ¡gina {data.page} de {data.totalPages}
              </span>
              <button
                type="button"
                disabled={data.page >= data.totalPages}
                onClick={() => setParams((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Siguiente â†’
              </button>
            </div>
          )}
        </div>
      </form>
    </div>
  )
}


export { StockScreen, MovementsScreen, AdjustmentsScreen, MinStockScreen, PurchasesScreen, PhysicalInventoryScreen }