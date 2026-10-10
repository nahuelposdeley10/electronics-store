import { paidSubscriptionExpired } from '../lib/subscriptions.js'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { Subscription } from '../models/Subscription.js'
import { permissionsForUser } from '../lib/settings.js'

export async function requireAuth(req, res, next) {
  const header = req.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return res.status(401).json({ error: 'Sesión requerida' })
  }

  let payload
  try {
    payload = jwt.verify(token, env.jwtSecret)
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o vencida' })
  }

  try {
    const user = await User.findById(payload.sub).select('_id active').lean()
    if (!user || user.active !== true) {
      return res.status(401).json({ error: 'Sesión inválida o vencida' })
    }

    req.user = payload
    return next()
  } catch {
    return res.status(500).json({ error: 'No se pudo validar la sesión' })
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'No tenés permiso para esto' })
    }
    next()
  }
}

export function requirePermission(code) {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Sesión requerida' })
    }
    try {
      const user = await User.findById(req.user.sub).lean()
      const perms = await permissionsForUser(user, req.user.adminId)
      req.user.perms = perms
      if (!perms.includes(code)) {
        return res.status(403).json({ error: 'No tenés permiso para esto' })
      }
      next()
    } catch {
      return res.status(500).json({ error: 'No se pudo validar el permiso' })
    }
  }
}

export async function requireSubscriptionAccess(req, res, next) {
  if (req.user?.role === 'superadmin') return next()

  const adminId = req.user?.role === 'admin' ? req.user.sub : req.user?.adminId
  if (!adminId) return res.status(403).json({ error: 'No se pudo resolver el negocio de la cuenta' })

  try {
    const subscription = await Subscription.findOne({ adminId }).select('status pauseReason dueDate').lean()
    if (subscription && (['paused', 'cancelled'].includes(subscription.status) || paidSubscriptionExpired(subscription))) {
      return res.status(402).json({
        error: paidSubscriptionExpired(subscription)
          ? 'Tu suscripci?n venci? y termin? el per?odo de gracia de 5 d?as. Regulariz? el pago para continuar.'
          : subscription.pauseReason === 'trial_expired'
          ? 'La prueba gratuita terminó. Activá la suscripción para continuar.'
          : 'El plan está pausado. Activá la suscripción para continuar.',
        code: 'SUBSCRIPTION_REQUIRED',
        status: subscription.status,
      })
    }
    return next()
  } catch {
    return res.status(500).json({ error: 'No se pudo validar el estado de la suscripción' })
  }
}
