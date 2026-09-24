import { useEffect, useState } from 'react'
import { formatARS } from '@/data/format'
import SearchSelect from '@/components/SearchSelect'
import { apiGet, apiPost } from '@/lib/api'
import { productImage } from '@/lib/productImage'
import { IconCheck, IconMinus, IconPlus, IconSearch, IconTrash } from '@/components/Icons'
import { shortId } from '../../consts.js'
import { stockStatusOf } from '../../consts.js'
import { EmptyNote, StockValue } from '../common'
import { loadCatalogOptions } from '../common/catalogOptions.js'
import { useToast } from '@/context/useToast'
import { useConfirm } from '@/context/useConfirm'

import './styles.css'

function PosScreen({ canManage }) {
  const { showToast } = useToast()
  const { confirm } = useConfirm()
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
  const [cashReceived, setCashReceived] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSale, setLastSale] = useState(null)

  useEffect(() => {
    let alive = true
    loadCatalogOptions()
      .then(({ categories, brands }) => {
        if (!alive) return
        setCatOptions(categories)
        setBrandOptions(brands)
      })
      .catch((err) => console.warn('No se pudieron cargar categorías o marcas', err))
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
        if (alive) showToast(err.message, 'error')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [query, category, brand, page, showToast])

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

  const removeLine = async (product) => {
    const id = product.id
    const ok = await confirm({
      title: 'Quitar del ticket',
      message: (
        <>
          ¿Quitar <strong>{product.name}</strong> del ticket?
        </>
      ),
      confirmLabel: 'Quitar',
    })
    if (ok) setLines((prev) => prev.filter((l) => l.product.id !== id))
  }

  const subtotal = lines.reduce((sum, l) => sum + l.product.price * l.quantity, 0)
  const discountNum = Math.min(Math.max(Number(discount) || 0, 0), subtotal)
  const total = subtotal - discountNum

  const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100

  const posPayment = payment === 'efectivo' || payment === 'tarjeta' || payment === 'transferencia' ? payment : 'efectivo'
  const isCashSale = posPayment === 'efectivo'

  const cashReceivedNum = isCashSale ? round2(Number(cashReceived) || 0) : null
  const validReceived = isCashSale && Number.isFinite(cashReceivedNum) && round2(cashReceivedNum) >= total
  const change = isCashSale && validReceived ? round2(cashReceivedNum - total) : 0

  const canPay =
    lines.length > 0 &&
    (isCashSale ? validReceived && !saving : !saving)

  const checkout = () => {
    if (lines.length === 0 || saving) return
    if (isCashSale && !validReceived) {
      showToast('El efectivo recibido no cubre el total', 'error')
      return
    }
    setSaving(true)
    apiPost('/api/admin/pos', {
      items: lines.map((l) => ({ id: l.product.id, quantity: l.quantity })),
      discount: discountNum,
      customer: customer.trim() ? { name: customer.trim() } : {},
      payment: posPayment,
      ...(isCashSale ? { cashReceived: cashReceivedNum } : {}),
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
        setCashReceived('')
      })
      .catch((err) => showToast(err.message, 'error'))
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
              options={[
                ...catOptions.map((c) => ({ value: c.key, label: c.name })),
                { value: ':none:', label: 'Sin categoría' },
              ]}
            />
            <SearchSelect
              id="pos-brand-filter"
              label="Marca"
              value={brand}
              onChange={onBrand}
              options={[
                ...brandOptions.map((b) => ({ value: b, label: b })),
                { value: ':none:', label: 'Sin marca' },
              ]}
            />
            <span className="dash-count mono">{totalItems} productos</span>
          </div>
          <div className="pos-list">
            {products.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`pos-item stock-item-${stockStatusOf(p.stock, p.minStock)}`}
                disabled={!canManage || p.stock <= 0}
                onClick={() => add(p)}
              >
                <img className="prod-thumb" src={productImage(p.image)} alt="" loading="lazy" />
                <span className="pos-item-meta">
                  <strong>{p.name}</strong>
                  <em>{p.brand}</em>
                </span>
                <span className="pos-item-price mono">{formatARS(p.price)}</span>
                <span className={`pos-item-stock${p.stock <= 0 ? ' out' : ''}`}>
                  {p.stock <= 0 ? 'agotado' : <StockValue stock={p.stock} min={p.minStock} />}
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
                <button type="button" className="row-btn row-btn-danger" onClick={() => removeLine(l.product)} aria-label="Quitar línea">
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
            {payment === 'efectivo' && (
              <>
                <label className="pf-field">
                  <span>Efectivo recibido</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={cashReceived}
                    onChange={(e) => setCashReceived(e.target.value)}
                    aria-label="Efectivo recibido"
                    placeholder="$ 0"
                  />
                </label>
                <div className="vuelto-row">
                  <span>Vuelto</span>
                  <strong className={`mono${validReceived ? '' : ' muted'}`}>{validReceived ? formatARS(change) : '—'}</strong>
                </div>
              </>
            )}
            <button
              type="button"
              className="primary-btn pay-btn"
              disabled={!canPay}
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