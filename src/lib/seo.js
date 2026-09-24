import { homeUrl, productUrl, cartUrl, infoUrl } from './urls.js'
import { productImage } from './productImage.js'

const INFO_TITLES = {
  'como-comprar': 'Cómo comprar',
  'medios-de-pago': 'Medios de pago',
  envios: 'Envíos y retiro',
  garantia: 'Garantía',
  devoluciones: 'Devoluciones',
  contacto: 'Contacto',
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
  const name = settings?.store?.name || 'TechStore'
  const tagline = settings?.store?.tagline || 'electrónica y tecnología'
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
      noIndex: false,
    }
  }

  if (view.name === 'cart') {
    return {
      title: `Carrito — ${name}`,
      description: baseDescription,
      canonical: absolute(cartUrl()),
      siteName: name,
      noIndex: true,
    }
  }

  if (view.name === 'info') {
    return {
      title: `${INFO_TITLES[view.payload] || 'Información'} — ${name}`,
      description: baseDescription,
      canonical: absolute(infoUrl(view.payload)),
      siteName: name,
      noIndex: false,
    }
  }

  if (view.name === 'order-status') {
    return {
      title: `Estado del pedido — ${name}`,
      description: baseDescription,
      siteName: name,
      noIndex: true,
    }
  }

  return {
    title: `${name} — Electrónica y tecnología`,
    description: baseDescription,
    canonical: absolute(homeUrl()),
    siteName: name,
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
  if (content) el.setAttribute('content', content)
}

export function applySEO(meta) {
  if (!meta) return

  document.title = meta.title || document.title
  upsertMeta('name', 'description', meta.description || '')
  upsertMeta('name', 'robots', meta.noIndex ? 'noindex, follow' : 'index, follow')

  if (meta.canonical) {
    let link = document.head.querySelector('link[rel="canonical"]')
    if (!link) {
      link = document.createElement('link')
      link.rel = 'canonical'
      document.head.appendChild(link)
    }
    link.href = meta.canonical
    upsertMeta('property', 'og:url', meta.canonical)
  }

  upsertMeta('property', 'og:type', meta.type || 'website')
  upsertMeta('property', 'og:site_name', meta.siteName || 'TechStore')
  upsertMeta('property', 'og:title', meta.title || document.title)
  upsertMeta('property', 'og:description', meta.description || '')
  if (meta.image) upsertMeta('property', 'og:image', meta.image)

  upsertMeta('name', 'twitter:card', meta.image ? 'summary_large_image' : 'summary')
  upsertMeta('name', 'twitter:title', meta.title || document.title)
  upsertMeta('name', 'twitter:description', meta.description || '')
  if (meta.image) upsertMeta('name', 'twitter:image', meta.image)
}