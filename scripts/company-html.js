import { companyMeta, companyUrl, companyImage, companyStructuredData } from '../src/views/CompanyHome/content.js'

export function isCompanyPath(url) {
  return /^\/(home|planes)\/?$/.test(new URL(url, 'http://localhost').pathname)
}

function escapeAttribute(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character])
}

export function companyHtml(template, { body, year }, styles = []) {
  const root = '<div id="root"></div>'
  if (!template.includes(root)) throw new Error('No se encontró la raíz vacía para prerenderizar /home.')
  // Only /home receives this canonical and JSON-LD; the SPA shell serves other routes.
  const metadata = [
    ['name', 'description', companyMeta.description],
    ['name', 'robots', 'index, follow'],
    ['property', 'og:title', companyMeta.title],
    ['property', 'og:description', companyMeta.description],
    ['property', 'og:type', 'website'],
    ['property', 'og:site_name', companyMeta.siteName],
    ['property', 'og:locale', 'es_AR'],
    ['property', 'og:url', companyUrl],
    ['property', 'og:image', companyImage],
    ['name', 'twitter:card', 'summary_large_image'],
    ['name', 'twitter:title', companyMeta.title],
    ['name', 'twitter:description', companyMeta.description],
    ['name', 'twitter:image', companyImage],
  ]
  let html = template.replace(/<title>[\s\S]*?<\/title>/i, '')
  for (const [attribute, key] of metadata) {
    html = html.replace(new RegExp(`<meta\\s+${attribute}="${key}"[^>]*>`, 'gi'), '')
  }
  const json = JSON.stringify(companyStructuredData()).replace(/</g, '\\u003c')
  const head = [
    `<title>${escapeAttribute(companyMeta.title)}</title>`,
    `<link rel="canonical" href="${companyUrl}" />`,
    ...metadata.map(([attribute, key, value]) => `<meta ${attribute}="${key}" content="${escapeAttribute(value)}" />`),
    `<script type="application/ld+json" data-seo-jsonld="company">${json}</script>`,
    ...styles.filter((href) => !html.includes(`href="${href}"`)).map((href) => `<link rel="stylesheet" href="${escapeAttribute(href)}" />`),
  ].join('\n    ')
  return html.replace('</head>', `    ${head}\n  </head>`)
    .replace(root, () => `<div id="root" data-prerender="company" data-year="${year}">${body}</div>`)
}
