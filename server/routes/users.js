import express from 'express'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { generatePassword } from '../lib/passwords.js'

const router = express.Router()

router.use(requireAuth, requirePermission('users.manage'))

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

router.put('/:id', async (req, res) => {
  const { name, role, active, password } = req.body || {}
  const self = String(req.user.sub) === String(req.params.id)
  if (role && !['admin', 'superadmin'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' })
  }

  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (self && active === false) {
      return res.status(400).json({ error: 'No podés desactivar tu propio usuario' })
    }

    const removingSuperadmin =
      user.role === 'superadmin' && (role === 'admin' || active === false)
    if (removingSuperadmin) {
      const activeLeft = await User.countDocuments({
        role: 'superadmin',
        active: true,
        _id: { $ne: user._id },
      })
      if (activeLeft === 0) {
        return res.status(400).json({
          error: 'No podés quitar al último súper admin activo',
        })
      }
    }

    if (name !== undefined) user.name = String(name).trim()
    if (role) user.role = role
    if (active !== undefined) user.active = Boolean(active)
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
      }
      user.passwordHash = await bcrypt.hash(String(password), 10)
    }
    await user.save()

    return res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      active: user.active,
      createdAt: user.createdAt,
    })
  } catch (error) {
    console.error('Users update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar el usuario' })
  }
})

export default router