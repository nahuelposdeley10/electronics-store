import 'dotenv/config'

const DEV_JWT_FALLBACK = 'dev-secret-no-usar-en-produccion'

function splitOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)
}

export const nodeEnv = process.env.NODE_ENV || 'development'
export const isProd = nodeEnv === 'production'

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
const configuredOrigins = splitOrigins(process.env.CORS_ORIGINS)

export const env = {
  nodeEnv,
  isProd,
  mpAccessToken: process.env.MP_ACCESS_TOKEN,
  mpPublicKey: process.env.MP_PUBLIC_KEY,
  mpWebhookSecret: process.env.MP_WEBHOOK_SECRET,
  mongodbUri: process.env.MONGODB_URI,
  clientUrl,
  serverUrl: process.env.SERVER_URL || 'http://localhost:4000',
  corsOrigins: configuredOrigins.length ? configuredOrigins : [clientUrl],
  jwtSecret: process.env.JWT_SECRET || DEV_JWT_FALLBACK,
  cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME,
  cloudinaryApiKey: process.env.CLOUDINARY_API_KEY,
  cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET,
  bodyLimit: process.env.BODY_LIMIT || '100kb',
  movementRetentionDays: Number(process.env.MOVEMENT_RETENTION_DAYS) || 365,
  loginRateLimit: {
    windowMs: Number(process.env.LOGIN_RATE_WINDOW_MS) || 15 * 60 * 1000,
    max: Number(process.env.LOGIN_RATE_MAX) || 5,
  },
}

export function isAllowedOrigin(origin) {
  if (!origin) return false
  return env.corsOrigins.includes(String(origin))
}

export function validateEnv() {
  if (!env.isProd) return

  const missing = []
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_FALLBACK) {
    missing.push('JWT_SECRET (obligatorio en producción, sin fallback)')
  }
  if (!process.env.MONGODB_URI) missing.push('MONGODB_URI')
  if (!process.env.CLIENT_URL) missing.push('CLIENT_URL')

  if (missing.length > 0) {
    throw new Error(
      `Configuración de producción incompleta, el server NO arranca. Faltan: ${missing.join(
        ', ',
      )}. Revisá el .env.`,
    )
  }
}