const SUPER_TENANT_KEY = 'ts-super-tenant'

const PATH_SLUG_RE = /^\/u\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function slugFromPathname() {
  try {
    const match = window.location.pathname.match(PATH_SLUG_RE)
    if (match && SLUG_RE.test(match[1])) return match[1]
  } catch { /* no-op */ }
  return null
}

export function storePathPrefix() {
  try {
    const match = window.location.pathname.match(/^\/u\/[a-z0-9]+(?:-[a-z0-9]+)*/)
    return match ? match[0] : ''
  } catch {
    return ''
  }
}

export function getTenantSlug() {
  return slugFromPathname()
}

export function getTenantHeaders() {
  const slug = getTenantSlug()
  return slug ? { 'x-tenant-slug': slug } : {}
}

export function getSuperTenant() {
  try {
    return sessionStorage.getItem(SUPER_TENANT_KEY) || null
  } catch {
    return null
  }
}

export function setSuperTenant(id) {
  try {
    sessionStorage.setItem(SUPER_TENANT_KEY, id || '')
  } catch { /* no-op */ }
}

export function clearSuperTenant() {
  try {
    sessionStorage.removeItem(SUPER_TENANT_KEY)
  } catch { /* no-op */ }
}

export function tenantUrl(path, user) {
  const superTenant = user?.role === 'superadmin' ? getSuperTenant() : null
  if (!superTenant || !String(path).startsWith('/api/admin')) return path
  const sep = path.includes('?') ? '&' : '?'
  return `${path}${sep}tenant=${superTenant}`
}