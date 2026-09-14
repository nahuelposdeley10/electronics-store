import mongoose from 'mongoose'
import { Setting } from '../models/Setting.js'

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
      cost: 5999,
      freeThreshold: 300000,
      label: 'Envío a domicilio',
    },
    checkout: {
      statementDescriptor: 'TechStore',
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
      methods: {
        efectivo: true,
        tarjeta: true,
        transferencia: true,
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
  const hydrated = hydrate(raw)
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

  await Setting.updateOne(
    { key: 'base', ...filter },
    { key: 'base', ...filter, value: merged },
    { upsert: true },
  )
  const key = cacheKey(tenant)
  cache.set(key, merged)
  cacheAt.set(key, Date.now())
  return merged
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