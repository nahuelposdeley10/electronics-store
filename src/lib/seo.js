import { homeUrl, productUrl, infoUrl } from './urls.js'
import { productImage } from './productImage.js'
import { INDEX, NO_INDEX, shouldNoIndex } from './indexing.js'

const INFO_TITLES = {
  'como-comprar': 'Cómo comprar',
  'medios-de-pago': 'Medios de pago',
  envios: 'Envíos y retiro',
  garantia: 'Garantía',
  devoluciones: 'Devoluciones',
  contacto: 'Contacto',
  'politica-de-privacidad': 'Política de privacidad',
  'terminos-y-condiciones': 'Términos y condiciones',
  'politica-de-cookies': 'Política de cookies',
  'politica-de-reembolsos': 'Política de reembolsos',
}

function absolute(href) {
  if (!href) return null
  try {
    return new URL(href, window.location.origin).href
  } catch {
    return href
  }
}

export function seoMeta({ view, product, settings }) {
  if (view.name === 'dashboard' || view.name === 'account-activation') {
    const isActivation = view.name === 'account-activation'
    return {
      title: `${isActivation ? 'Activar cuenta' : 'Panel de administración'} — Tienda BNP`,
      description: isActivation ? 'Configurá el acceso a tu cuenta de Tienda BNP.' : 'Acceso al panel de administración de Tienda BNP.',
      siteName: 'Tienda BNP',
      noIndex: true,
    }
  }

  const name = settings?.store?.name || 'Tienda BNP'
  const tagline = settings?.store?.tagline || 'electrónica y tecnología'
  const icon = absolute(settings?.store?.logoUrl)
  const baseDescription =
    settings?.store?.band ||
    `Tienda online de ${name}: ${tagline}. Comprá con envío a todo el país o retirá en el local.`

  if (view.name === 'product' && product) {
    return {
      title: `${product.name} — ${name}`,
      description: product.description || `${product.name} de ${product.brand} en ${name}.`,
      canonical: absolute(productUrl(product.id)),
      image: absolute(productImage(product.image)),
      type: 'product',
      siteName: name,
      icon,
      noIndex: false,
    }
  }

  if (view.name === 'cart') {
    return {
      title: `Carrito — ${name}`,
      description: baseDescription,
      siteName: name,
      icon,
      noIndex: true,
    }
  }

  if (view.name === 'info') {
    return {
      title: `${INFO_TITLES[view.payload] || 'Información'} — ${name}`,
      description: baseDescription,
      canonical: absolute(infoUrl(view.payload)),
      siteName: name,
      icon,
      noIndex: false,
    }
  }

  if (view.name === 'order-status') {
    return {
      title: `Estado del pedido — ${name}`,
      description: baseDescription,
      siteName: name,
      icon,
      noIndex: true,
    }
  }

  return {
    title: `${name} — ${tagline}`,
    description: baseDescription,
    canonical: absolute(homeUrl()),
    siteName: name,
    icon,
    noIndex: false,
  }
}

function upsertMeta(attr, key, content) {
  const sel = `meta[${attr}="${key}"]`
  let el = document.head.querySelector(sel)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content || '')
}

function upsertStructuredData(data) {
  const selector = 'script[data-seo-jsonld="company"]'
  let script = document.head.querySelector(selector)
  if (!data) {
    script?.remove()
    return
  }
  if (!script) {
    script = document.createElement('script')
    script.type = 'application/ld+json'
    script.dataset.seoJsonld = 'company'
    document.head.appendChild(script)
  }
  script.textContent = JSON.stringify(data)
}

export function applyRobotsPolicy(noIndex = false) {
  const excluded = noIndex || shouldNoIndex(window.location.href)
  upsertMeta('name', 'robots', excluded ? NO_INDEX : INDEX)
  return excluded
}

export function applySEO(meta) {
  if (!meta) return

  document.title = meta.title || document.title
  let favicon = document.head.querySelector('link[rel="icon"]')
  if (!favicon) {
    favicon = document.createElement('link')
    favicon.rel = 'icon'
    favicon.type = 'image/png'
    document.head.appendChild(favicon)
  }
  favicon.href = meta.icon || '/images/brand/tienda-bnp-icon.png'
  upsertMeta('name', 'description', meta.description || '')
  const noIndex = applyRobotsPolicy(meta.noIndex)

  if (meta.canonical && !noIndex) {
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = meta.canonical
    upsertMeta('property', 'og:url', meta.canonical)
  } else {
    // Do not retain the previous public page's canonical on private SPA views.
    document.head.querySelector('link[rel="canonical"]')?.remove()
    document.head.querySelector('meta[property="og:url"]')?.remove()
  }

  upsertMeta('property', 'og:type', meta.type || 'website')
  upsertMeta('property', 'og:site_name', meta.siteName || 'Tienda BNP')
  upsertMeta('property', 'og:title', meta.title || document.title)
  upsertMeta('property', 'og:description', meta.description || '')
  upsertMeta('property', 'og:image', meta.image || '')

  upsertMeta('name', 'twitter:card', meta.image ? 'summary_large_image' : 'summary')
  upsertMeta('name', 'twitter:title', meta.title || document.title)
  upsertMeta('name', 'twitter:description', meta.description || '')
  upsertMeta('name', 'twitter:image', meta.image || '')
  upsertStructuredData(noIndex ? null : meta.structuredData)
}
