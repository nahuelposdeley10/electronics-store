import { storePathPrefix } from './tenant.js'

export function homeUrl() {
  return storePathPrefix() || '/'
}

export function productUrl(id) {
  if (id === undefined || id === null || id === '') return homeUrl()
  return `${homeUrl()}/p/${encodeURIComponent(id)}`
}

export function cartUrl() {
  return `${homeUrl()}/cart`
}

export function infoUrl(slug) {
  return `${homeUrl()}/info/${encodeURIComponent(String(slug || ''))}`
}

export function orderStatusUrl(status, orderId) {
  const qs = new URLSearchParams()
  if (status) qs.set('status', status)
  if (orderId) qs.set('external_reference', orderId)
  const q = qs.toString()
  return `${homeUrl()}${q ? `?${q}` : ''}`
}