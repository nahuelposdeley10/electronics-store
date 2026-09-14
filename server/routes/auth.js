import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import { requireAuth } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { env } from '../config/env.js'
import { permissionsForUser } from '../lib/settings.js'

const router = express.Router()

const loginLimiter = rateLimit({
  windowMs: env.loginRateLimit.windowMs,
  limit: env.loginRateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos de login. Probá de nuevo en unos minutos.' },
})

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  try {
    const user = await User.findOne({ email: String(email).trim().toLowerCase() })
    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }
    if (!user.active) {
      return res.status(401).json({ error: 'Tu cuenta está desactivada; contactá al administrador' })
    }

    const matches = await bcrypt.compare(password, user.passwordHash)
    if (!matches) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role,
        adminId: user.adminId ? user.adminId.toString() : null,
      },
      env.jwtSecret,
      { expiresIn: '12h' },
    )

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        adminId: user.adminId ? user.adminId.toString() : null,
        businessSlug: user.businessSlug || null,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'No se pudo iniciar sesión' })
  }
})

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.sub).lean()
    const perms = await permissionsForUser(user, req.user.adminId || user?.adminId)
    return res.json({
      user: {
        id: user ? user._id : req.user.sub,
        name: user ? user.name : req.user.email,
        email: req.user.email,
        role: req.user.role || user?.role,
        adminId: req.user.adminId || (user?.adminId ? user.adminId.toString() : null),
        businessSlug: user?.businessSlug || null,
      },
      perms,
    })
  } catch (error) {
    console.error('Me error:', error)
    return res.status(500).json({ error: 'No se pudo leer la sesión' })
  }
})

export default router