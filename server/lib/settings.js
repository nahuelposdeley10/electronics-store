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
}

export function defaults() {
  return {
    store: {
      name: 'TechStore',
      tagline: 'caja · Villa Urquiza',
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
      admin: [],
    },
  }
}

let cache = null
let cacheAt = 0
const CACHE_MS = 30 * 1000

async function seed() {
  const doc = await Setting.findOne({ key: 'base' }).lean()
  if (!doc) {
    await Setting.create({ key: 'base', value: defaults() })
    return defaults()
  }
  return doc.value
}

export async function getSettings({ fresh } = {}) {
  const now = Date.now()
  if (!fresh && cache && now - cacheAt < CACHE_MS) {
    return cache
  }
  const value = await seed()
  cache = value
  cacheAt = now
  return cache
}

export async function saveSettings({ section, value } = {}) {
  if (section && !Object.prototype.hasOwnProperty.call(defaults(), section)) {
    throw new Error(`Sección de configuración desconocida: ${section}`)
  }
  const current = await getSettings({ fresh: true })
  const merged = section ? { ...current, [section]: value } : { ...current, ...value }
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
  await Setting.updateOne({ key: 'base' }, { key: 'base', value: merged }, { upsert: true })
  cache = merged
  cacheAt = Date.now()
  return merged
}

export async function permissionsForRole(role) {
  if (role === 'superadmin') return [...ALL_PERMISSIONS]
  const settings = await getSettings()
  const list = settings.roles?.[role]
  return Array.isArray(list) ? list : []
}