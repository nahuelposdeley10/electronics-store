const INSTAGRAM_USERNAME = /^[a-zA-Z0-9._]{1,30}$/

export function normalizeInstagramUrl(value) {
  const raw = String(value || '').trim()
  if (!raw) return null

  const withoutAt = raw.startsWith('@') ? raw.slice(1) : raw
  const candidate = /^[a-zA-Z0-9._]{1,30}$/.test(withoutAt)
    ? `https://www.instagram.com/${withoutAt}`
    : raw.startsWith('http://') || raw.startsWith('https://')
      ? raw
      : `https://${raw}`

  try {
    const url = new URL(candidate)
    const hostname = url.hostname.toLowerCase()
    const username = url.pathname.replace(/^\/+|\/+$/g, '')
    if (!['instagram.com', 'www.instagram.com'].includes(hostname)) return null
    if (!INSTAGRAM_USERNAME.test(username) || url.search || url.hash) return null
    return `https://www.instagram.com/${username}/`
  } catch {
    return null
  }
}
