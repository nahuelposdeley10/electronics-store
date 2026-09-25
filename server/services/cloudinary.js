import cloudinary from 'cloudinary'
import { env } from '../config/env.js'
import { detectImageMime } from '../lib/image-guard.js'

cloudinary.v2.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
})

export function uploadToCloudinary(file) {
  const mime = detectImageMime(file?.buffer)
  if (!mime) {
    const error = new Error('El archivo no es una imagen válida (PNG, JPG, WEBP o GIF)')
    error.status = 400
    return Promise.reject(error)
  }
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    const error = new Error(
      'El servicio de imágenes (Cloudinary) no está configurado en el servidor: agregá CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET al entorno del deploy',
    )
    error.status = 500
    return Promise.reject(error)
  }
  // resource_type 'image' forzado: Cloudinary no interpreta el archivo como
  // un documento (SVG/HTML con JS embebido quedan fuera del upload).
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder: 'techstore', resource_type: 'image' },
      (error, result) => {
        if (error) {
          reject(error)
        } else {
          resolve(result.secure_url)
        }
      },
    )
    stream.end(file.buffer)
  })
}