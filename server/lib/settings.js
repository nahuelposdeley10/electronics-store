import mongoose from 'mongoose'
import { Setting } from '../models/Setting.js'
import { roundMoney } from './money.js'

export const ALL_PERMISSIONS = [
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

export const PERMISSION_LABELS = {
  'settings.manage': 'Configuración',
  'users.manage': 'Usuarios',
  'catalog.manage': 'Productos, categorías, marcas y precios',
  'coupons.manage': 'Cupones',
  'offers.manage': 'Ofertas',
  'inventory.write': 'Inventario (ajustes, compras, mínimo y físico)',
  'sales.return': 'Devoluciones',
  'quotes.delete': 'Eliminar presupuestos',
  'cash.manage': 'Caja (apertura, movimientos y arqueos)',
  'pos.manage': 'Nueva venta / POS',
}

export const OPERATOR_DEFAULT_PERMISSIONS = [
  'sales.return',
  'cash.manage',
  'pos.manage',
  'coupons.manage',
  'offers.manage',
  'inventory.write',
]

export function defaults() {
  return {
    store: {
      name: 'TechStore',
      tagline: 'caja · Villa Urquiza',
      logoUrl: null,
      coverUrl: null,
      phone: '11 5555 4294',
      whatsapp: '5491155554294',
      email: 'hola@tienda.com.ar',
      addressFull: 'Av. de los Incas 4050, Villa Urquiza, CABA',
      addressShort: 'Villa Urquiza, CABA',
      hours: 'Lun a Vie 10:00 - 19:00 · Sáb 10:00 - 14:00',
      band: 'Comprá online y retirá gratis en el local. Mismo día si pagás antes de las 15hs.',
    },
    shipping: {
      enabled: true,
      cost: 5999,
      freeThreshold: 300000,
      label: 'Envío a domicilio',
    },
    checkout: {
      statementDescriptor: 'TechStore',
    },
    hero: {
      title: 'Tecnología de galería.',
      titleAccent: 'Precio de mostrador.',
      lead: 'Notebooks, móviles, audio y gaming de marca oficial con envío a todo el país o retiro en el local, hasta {cuotas} cuotas sin interés y servicio técnico propio.',
    },
    general: {
      marquee: [
        'Envíos a todo el país',
        '3 cuotas sin interés',
        'Tienda física en Villa Urquiza',
        'Garantía oficial de 6 meses',
      ],
      installments: [
        { minPrice: 0, months: 3 },
        { minPrice: 50000, months: 6 },
        { minPrice: 100000, months: 12 },
      ],
    },
    payments: {
      online: true,
      methods: {
        efectivo: true,
        tarjeta: true,
        transferencia: true,
      },
      mercadopago: {
        accessToken: null,
        publicKey: null,
        webhookSecret: null,
      },
    },
    roles: {
      admin: [...ALL_PERMISSIONS],
      operator: [...OPERATOR_DEFAULT_PERMISSIONS],
    },
  }
}

function tenantFilter(tenant) {
  if (tenant && mongoose.Types.ObjectId.isValid(tenant)) {
    return { adminId: new mongoose.Types.ObjectId(tenant) }
  }
  return { adminId: null }
}

const cache = new Map()
const cacheAt = new Map()
const CACHE_MS = 30 * 1000

async function seed(tenant) {
  const filter = tenantFilter(tenant)
  const doc = await Setting.findOne({ key: 'base', ...filter }).lean()
  if (!doc) {
    await Setting.create({ key: 'base', ...filter, value: defaults() })
    return defaults()
  }
  return doc.value
}

function hydrate(raw) {
  const base = defaults()
  const out = {}
  for (const section of Object.keys(base)) {
    const stored = raw?.[section]
    out[section] =
      stored && typeof stored === 'object' && !Array.isArray(stored)
        ? { ...base[section], ...stored }
        : { ...base[section] }
  }
  return out
}

const STRING_CAP = 300
const LIST_CAP = 25

function capString(value) {
  return String(value ?? '').slice(0, STRING_CAP)
}

function nullableString(value) {
  if (value == null || String(value).trim() === '') return null
  return String(value).slice(0, STRING_CAP)
}

function toBool(value) {
  return value === true || value === 'true' || value === 1 || value === '1'
}

function toNum(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function sanitizeRoles(roles) {
  if (!roles || typeof roles !== 'object' || Array.isArray(roles)) {
    return { admin: [...ALL_PERMISSIONS], operator: [...OPERATOR_DEFAULT_PERMISSIONS] }
  }
  const out = {}
  for (const role of ['admin', 'operator']) {
    const list = Array.isArray(roles[role])
      ? roles[role]
      : role === 'operator'
        ? OPERATOR_DEFAULT_PERMISSIONS
        : ALL_PERMISSIONS
    out[role] = [...new Set(list.filter((p) => ALL_PERMISSIONS.includes(p)))]
  }
  return out
}

function sanitizeValue(fallback, value) {
  if (typeof fallback === 'string') return capString(value)
  if (typeof fallback === 'number') return Math.max(0, toNum(value, fallback))
  if (typeof fallback === 'boolean') return toBool(value)
  if (fallback === null) return nullableString(value)
  if (Array.isArray(fallback)) {
    if (!Array.isArray(value)) return []
    return value
      .map((item) => sanitizeValue(fallback[0], item))
      .filter((v) => v !== null && v !== undefined)
      .slice(0, LIST_CAP)
  }
  if (fallback && typeof fallback === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    const out = {}
    for (const [key, entryFallback] of Object.entries(fallback)) {
      if (key in value) out[key] = sanitizeValue(entryFallback, value[key])
    }
    return out
  }
  return value ?? null
}

// `value` es Mixed en el modelo: acá se valida la forma conocida, se
// descartan claves desconocidas y se acotan tipos y tamaños, para que
// objetos gigantes/arbitrarios nunca lleguen al público ni queden en DB.
function sanitizeSection(section, input) {
  const fallback = defaults()[section]
  if (section === 'roles') return sanitizeRoles(input)
  if (!fallback || typeof fallback !== 'object' || Array.isArray(fallback)) return {}
  const src = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const out = {}
  for (const [key, entryFallback] of Object.entries(fallback)) {
    if (key in src) out[key] = sanitizeValue(entryFallback, src[key])
  }
  return out
}

export function sanitizeSettings(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}
  const out = {}
  for (const section of Object.keys(defaults())) {
    out[section] = sanitizeSection(section, source[section])
  }
  return out
}

function cacheKey(tenant) {
  const id = tenant && mongoose.Types.ObjectId.isValid(tenant)
    ? tenant.toString()
    : null
  return id || 'global'
}

export async function getSettings({ fresh, tenant } = {}) {
  const key = cacheKey(tenant)
  const now = Date.now()
  if (!fresh && cache.has(key) && now - cacheAt.get(key) < CACHE_MS) {
    return cache.get(key)
  }
  const raw = await seed(tenant)
  const hydrated = sanitizeSettings(hydrate(raw))
  cache.set(key, hydrated)
  cacheAt.set(key, now)
  return hydrated
}

export async function saveSettings({ section, value, tenant } = {}) {
  if (section && !Object.prototype.hasOwnProperty.call(defaults(), section)) {
    throw new Error(`Sección de configuración desconocida: ${section}`)
  }
  const current = await getSettings({ fresh: true, tenant })
  const merged = section ? { ...current, [section]: value } : { ...current, ...value }

  if (merged.shipping) {
    if (merged.shipping.cost !== undefined) {
      merged.shipping.cost = roundMoney(Number(merged.shipping.cost))
    }
    if (merged.shipping.freeThreshold !== undefined) {
      merged.shipping.freeThreshold = roundMoney(Number(merged.shipping.freeThreshold))
    }
  }
  const filter = tenantFilter(tenant)

  if (merged.roles && Array.isArray(merged.roles.superadmin)) {
    merged.roles.superadmin = merged.roles.superadmin.filter((p) =>
      ALL_PERMISSIONS.includes(p),
    )
  }
  if (merged.roles && Array.isArray(merged.roles.admin)) {
    merged.roles.admin = merged.roles.admin.filter((p) =>
      ALL_PERMISSIONS.includes(p),
    )
  }
  if (merged.roles && Array.isArray(merged.roles.operator)) {
    merged.roles.operator = merged.roles.operator.filter((p) =>
      ALL_PERMISSIONS.includes(p),
    )
  }

  const normalized = sanitizeSettings(merged)

  await Setting.updateOne(
    { key: 'base', ...filter },
    { key: 'base', ...filter, value: normalized },
    { upsert: true },
  )
  const key = cacheKey(tenant)
  cache.set(key, normalized)
  cacheAt.set(key, Date.now())
  return normalized
}

export async function permissionsForRole(role, tenant) {
  if (role === 'superadmin') return [...ALL_PERMISSIONS]
  const settings = await getSettings({ tenant })
  const list = settings.roles?.[role]
  return Array.isArray(list) ? list : []
}

export async function permissionsForUser(user, tenant) {
  if (!user) return []
  if (user.role === 'superadmin') return [...ALL_PERMISSIONS]
  if (Array.isArray(user.permissions) && user.permissions.length) {
    return user.permissions.filter((p) => ALL_PERMISSIONS.includes(p))
  }
  return permissionsForRole(user.role, tenant)
}