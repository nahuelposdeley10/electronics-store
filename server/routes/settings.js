import express from 'express'
import multer from 'multer'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { getSettings, saveSettings } from '../lib/settings.js'
import { uploadImage } from '../services/images.js'
import { publicTenantId, requirePublicTenant, requireTenantIdOf } from '../lib/tenant.js'
import { allowedImageFilter } from '../lib/image-guard.js'
import { User } from '../models/User.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: allowedImageFilter,
})

const PUBLIC_SECTIONS = ['store', 'shipping', 'general', 'payments', 'hero', 'appearance', 'gaming']

function requireTenant(req, res, next) {
  try {
    requireTenantIdOf(req)
    next()
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }
}

router.get('/settings/public', requirePublicTenant, async (req, res) => {
  try {
    const tenant = await publicTenantId(req)
    const settings = await getSettings({ tenant })
    const body = {}
    for (const section of PUBLIC_SECTIONS) {
      body[section] = settings[section] || {}
    }
    // Las credenciales de MP son privadas del admin; jamás se exponen al público.
    // Solo se publica si la tienda puede cobrar online (sin revelar el token).
    if (body.payments) {
      body.payments.mercadopago = {
        onlineEnabled:
          settings.payments?.online !== false &&
          Boolean(settings.payments?.mercadopago?.accessToken),
      }
    }
    return res.json(body)
  } catch (error) {
    console.error('Public settings error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los datos de la tienda' })
  }
})

router.get('/admin/settings', requireAuth, requirePermission('settings.manage'), async (req, res) => {
  try {
    // El superadmin puede consultar la configuración global en modo
    // "Todos los negocios"; guardar cambios sigue exigiendo un tenant.
    const tenant = req.user?.role === 'superadmin' && !req.query?.tenant
      ? null
      : requireTenantIdOf(req)
    const settings = await getSettings({ tenant })
    return res.json(settings)
  } catch (error) {
    console.error('Settings read error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los ajustes' })
  }
})

router.put('/admin/settings', requireAuth, requirePermission('settings.manage'), requireTenant, async (req, res) => {
  const { section, value: requestedValue } = req.body || {}
  if (typeof section !== 'string' || !section || requestedValue === undefined) {
    return res.status(400).json({ error: 'Sección y valor requeridos' })
  }
  try {
    const value = requestedValue
    if (section === 'appearance') {
      const currentUser = await User.findById(req.user.sub).lean()
      if (!currentUser?.active || !['admin', 'superadmin'].includes(currentUser.role) || currentUser.role !== req.user.role) {
        return res.status(403).json({ error: 'Solo los administradores pueden personalizar la tienda' })
      }
    }
    if (section === 'roles' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Los permisos ahora se editan por usuario' })
    }
    const saved = await saveSettings({ section, value, tenant: requireTenantIdOf(req) })
    return res.json(saved[section] || {})
  } catch (error) {
    console.error('Settings save error:', error)
    if (error.message && error.message.includes('conocida')) {
      return res.status(400).json({ error: error.message })
    }
    return res.status(500).json({ error: 'No se pudieron guardar los ajustes' })
  }
})

router.post(
  '/admin/settings/media',
  requireAuth,
  requirePermission('settings.manage'),
  requireTenant,
  upload.single('file'),
  async (req, res) => {
    const field = String(req.body.field || '').trim()
    if (!['logo', 'cover', 'background', 'gaming'].includes(field)) {
      return res.status(400).json({ error: 'Campo inválido (logo, cover, background o gaming)' })
    }
    if (field === 'background') {
      const currentUser = await User.findById(req.user.sub).lean()
      if (!currentUser?.active || !['admin', 'superadmin'].includes(currentUser.role) || currentUser.role !== req.user.role) {
        return res.status(403).json({ error: 'Solo los administradores pueden personalizar la tienda' })
      }
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Imagen requerida' })
    }
    try {
      const tenant = requireTenantIdOf(req)
      const url = await uploadImage(req.file, { tenant })
      if (field === 'background' || field === 'gaming') return res.json({ [field]: url })
      const current = await getSettings({ tenant })
      const saved = await saveSettings({
        section: 'store',
        value: { ...(current.store || {}), [`${field}Url`]: url },
        tenant,
      })
      return res.json({ [field]: url, store: saved.store })
    } catch (error) {
      console.error('Settings media error:', error)
      return res.status(error.status || 500).json({ error: error.status ? error.message : 'No se pudo subir la imagen' })
    }
  },
)

export default router
