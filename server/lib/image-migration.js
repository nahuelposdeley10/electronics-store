export function isCloudinaryImage(value, cloudName) {
  if (typeof value !== 'string' || !cloudName) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com' && !url.username && !url.password &&
      url.pathname.startsWith(`/${cloudName}/image/upload/`)
  } catch { return false }
}

// Only inspect JSON image-bearing fields; never serialize other settings/secrets.
export function imageReferences(value, cloudName, path = '') {
  if (isCloudinaryImage(value, cloudName)) return [{ path, url: value }]
  if (!value || typeof value !== 'object') return []
  return Object.entries(value).flatMap(([key, child]) =>
    imageReferences(child, cloudName, path ? `${path}.${key}` : key))
}

export async function downloadImage(url, maxBytes = 25 * 1024 * 1024) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`Descarga de imagen falló: HTTP ${response.status}`)
  const chunks = []
  let size = 0
  for await (const chunk of response.body) {
    size += chunk.length
    if (size > maxBytes) throw new Error('Imagen supera el límite de 25 MB')
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}
