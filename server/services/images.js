import { uploadToCloudinary } from './cloudinary.js'
import { uploadToR2 } from './r2.js'

export function uploadImage(file, { tenant } = {}) {
  const provider = process.env.IMAGE_STORAGE_PROVIDER || 'cloudinary'
  if (provider === 'r2') return uploadToR2(file, { tenant })
  if (provider === 'cloudinary') return uploadToCloudinary(file)
  throw new Error('IMAGE_STORAGE_PROVIDER debe ser cloudinary o r2')
}
