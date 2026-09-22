import { IconCheck, IconClock, IconCross } from '@/components/Icons'

const STATUS_META = {
  approved: { label: 'Aprobada', Icon: IconCheck },
  pending: { label: 'Pendiente', Icon: IconClock },
  in_process: { label: 'En proceso', Icon: IconClock },
  rejected: { label: 'Rechazada', Icon: IconCross },
  cancelled: { label: 'Cancelada', Icon: IconCross },
  refunded: { label: 'Reembolsada', Icon: IconClock },
  charged_back: { label: 'Contracargo', Icon: IconCross },
}


const CATEGORY_LABELS = {
  audio: 'Audio',
  moviles: 'Móviles',
  computacion: 'Computación',
  wearables: 'Wearables',
  entretenimiento: 'Entretenimiento',
  perifericos: 'Periféricos',
  fotografia: 'Fotografía',
}

const PENDING_GROUP = new Set(['pending', 'in_process'])

function shortDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}


function shortId(id) {
  return String(id).slice(-6).toUpperCase()
}

function initials(name) {
  return String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

const CASH_KIND_LABELS = {
  venta: 'Venta',
  ingreso: 'Ingreso',
  egreso: 'Egreso',
  devolucion: 'Devolución',
}


const CASH_KIND_CHIPS = [
  { id: 'all', label: 'Todos' },
  { id: 'venta', label: 'Ventas' },
  { id: 'ingreso', label: 'Ingresos' },
  { id: 'egreso', label: 'Egresos' },
  { id: 'devolucion', label: 'Devoluciones' },
]

const PAYMENT_LABELS = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
}


const PAYMENT_OPTIONS = ['all', 'web', 'efectivo', 'tarjeta', 'transferencia']


function salePaymentLabel(order) {
  return (order.payment && PAYMENT_LABELS[order.payment]) || 'Web (MP)'
}


function fullDate(value) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(value))
}


function idDoc(order) {
  return [order.payer?.idType, order.payer?.idNumber].filter(Boolean).join(' ') || null
}


function itemsSummary(items) {
  const names = (items || []).map((item) => item.name)
  if (names.length === 0) return '—'
  if (names.length <= 2) return names.join(' · ')
  return `${names.slice(0, 2).join(' · ')} +${names.length - 2} más`
}


const QUOTE_STATUS_LABELS = { draft: 'Borrador', confirmed: 'Confirmado', cancelled: 'Cancelado' }


const MOVEMENT_TYPE_LABELS = {
  venta: 'Venta',
  compra: 'Compra',
  ajuste: 'Ajuste',
  devolucion: 'Devolución',
  inventario: 'Inventario físico',
}


const STOCK_STATUS_LABELS = {
  ok: 'OK',
  bajo: 'Bajo',
  justo: 'Mínimo',
  sin: 'Sin stock',
}


function stockStatusOf(stock, min) {
  const s = Number(stock) || 0
  const m = Number(min) || 0
  if (s <= 0) return 'sin'
  if (s < m) return 'bajo'
  if (s === m) return 'justo'
  return 'ok'
}


const MOVEMENT_CHIPS = [
  { id: '', label: 'Todos' },
  { id: 'venta', label: 'Ventas' },
  { id: 'compra', label: 'Compras' },
  { id: 'ajuste', label: 'Ajustes' },
  { id: 'devolucion', label: 'Devoluciones' },
  { id: 'inventario', label: 'Inventario físico' },
]


const CHART_COLORS = ['#d7261d', '#ffc61a', '#c79a63', '#c8dcf2', '#43473c', '#6f7366']

const CHART_TICK = { fill: '#6f7366', fontSize: 10 }

const CHART_GRID = { stroke: '#d7dcd6', strokeDasharray: '2 4' }

function compactARS(value) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(value >= 10000000 ? 0 : 1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}k`
  return `${value}`
}


function chartDayShort(date) {
  return `${date.slice(8, 10)}/${date.slice(5, 7)}`
}


const REPORT_PERIODS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
  { days: 365, label: '1 año' },
  { days: 0, label: 'Todo' },
]


function reportPaymentLabel(key) {
  if (key === 'unknown' || !key) return 'Web (MP)'
  return PAYMENT_LABELS[key] || key
}


const IMPORT_EXAMPLE = [
  {
    name: 'Parlante Bluetooth Boom',
    brand: 'Sony',
    category: 'audio',
    price: 75000,
    stock: 12,
    freeShipping: true,
    badge: 'Nuevo',
  },
  {
    name: 'Mouse Inalámbrico Lite',
    brand: 'Logitech',
    category: 'perifericos',
    price: 18990,
    oldPrice: 24990,
    stock: 40,
  },
]


const PERM_CODES = [
  'settings.manage',
  'users.manage',
  'catalog.manage',
  'coupons.manage',
  'offers.manage',
  'inventory.write',
  'sales.return',
  'quotes.delete',
  'cash.manage',
  'pos.manage',
]


const PERM_LABELS = {
  'settings.manage': 'Configuración del negocio',
  'users.manage': 'Usuarios del panel',
  'catalog.manage': 'Productos, categorías, marcas y precios',
  'coupons.manage': 'Cupones de descuento',
  'offers.manage': 'Ofertas de la semana',
  'inventory.write': 'Editar stock (ajustes, compras, mínimo y físico)',
  'sales.return': 'Devoluciones y reembolsos',
  'quotes.delete': 'Eliminar presupuestos',
  'cash.manage': 'Caja (apertura, movimientos y arqueos)',
  'pos.manage': 'Nueva venta / POS',
}


export { STATUS_META, CATEGORY_LABELS, PENDING_GROUP, shortDate, shortId, initials, CASH_KIND_LABELS, CASH_KIND_CHIPS, PAYMENT_LABELS, PAYMENT_OPTIONS, salePaymentLabel, fullDate, idDoc, itemsSummary, QUOTE_STATUS_LABELS, MOVEMENT_TYPE_LABELS, STOCK_STATUS_LABELS, stockStatusOf, MOVEMENT_CHIPS, CHART_COLORS, CHART_TICK, CHART_GRID, compactARS, chartDayShort, REPORT_PERIODS, reportPaymentLabel, IMPORT_EXAMPLE, PERM_CODES, PERM_LABELS }