import { useEffect, useState } from 'react'
import { formatARS } from '@/data/format'
import SearchSelect from '@/components/SearchSelect'
import { apiGet, apiPost } from '@/lib/api'
import { IconCheck, IconMinus, IconPlus, IconSearch, IconTrash } from '@/components/Icons'
import { shortId } from '../../consts.js'
import { EmptyNote } from '../common'

import './styles.css'

function PosScreen({ canManage }) {
  const [products, setProducts] = useState([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [catOptions, setCatOptions] = useState([])
  const [brandOptions, setBrandOptions] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [lines, setLines] = useState([])
  const [discount, setDiscount] = useState('')
  const [customer, setCustomer] = useState('')
  const [payment, setPayment] = useState('efectivo')
  const [saving, setSaving] = useState(false)
  const [note, setNote] = useState('')
  const [lastSale, setLastSale] = useState(null)

  useEffect(() => {
    let alive = true
    apiGet('/api/categories')
      .then((res) => {
        if (alive) setCatOptions(res.categories || [])
      })
      .catch((err) => console.warn('No se pudieron cargar las categorías', err))
    apiGet('/api/brands')
      .then((res) => {
        if (alive) setBrandOptions(res.brands || [])
      })
      .catch((err) => console.warn('No se pudieron cargar las marcas', err))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    const params = new URLSearchParams({ limit: 20, page })
    if (query.trim()) params.set('q', query.trim())
    if (category) params.set('category', category)
    if (brand) params.set('brand', brand)
    apiGet(`/api/admin/products?${params.toString()}`)
      .then((res) => {
        if (!alive) return
        setProducts(res.items || [])
        setTotalPages(res.totalPages || 1)
        setTotalItems(res.total || 0)
      })
      .catch((err) => {
        if (alive) setNote(err.message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [query, category, brand, page])

  const onQuery = (e) => {
    setQuery(e.target.value)
    setPage(1)
  }

  const onCategory = (value) => {
    setCategory(value)
    setPage(1)
  }

  const onBrand = (value) => {
    setBrand(value)
    setPage(1)
  }

  const add = (product) => {
    if (product.stock <= 0) return
    setLines((prev) => {
      const existing = prev.find((l) => l.product.id === product.id)
      if (existing) {
        if (existing.quantity >= product.stock) return prev
        return prev.map((l) => (l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l))
      }
      return [...prev, { product, quantity: 1 }]
    })
  }

  const changeQty = (id, delta) => {
    setLines((prev) =>
      prev.flatMap((l) => {
        if (l.product.id !== id) return [l]
        const next = l.quantity + delta
        if (next <= 0) return []
        if (next > l.product.stock) return [l]
        return [{ ...l, quantity: next }]
      }),
    )
  }

  const removeLine = (id) => setLines((prev) => prev.filter((l) => l.product.id !== id))

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
  const discountNum = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
  const total = subtotal - discountNum

  const checkout = () => {
    if (lines.length === 0 || saving) return
    setSaving(true)
    setNote('')
    apiPost('/api/admin/pos', {
      items: lines.map((l) => ({ id: l.product.id, quantity: l.quantity })),
      discount: discountNum,
      customer: customer.trim() ? { name: customer.trim() } : {},
      payment,
    })
      .then((sale) => {
        setProducts((list) =>
          list.map((p) => {
            const line = lines.find((l) => l.product.id === p.id)
            return line ? { ...p, stock: p.stock - line.quantity } : p
          }),
        )
        setLastSale(sale)
        setLines([])
        setDiscount('')
        setCustomer('')
      })
      .catch((err) => setNote(err.message))
      .finally(() => setSaving(false))
  }

  return (
    <div className="dash-screen">
      <header className="dash-head">
        <div>
          <span className="dash-eyebrow">Caja · mostrador</span>
          <h1>Nueva venta / POS</h1>
        </div>
        <div className="dash-head-today">
          <strong className="mono">{lines.length}</strong>
          <em>líneas</em>
        </div>
      </header>

      {lastSale && (
        <p className="sale-note sale-note-ok">
          <IconCheck /> Venta #{shortId(lastSale.id)} registrada por {formatARS(lastSale.total)} — {lastSale.payment}
        </p>
      )}
      {note && <p className="sale-note">{note}</p>}

      <div className="pos-layout">
        <section className="pos-catalog">
          <div className="dash-search pos-search">
            <IconSearch />
            <input
              type="text"
              value={query}
              onChange={onQuery}
              placeholder="Buscá en el catálogo…"
              aria-label="Buscar productos"
            />
          </div>
          <div className="pos-filters">
            <SearchSelect
              id="pos-category-filter"
              label="Categoría"
              value={category}
              onChange={onCategory}
              options={catOptions.map((c) => ({ value: c.key, label: c.name }))}
            />
            <SearchSelect
              id="pos-brand-filter"
              label="Marca"
              value={brand}
              onChange={onBrand}
              options={brandOptions.map((b) => ({ value: b, label: b }))}
            />
            <span className="dash-count mono">{totalItems} productos</span>
          </div>
          <div className="pos-list">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className="pos-item"
                disabled={!canManage || p.stock <= 0}
                onClick={() => add(p)}
              >
                <img className="prod-thumb" src={p.image} alt="" loading="lazy" />
                <span className="pos-item-meta">
                  <strong>{p.name}</strong>
                  <em>{p.brand}</em>
                </span>
                <span className="pos-item-price mono">{formatARS(p.price)}</span>
                <span className={`pos-item-stock mono${p.stock <= 0 ? ' out' : ''}`}>
                  {p.stock <= 0 ? 'agotado' : `${p.stock} u.`}
                </span>
                <IconPlus />
              </button>
            ))}
            {loading && products.length === 0 && <EmptyNote text="Cargando productos…" />}
            {!loading && products.length === 0 && <EmptyNote text="Sin productos para esos filtros." />}
          </div>
          {totalPages > 1 && (
            <div className="dash-pager">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((n) => n - 1)}
              >
                ← Anterior
              </button>
              <span className="mono">
                página {page} de {totalPages}
              </span>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((n) => n + 1)}
              >
                Siguiente →
              </button>
            </div>
          )}
        </section>

        <section className="pos-ticket">
          <h2 className="ticket-title">Ticket</h2>
          <ul className="ticket-lines">
            {lines.map((l) => (
              <li key={l.product.id} className="ticket-line">
                <span className="ticket-name">
                  <strong>{l.product.name}</strong>
                  <em>{formatARS(l.product.price)} c/u</em>
                </span>
                <span className="qty-controls">
                  <button type="button" onClick={() => changeQty(l.product.id, -1)} aria-label="Quitar uno">
                    <IconMinus />
                  </button>
                  <span className="mono">{l.quantity}</span>
                  <button type="button" onClick={() => changeQty(l.product.id, 1)} aria-label="Sumar uno">
                    <IconPlus />
                  </button>
                </span>
                <span className="ticket-line-total mono">{formatARS(l.product.price * l.quantity)}</span>
                <button type="button" className="row-btn row-btn-danger" onClick={() => removeLine(l.product.id)} aria-label="Quitar línea">
                  <IconTrash />
                </button>
              </li>
            ))}
            {lines.length === 0 && <li className="ticket-empty mono">El ticket está vacío</li>}
          </ul>

          <div className="ticket-totals">
            <div className="ticket-row">
              <span>Subtotal</span>
              <strong className="mono">{formatARS(subtotal)}</strong>
            </div>
            <div className="ticket-row">
              <span>Descuento</span>
              <input
                className="price-input mono"
                type="number"
                min="0"
                step="1"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                aria-label="Descuento"
                placeholder="$ 0"
              />
            </div>
            <div className="ticket-row total">
              <span>Total</span>
              <strong className="mono">{formatARS(total)}</strong>
            </div>
          </div>

          <div className="pay-box">
            <label className="pf-field">
              <span>Cliente (opcional)</span>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Nombre del cliente"
              />
            </label>
            <label className="pf-field">
              <span>Pago</span>
              <select value={payment} onChange={(e) => setPayment(e.target.value)}>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </label>
            <button
              type="button"
              className="primary-btn pay-btn"
              disabled={!canManage || lines.length === 0 || saving}
              onClick={checkout}
            >
              {saving ? 'Cobrando…' : `Cobrar ${formatARS(total)}`}
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}


export { PosScreen }