import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { env } from '../config/env.js'
import { detectImageMime } from '../lib/image-guard.js'

const UPLOAD_ROOT = path.resolve('public/uploads')
const EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

function tenantScope(tenant) {
  const scope = tenant == null ? 'global' : String(tenant)
  if (!/^(global|[a-f\d]{24})$/i.test(scope)) {
    throw Object.assign(new Error('Tenant inválido para la imagen'), { status: 400 })
  }
  return scope
}

export async function uploadToLocal(file, { tenant } = {}) {
  const mime = detectImageMime(file?.buffer)
  if (!mime || !EXTENSIONS[mime]) {
    throw Object.assign(new Error('El archivo no es una imagen válida (PNG, JPG, WEBP o GIF)'), { status: 400 })
  }

  const scope = tenantScope(tenant)
  const relativePath = `stores/${scope}/images/${randomUUID()}.${EXTENSIONS[mime]}`
  const target = path.join(UPLOAD_ROOT, ...relativePath.split('/'))
  await mkdir(path.dirname(target), { recursive: true })
  await writeFile(target, file.buffer)
  return new URL(`/uploads/${relativePath}`, env.serverUrl).toString()
}
