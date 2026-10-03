// Shared by the browser, Express and Vite. This is SEO, not access control.
export const NO_INDEX = 'noindex, follow'
export const INDEX = 'index, follow'

export const PAYMENT_QUERY_KEYS = [
  'status', 'collection_status', 'external_reference', 'payment_id',
  'collection_id', 'merchant_order_id', 'preference_id', 'preapproval_id',
]

export function shouldNoIndex(url) {
  const parsed = new URL(url, 'http://localhost')
  const path = parsed.pathname
  // The root currently opens the admin panel, not the commercial landing.
  if (path === '/' || path === '/index.html') return true
  if (/^\/(?:admin|activar-cuenta|cart|order-status|api)(?:\/|$)/i.test(path)) return true
  if (/^\/u\/[^/]+\/(?:cart|order-status)(?:\/|$)/i.test(path)) return true
  if (PAYMENT_QUERY_KEYS.some((key) => parsed.searchParams.has(key))) return true
  return parsed.searchParams.get('subscription') === 'return'
}
