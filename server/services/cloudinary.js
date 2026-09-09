import cloudinary from 'cloudinary'
import { env } from '../config/env.js'

cloudinary.v2.config({
  cloud_name: env.cloudinaryCloudName,
  api_key: env.cloudinaryApiKey,
  api_secret: env.cloudinaryApiSecret,
})

export function uploadToCloudinary(file) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.v2.uploader.upload_stream(
      { folder: 'techstore', resource_type: 'auto' },
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