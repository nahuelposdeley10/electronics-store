import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import checkoutRouter from './routes/checkout.js'
import webhooksRouter from './routes/webhooks.js'
import adminRouter from './routes/admin.js'
import usersRouter from './routes/users.js'
import authRouter from './routes/auth.js'

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
  app.use('/api/auth', authRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/admin/users', usersRouter)

  return app
}