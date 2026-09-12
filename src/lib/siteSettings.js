import { useEffect, useState } from 'react'

const FALLBACK = {
  store: {
    name: 'TechStore',
    tagline: 'galería de tecnología',
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
}

let cached = null
let inflight = null

export function fetchSiteSettings() {
  if (cached) return Promise.resolve(cached)
  if (!inflight) {
    inflight = fetch('/api/settings/public')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('settings'))))
      .then((data) => {
        cached = data
        inflight = null
        return cached
      })
      .catch((err) => {
        inflight = null
        throw err
      })
  }
  return inflight
}

export function useSiteSettings() {
  const [settings, setSettings] = useState(cached)

  useEffect(() => {
    let alive = true
    fetchSiteSettings()
      .then((data) => {
        if (alive) setSettings(data)
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  return settings
}

export function mergeSettings(override) {
  return {
    store: { ...FALLBACK.store, ...(override?.store || {}) },
    shipping: { ...FALLBACK.shipping, ...(override?.shipping || {}) },
    general: { ...FALLBACK.general, ...(override?.general || {}) },
  }
}