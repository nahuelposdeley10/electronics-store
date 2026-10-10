import { uploadToCloudinary } from './cloudinary.js'
import { uploadToR2 } from './r2.js'
import { uploadToLocal } from './local-images.js'
import { env } from '../config/env.js'

export function uploadImage(file, { tenant } = {}) {
  const provider = env.imageStorageProvider
  if (provider === 'local') return uploadToLocal(file, { tenant })
  if (provider === 'r2') return uploadToR2(file, { tenant })
  if (provider === 'cloudinary') return uploadToCloudinary(file)
  throw new Error('IMAGE_STORAGE_PROVIDER debe ser local, cloudinary o r2')
}
