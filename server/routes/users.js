import express from 'express'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { User } from '../models/User.js'
import { Order } from '../models/Order.js'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { Brand } from '../models/Brand.js'
import { Variant } from '../models/Variant.js'
import { Coupon } from '../models/Coupon.js'
import { Quote } from '../models/Quote.js'
import { Setting } from '../models/Setting.js'
import { Purchase } from '../models/Purchase.js'
import { StockMovement } from '../models/StockMovement.js'
import { CashShift } from '../models/CashShift.js'
import { CashMovement } from '../models/CashMovement.js'
import { CashCount } from '../models/CashCount.js'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { generatePassword } from '../lib/passwords.js'
import { getSettings, saveSettings, ALL_PERMISSIONS, permissionsForRole } from '../lib/settings.js'
import { requireTenantIdOf, tenantIdOf } from '../lib/tenant.js'

const router = express.Router()

router.use(requireAuth, requirePermission('users.manage'))

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function parseRole(value) {
  return ['superadmin', 'admin', 'operator'].includes(value) ? value : null
}

function cleanSlug(value) {
  const slug = String(value || '').trim().toLowerCase()
  return slug && SLUG_PATTERN.test(slug) ? slug : null
}

function toUserDoc(u, extra = {}) {
  return {
    id: u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    adminId: u.adminId ? u.adminId.toString() : null,
    businessSlug: u.businessSlug || null,
    createdAt: u.createdAt,
    ...extra,
  }
}

router.get('/businesses', async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'No tenés permiso para esto' })
  }
  try {
    const admins = await User.find({ role: 'admin' }).sort({ createdAt: 1 }).lean()
    const items = []
    for (const admin of admins) {
      const tenant = admin._id
      const settings = await getSettings({ tenant })
      const [productCount, orderCount, revenue, operatorCount] = await Promise.all([
        Product.countDocuments({ adminId: tenant }),
        Order.countDocuments({ adminId: tenant, status: 'approved' }),
        Order.aggregate([
          { $match: { adminId: tenant, status: 'approved' } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        User.countDocuments({ role: 'operator', adminId: tenant }),
      ])
      items.push({
        ...toUserDoc(admin),
        storeName: settings.store?.name || admin.name,
        productCount,
        orderCount,
        revenue: revenue[0]?.total || 0,
        operatorCount,
      })
    }
    return res.json({ items })
  } catch (error) {
    console.error('Businesses error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los negocios' })
  }
})

router.put('/businesses/:id/online', async (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'No tenés permiso para esto' })
  }
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ error: 'Negocio no encontrado' })
    }
    const admin = await User.findOne({ _id: req.params.id, role: 'admin' }).lean()
    if (!admin) {
      return res.status(404).json({ error: 'Negocio no encontrado' })
    }
    const online = req.body?.online === true || req.body?.online === 'true'
    const current = await getSettings({ fresh: true, tenant: admin._id })
    const saved = await saveSettings({
      section: 'payments',
      value: { ...current.payments, online },
      tenant: admin._id,
    })
    return res.json({ online: saved.payments?.online !== false })
  } catch (error) {
    console.error('Business online toggle error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar el negocio' })
  }
})

router.get('/', async (req, res) => {
  try {
    const tenant = tenantIdOf(req)
    const filter = tenant ? { $or: [{ _id: tenant }, { adminId: tenant }] } : {}
    const users = await User.find(filter).sort({ role: 1, createdAt: 1 }).lean()
    const self = String(req.user.sub)
    const mapped = await Promise.all(
      users.map(async (u) => {
        const tenant = u.role === 'admin' ? u._id : u.adminId
        const perms = await permissionsForRole(u.role, tenant)
        const explicit = Array.isArray(u.permissions) ? u.permissions : []
        const effective = explicit.length ? explicit : perms
        return toUserDoc(u, { permissions: effective, isSelf: String(u._id) === self })
      }),
    )
    return res.json(mapped)
  } catch (error) {
    console.error('Users list error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los usuarios' })
  }
})

router.post('/', async (req, res) => {
  const { name, email, role, adminId, businessSlug, password } = req.body || {}
  if (!name || !email) {
    return res.status(400).json({ error: 'Nombre y email requeridos' })
  }

  const manualPassword = password ? String(password).trim() : ''
  if (password !== undefined && manualPassword.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  const isSuperadmin = req.user.role === 'superadmin'
  const targetRole = isSuperadmin ? parseRole(role) || 'admin' : 'operator'

  if (targetRole === 'operator') {
    const tenant = isSuperadmin ? adminId : requireTenantIdOf(req)
    if (!tenant) {
      return res.status(400).json({ error: 'Elegí el negocio al que pertenece el operador' })
    }
    const owner = await User.findOne({ _id: tenant, role: 'admin' }).lean()
    if (!owner) {
      return res.status(400).json({ error: 'El negocio elegido no existe' })
    }
  }

  if (targetRole === 'admin' && businessSlug && !cleanSlug(businessSlug)) {
    return res.status(400).json({ error: 'El slug usa minúsculas, números y guiones' })
  }

  try {
    const normalizedEmail = String(email).trim().toLowerCase()
    const exists = await User.findOne({ email: normalizedEmail })
    if (exists) {
      return res.status(400).json({ error: 'Ya existe un usuario con ese email' })
    }

    const generatedPassword = manualPassword ? '' : generatePassword()
    const createdData = {
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash: manualPassword
        ? await bcrypt.hash(manualPassword, 10)
        : await bcrypt.hash(generatedPassword, 10),
      role: targetRole,
      adminId:
        targetRole === 'operator'
          ? isSuperadmin
            ? adminId
            : requireTenantIdOf(req)
          : null,
    }
    if (targetRole === 'admin') {
      const slug = cleanSlug(businessSlug)
      if (slug) {
        const takenSlug = await User.findOne({ businessSlug: slug }).lean()
        if (takenSlug) {
          return res.status(400).json({ error: 'Ese slug ya lo usa otro negocio' })
        }
        createdData.businessSlug = slug
      }
    }
    const user = await User.create(createdData)

    return res
      .status(201)
      .json(manualPassword ? toUserDoc(user) : toUserDoc(user, { password: generatedPassword }))
  } catch (error) {
    console.error('Users create error:', error)
    return res.status(500).json({ error: 'No se pudo crear el usuario' })
  }
})

router.put('/:id', async (req, res) => {
  const { name, role, active, password, businessSlug, adminId, email } = req.body || {}
  const self = String(req.user.sub) === String(req.params.id)
  const isSuperadmin = req.user.role === 'superadmin'

  if (role && !parseRole(role)) {
    return res.status(400).json({ error: 'Rol inválido' })
  }

  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (!isSuperadmin) {
      const tenant = requireTenantIdOf(req)
      const targetIsOwnOperator =
        user.role === 'operator' && String(user.adminId || '') === String(tenant)
      if (!targetIsOwnOperator && !self) {
        return res.status(403).json({ error: 'No tenés permiso para editar ese usuario' })
      }
      if (role && role !== 'operator') {
        return res.status(403).json({ error: 'No podés cambiar de rol a un operador' })
      }
    }

    if (self && active === false) {
      return res.status(400).json({ error: 'No podés desactivar tu propio usuario' })
    }
    if (self && role && role !== user.role && !isSuperadmin) {
      return res.status(400).json({ error: 'No podés cambiar tu propio rol' })
    }

    const nextRole = role || user.role
    if (nextRole === 'operator' && !user.adminId && !(isSuperadmin && adminId)) {
      return res.status(400).json({ error: 'Un operador debe pertenecer a un negocio' })
    }

    const removingSuperadmin =
      user.role === 'superadmin' && (role === 'admin' || role === 'operator' || active === false)
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

    const promotingToSuperadmin =
      user.role !== 'superadmin' && nextRole === 'superadmin' && !isSuperadmin
    if (promotingToSuperadmin) {
      return res.status(403).json({ error: 'No tenés permiso para otorgar super admin' })
    }

    if (name !== undefined) user.name = String(name).trim()
    if (email !== undefined) {
      const cleanEmail = String(email).trim().toLowerCase()
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return res.status(400).json({ error: 'Email inválido' })
      }
      const taken = await User.findOne({ email: cleanEmail, _id: { $ne: user._id } }).lean()
      if (taken) {
        return res.status(400).json({ error: 'Ya existe un usuario con ese email' })
      }
      user.email = cleanEmail
    }
    if (role) user.role = role
    if (isSuperadmin && role === 'operator' && adminId) {
      const owner = await User.findOne({ _id: adminId, role: 'admin' }).lean()
      if (!owner) {
        return res.status(400).json({ error: 'El negocio elegido no existe' })
      }
      user.adminId = adminId
    }
    if (active !== undefined) user.active = Boolean(active)
    if (businessSlug !== undefined) {
      if (nextRole !== 'admin') {
        return res.status(400).json({ error: 'Solo los admins tienen slug de negocio' })
      }
      const slug = cleanSlug(businessSlug)
      if (businessSlug && !slug) {
        return res.status(400).json({ error: 'El slug usa minúsculas, números y guiones' })
      }
      if (slug) {
        const takenSlug = await User.findOne({ businessSlug: slug, _id: { $ne: user._id } }).lean()
        if (takenSlug) {
          return res.status(400).json({ error: 'Ese slug ya lo usa otro negocio' })
        }
      }
      user.businessSlug = slug || undefined
    }
    if (password) {
      if (String(password).length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
      }
      user.passwordHash = await bcrypt.hash(String(password), 10)
    }
    await user.save()

    return res.json(toUserDoc(user))
  } catch (error) {
    console.error('Users update error:', error)
    return res.status(500).json({ error: 'No se pudo actualizar el usuario' })
  }
})

router.put('/:id/permissions', async (req, res) => {
  const isSuperadmin = req.user.role === 'superadmin'

  try {
    const target = await User.findById(req.params.id)
    if (!target) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    if (target.role === 'superadmin') {
      return res.status(400).json({ error: 'El súper admin siempre tiene acceso total' })
    }
    if (String(target._id) === String(req.user.sub)) {
      return res.status(400).json({ error: 'No podés modificar tus propios permisos' })
    }
    if (!isSuperadmin) {
      const tenant = requireTenantIdOf(req)
      const targetIsOwnOperator =
        target.role === 'operator' && String(target.adminId || '') === String(tenant)
      if (!targetIsOwnOperator) {
        return res.status(403).json({ error: 'No tenés permiso para editar ese usuario' })
      }
    }

    const clean = Array.isArray(req.body?.permissions)
      ? req.body.permissions.filter((p) => ALL_PERMISSIONS.includes(p))
      : []
    target.permissions = clean
    await target.save()
    return res.json(toUserDoc(target, { permissions: clean }))
  } catch (error) {
    console.error('Permissions update error:', error)
    return res.status(500).json({ error: 'No se pudieron guardar los permisos' })
  }
})

router.delete('/:id', async (req, res) => {
  const isSuperadmin = req.user.role === 'superadmin'
  const self = String(req.user.sub) === String(req.params.id)

  try {
    const user = await User.findById(req.params.id)
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    if (self) {
      return res.status(400).json({ error: 'No podés eliminar tu propio usuario' })
    }

    if (!isSuperadmin) {
      const tenant = requireTenantIdOf(req)
      const targetIsOwnOperator =
        user.role === 'operator' && String(user.adminId || '') === String(tenant)
      if (!targetIsOwnOperator) {
        return res.status(403).json({ error: 'No tenés permiso para eliminar ese usuario' })
      }
    }

    if (user.role === 'superadmin') {
      const activeLeft = await User.countDocuments({
        role: 'superadmin',
        active: true,
        _id: { $ne: user._id },
      })
      if (activeLeft === 0) {
        return res.status(400).json({
          error: 'No podés eliminar al último súper admin activo',
        })
      }
    }

    if (user.role === 'admin') {
      const tenantModels = [
        Order,
        Product,
        Category,
        Brand,
        Variant,
        Coupon,
        Quote,
        Purchase,
        StockMovement,
        CashShift,
        CashMovement,
        CashCount,
      ]
      const operatorCount = await User.countDocuments({ role: 'operator', adminId: user._id })
      const dataCounts = await Promise.all(
        tenantModels.map((model) => model.countDocuments({ adminId: user._id })),
      )
      const dataTotal = dataCounts.reduce((sum, n) => sum + n, 0) + operatorCount
      if (dataTotal > 0) {
        return res.status(400).json({
          error:
            'Ese admin tiene usuarios o datos de su negocio; desactivá el acceso o reasigná la tienda antes de eliminarlo',
        })
      }
      await Setting.deleteMany({ adminId: user._id })
    }

    await User.findByIdAndDelete(user._id)
    return res.json({ ok: true, id: user._id })
  } catch (error) {
    console.error('Users delete error:', error)
    return res.status(500).json({ error: 'No se pudo eliminar el usuario' })
  }
})

export default router