import { createHash, randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { detectImageMime } from '../lib/image-guard.js'
import 'dotenv/config'

export function r2Config() {
  const names = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET', 'R2_PUBLIC_URL']
  const missing = names.filter((name) => !process.env[name])
  if (missing.length) throw new Error(`Falta configurar R2: ${missing.join(', ')}`)
  const publicUrl = new URL(process.env.R2_PUBLIC_URL)
  if (publicUrl.protocol !== 'https:' || publicUrl.username || publicUrl.password || publicUrl.search || publicUrl.hash) {
    throw new Error('R2_PUBLIC_URL debe ser una URL HTTPS pública sin credenciales ni query')
  }
  if (!/^[a-f0-9]{32}$/i.test(process.env.R2_ACCOUNT_ID)) throw new Error('R2_ACCOUNT_ID inválido')
  return { bucket: process.env.R2_BUCKET, publicUrl: publicUrl.href.replace(/\/$/, '') }
}

export function imageKey(tenant, name = randomUUID()) {
  const scope = tenant == null ? 'global' : String(tenant)
  if (!/^(global|[a-f0-9]{24})$/i.test(scope) || !/^[a-z0-9-]+$/i.test(name)) throw new Error('Clave de imagen inválida')
  return `stores/${scope}/images/${name}`
}

export const imageHash = (buffer) => createHash('sha256').update(buffer).digest('hex')

export async function uploadToR2(file, { tenant, key = imageKey(tenant) } = {}) {
  const mime = detectImageMime(file?.buffer)
  if (!mime) throw Object.assign(new Error('El archivo no es una imagen válida (PNG, JPG, WEBP o GIF)'), { status: 400 })
  const config = r2Config()
  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
  })
  try {
    await client.send(new PutObjectCommand({
      Bucket: config.bucket, Key: key, Body: file.buffer, ContentType: mime,
      CacheControl: 'public, max-age=31536000, immutable',
      Metadata: { sha256: imageHash(file.buffer) },
    }), { abortSignal: AbortSignal.timeout(60000) })
    return `${config.publicUrl}/${key.split('/').map(encodeURIComponent).join('/')}`
  } finally { client.destroy() }
}
