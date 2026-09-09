import express from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.js'
import { generatePassword } from '../lib/passwords.js'

const router = express.Router()

router.use(requireAuth, requireRole('superadmin'))

router.get('/', async (req, res) => {
  try {
    const users = await User.find().sort({ role: 1, createdAt: 1 }).lean()
    return res.json(
      users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        active: u.active,
        createdAt: u.createdAt,
      })),
    )
  } catch (error) {
    console.error('Users list error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los usuarios' })
  }
})

router.post('/', async (req, res) => {
  const { name, email, role } = req.body || {}
  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y email requeridos' })
  }
  if (role && !['admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' })
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase()
    const exists = await User.findOne({ email: normalizedEmail })
    if (exists) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' })
    }

    const password = generatePassword()
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: await bcrypt.hash(password, 10),
      role: role || 'admin',
    })

    return res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
      password,
    })
  } catch (error) {
    console.error('Users create error:', error)
    return res.status(500).json({ error: 'No se pudo crear el usuario' })
  }
})

export default router