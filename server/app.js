import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import checkoutRouter from './routes/checkout.js'
import webhooksRouter from './routes/webhooks.js'

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return
  await mongoose.connect(env.mongodbUri, { dbName: 'electronics-store' })
}

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.get('/api/health', (req, res) => {
    res.json({ ok: true })
  })

  app.use('/api', checkoutRouter)
  app.use('/api', webhooksRouter)

  return app
}