import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { permissionsForUser } from '../lib/settings.js'

export function requireAuth(req, res, next) {
  const header = req.get('authorization') || ''
  const token = header.replace(/^Bearer\s+/i, '').trim()
  if (!token) {
    return res.status(401).json({ error: 'Sesión requerida' })
  }
  try {
    req.user = jwt.verify(token, env.jwtSecret)
    next()
  } catch {
    return res.status(401).json({ error: 'Sesión inválida o vencida' })
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
      if (!perms.includes(code)) {
        return res.status(403).json({ error: 'No tenés permiso para esto' })
      }
      next()
    } catch {
      return res.status(500).json({ error: 'No se pudo validar el permiso' })
    }
  }
}