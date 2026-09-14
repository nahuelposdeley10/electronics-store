import express from 'express'
import multer from 'multer'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { getSettings, saveSettings } from '../lib/settings.js'
import { uploadToCloudinary } from '../services/cloudinary.js'
import { publicTenantId, requireTenantIdOf } from '../lib/tenant.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

const PUBLIC_SECTIONS = ['store', 'shipping', 'general', 'payments']

function requireTenant(req, res, next) {
  try {
    requireTenantIdOf(req)
    next()
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message })
  }
}

router.get('/settings/public', async (req, res) => {
  try {
    const tenant = await publicTenantId(req)
    const settings = await getSettings({ tenant })
    const body = {}
    for (const section of PUBLIC_SECTIONS) {
      body[section] = settings[section] || {}
    }
    return res.json(body)
  } catch (error) {
    console.error('Public settings error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los datos de la tienda' })
  }
})

router.get('/admin/settings', requireAuth, requirePermission('settings.manage'), requireTenant, async (req, res) => {
  try {
    const settings = await getSettings({ tenant: requireTenantIdOf(req) })
    return res.json(settings)
  } catch (error) {
    console.error('Settings read error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los ajustes' })
  }
})

router.put('/admin/settings', requireAuth, requirePermission('settings.manage'), requireTenant, async (req, res) => {
  const { section, value: requestedValue } = req.body || {}
  if (!section || requestedValue === undefined) {
    return res.status(400).json({ error: 'Sección y valor requeridos' })
  }
  try {
    const value = requestedValue
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
    if (!['logo', 'cover'].includes(field)) {
      return res.status(400).json({ error: 'Campo inválido (logo o cover)' })
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Imagen requerida' })
    }
    try {
      const tenant = requireTenantIdOf(req)
      const url = await uploadToCloudinary(req.file)
      const current = await getSettings({ tenant })
      const saved = await saveSettings({
        section: 'store',
        value: { ...(current.store || {}), [`${field}Url`]: url },
        tenant,
      })
      return res.json({ [field]: url, store: saved.store })
    } catch (error) {
      console.error('Settings media error:', error)
      return res.status(500).json({ error: 'No se pudo subir la imagen' })
    }
  },
)

export default router