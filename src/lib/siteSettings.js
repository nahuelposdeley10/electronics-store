import { useEffect, useState } from 'react'
import { getTenantHeaders, getTenantSlug } from './tenant.js'
import { normalizeAppearance } from './appearance.js'

import { GAMING_DEFAULTS } from './gaming.js'

const FALLBACK = {
  gaming: GAMING_DEFAULTS,
  store: {
    name: 'TechStore',
    tagline: 'galería de tecnología',
    phone: '11 5555 4294',
    whatsapp: '5491155554294',
    instagram: null,
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
    headerCounters: [
      { title: 'Cuotas', text: 'hasta 12 sin interés' },
      { title: 'Envío', text: 'a domicilio' },
      { title: 'Garantía', text: 'oficial' },
      { title: 'Retiro', text: 'en el local' },
    ],
  },
  payments: {
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
}

const cache = new Map()
const requests = new Map()
const SETTINGS_REFRESH_KEY = 'ts-site-settings-refresh'

export function notifySiteSettingsChanged() {
  try {
    window.localStorage.setItem(SETTINGS_REFRESH_KEY, String(Date.now()))
  } catch {
    // La tienda igualmente vuelve a consultar al recuperar el foco.
  }
}

export function fetchSiteSettings({ fresh = false } = {}) {
  const key = getTenantSlug() || 'global'
  if (!fresh && cache.has(key)) return Promise.resolve(cache.get(key))
  if (!requests.has(key)) {
    const request = fetch('/api/settings/public', { headers: getTenantHeaders(), cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('settings'))))
      .then((data) => {
        cache.set(key, data)
        return data
      })
      .catch((err) => {
        throw err
      })
      .finally(() => requests.delete(key))
    requests.set(key, request)
  }
  return requests.get(key)
}

export function useSiteSettings() {
  const key = getTenantSlug() || 'global'
  const [settings, setSettings] = useState(() => cache.get(key) || null)

  useEffect(() => {
    let alive = true
    const refresh = (fresh = false) => fetchSiteSettings({ fresh })
      .then((data) => {
        if (alive) setSettings(data)
      })
      .catch((err) => console.warn('No se pudieron cargar los ajustes del sitio', err))
    refresh(true)
    const onFocus = () => { refresh(true) }
    const onStorage = (event) => {
      if (event.key === SETTINGS_REFRESH_KEY) refresh(true)
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('storage', onStorage)
    return () => {
      alive = false
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('storage', onStorage)
    }
  }, [key])

  return settings
}

export function mergeSettings(override) {
  const gaming = { ...GAMING_DEFAULTS, ...(override?.gaming || {}) }
  if (!String(gaming.imageUrl || '').trim() || gaming.imageUrl === 'null') {
    gaming.imageUrl = GAMING_DEFAULTS.imageUrl
    gaming.imageAlt = GAMING_DEFAULTS.imageAlt
  }
  return {
    appearance: normalizeAppearance(override?.appearance),
    gaming,
    store: { ...FALLBACK.store, ...(override?.store || {}) },
    shipping: { ...FALLBACK.shipping, ...(override?.shipping || {}) },
    hero: { ...FALLBACK.hero, ...(override?.hero || {}) },
    general: { ...FALLBACK.general, ...(override?.general || {}) },
    payments: { ...FALLBACK.payments, ...(override?.payments || {}) },
  }
}
