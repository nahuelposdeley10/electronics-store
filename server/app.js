import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import mongoose from 'mongoose'
import path from 'node:path'
import fs from 'node:fs'
import { env, validateEnv } from './config/env.js'
import checkoutRouter from './routes/checkout.js'
import webhooksRouter from './routes/webhooks.js'
import catalogRouter from './routes/catalog.js'
import adminRouter from './routes/admin.js'
import catalogAdminRouter from './routes/catalog-admin.js'
import promosRouter from './routes/promos.js'
import inventoryRouter from './routes/inventory.js'
import reportsRouter from './routes/reports.js'
import usersRouter from './routes/users.js'
import authRouter from './routes/auth.js'
import settingsRouter from './routes/settings.js'
import cashRouter from './routes/cash.js'

const DIST_DIR = path.resolve('dist')

export async function connectDb() {
  if (mongoose.connection.readyState === 1) return
  await mongoose.connect(env.mongodbUri, { dbName: 'electronics-store' })
}

function requestLogger(req, res, next) {
  const start = process.hrtime.bigint()
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - start) / 1e6
    console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)}ms)`)
  })
  next()
}

const HELMET_CSP = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
    imgSrc: ["'self'", 'data:', 'https:'],
    connectSrc: ["'self'", 'ws:', 'wss:', 'https://fonts.googleapis.com', 'https://fonts.gstatic.com'],
    frameSrc: ["'self'", 'https://www.google.com'],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: env.isProd ? [] : null,
  },
}

const MULTER_ERROR_STATUS = new Set([
  'LIMIT_FILE_SIZE',
  'LIMIT_FILE_COUNT',
  'LIMIT_FIELD_KEY',
  'LIMIT_FIELD_VALUE',
  'LIMIT_FIELD_COUNT',
  'LIMIT_UNEXPECTED_FILE',
])

export function createApp() {
  validateEnv()

  const app = express()

  app.disable('x-powered-by')
  app.set('trust proxy', env.isProd ? 1 : false)

  app.use(helmet({ contentSecurityPolicy: HELMET_CSP }))
  app.use(compression())
  app.use(
    cors({
      origin: env.corsOrigins,
      credentials: true,
    }),
  )
  app.use(requestLogger)
  app.use(express.json({ limit: env.bodyLimit }))
  app.use(express.urlencoded({ extended: true, limit: env.bodyLimit }))

  app.get('/api/health', (req, res) => {
    res.json({ ok: true })
  })

  app.use('/api', checkoutRouter)
  app.use('/api', webhooksRouter)
  app.use('/api', catalogRouter)
  app.use('/api/auth', authRouter)
  app.use('/api', settingsRouter)
  app.use('/api/admin', adminRouter)
  app.use('/api/admin/users', usersRouter)
  app.use('/api/admin', catalogAdminRouter)
  app.use('/api/admin', promosRouter)
  app.use('/api/admin/inventory', inventoryRouter)
  app.use('/api/admin/cash', cashRouter)
  app.use('/api/admin/reports', reportsRouter)

  if (fs.existsSync(DIST_DIR)) {
    app.use(express.static(DIST_DIR))
    app.get(/^(?!\/api\/).*/, (req, res) => {
      res.sendFile(path.join(DIST_DIR, 'index.html'))
    })
  }

  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error)
    let status = Number(error?.status) || 500
    if (error?.type === 'entity.too.large') status = 413
    if (error?.name === 'MulterError' && MULTER_ERROR_STATUS.has(error?.code)) status = 413
    if (status >= 500) {
      console.error(`[error] ${req.method} ${req.originalUrl}`, error)
      return res.status(status).json({ error: 'Error interno del servidor' })
    }
    return res.status(status).json({ error: error?.message || 'Solicitud inválida' })
  })

  return app
}