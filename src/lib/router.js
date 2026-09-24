import { storePathPrefix } from './tenant.js'
import { homeUrl, productUrl, cartUrl, infoUrl, orderStatusUrl } from './urls.js'

export function parseLocation() {
  const params = new URLSearchParams(window.location.search)
  const status = params.get('status') || params.get('collection_status')
  if (status) {
    return {
      name: 'order-status',
      payload: {
        status,
        orderId: params.get('external_reference'),
      },
    }
  }

  const path = window.location.pathname
  if (path === '/admin') return { name: 'dashboard' }

  const prefix = storePathPrefix()
  if (!prefix) return { name: 'dashboard' }

  const parts = path.slice(prefix.length).replace(/^\/+/, '').split('/').filter(Boolean)

  if (parts[0] === 'p' && parts[1]) {
    return { name: 'product', payload: { id: Number(parts[1]) } }
  }
  if (parts[0] === 'cart') return { name: 'cart' }
  if (parts[0] === 'info' && parts[1]) {
    return { name: 'info', payload: parts[1] }
  }
  return { name: 'home' }
}

export function urlForView(name, payload) {
  switch (name) {
    case 'dashboard':
      return '/admin'
    case 'product':
      return payload && payload.id !== undefined
        ? productUrl(payload.id)
        : homeUrl()
    case 'cart':
      return cartUrl()
    case 'info':
      return infoUrl(payload)
    case 'order-status':
      return orderStatusUrl(payload?.status, payload?.orderId)
    default:
      return homeUrl()
  }
}