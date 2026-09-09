import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { User } from '../models/User.js'
import { env } from '../config/env.js'

const router = express.Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  try {
    const user = await User.findOne({ email: String(email).trim().toLowerCase() })
    if (!user || !user.active) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const matches = await bcrypt.compare(password, user.passwordHash)
    if (!matches) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const token = jwt.sign(
      { sub: user._id.toString(), email: user.email, role: user.role },
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
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return res.status(500).json({ error: 'No se pudo iniciar sesión' })
  }
})

export default router