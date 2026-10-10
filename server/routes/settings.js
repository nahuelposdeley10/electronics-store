import express from 'express'
import multer from 'multer'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { getSettings, saveSettings } from '../lib/settings.js'
import { uploadImage } from '../services/images.js'
import { publicTenantId, requirePublicTenant, requireTenantIdOf } from '../lib/tenant.js'
import { allowedImageFilter } from '../lib/image-guard.js'
import { User } from '../models/User.js'
import { getTenantPlan } from '../lib/plans.js'
import { getArcaStatus, publicArcaError, saveArcaCredentials, testArcaConnection } from '../services/arca.js'
import { ArcaCredential } from '../models/ArcaCredential.js'

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
    const settings = await getSettings({ fresh: true, tenant })
    const plan = await getTenantPlan(tenant)
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
          plan.includes('onlinePayments') &&
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
    const settings = await getSettings({ fresh: true, tenant })
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
    const tenant = requireTenantIdOf(req)
    if (section === 'appearance') {
      const currentUser = await User.findById(req.user.sub).lean()
      if (!currentUser?.active || !['admin', 'superadmin'].includes(currentUser.role) || currentUser.role !== req.user.role) {
        return res.status(403).json({ error: 'Solo los administradores pueden personalizar la tienda' })
      }
    }
    if (section === 'roles' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Los permisos ahora se editan por usuario' })
    }
    if (section === 'payments' && req.user.role !== 'superadmin') {
      const plan = await getTenantPlan(tenant)
      if (!plan.includes('onlinePayments')) {
        return res.status(403).json({ error: 'Mercado Pago está disponible desde el plan Profesional' })
      }
    }
    if (section === 'fiscal' && value?.mode === 'arca') {
      const arca = await getArcaStatus(tenant)
      if (!arca.configured || !arca.enabled) {
        return res.status(400).json({ error: 'Primero guardá y activá la conexión ARCA de este negocio' })
      }
    }
    const saved = await saveSettings({ section, value, tenant })
    return res.json(saved[section] || {})
  } catch (error) {
    console.error('Settings save error:', error)
    if (error.status || error.message?.includes('conocida')) {
      return res.status(error.status || 400).json({ error: error.message })
    }
    return res.status(500).json({ error: 'No se pudieron guardar los ajustes' })
  }
})

router.get('/admin/fiscal/arca', requireAuth, requirePermission('settings.manage'), requireTenant, async (req, res) => {
  try {
    return res.json(await getArcaStatus(requireTenantIdOf(req)))
  } catch (error) {
    const response = publicArcaError(error)
    return res.status(error.status || 500).json(response)
  }
})

router.put('/admin/fiscal/arca', requireAuth, requirePermission('settings.manage'), requireTenant, async (req, res) => {
  try {
    const saved = await saveArcaCredentials({ tenant: requireTenantIdOf(req), input: req.body || {} })
    return res.json(saved)
  } catch (error) {
    const response = publicArcaError(error)
    return res.status(error.status || 400).json(response)
  }
})

router.post('/admin/fiscal/arca/test', requireAuth, requirePermission('settings.manage'), requireTenant, async (req, res) => {
  const tenant = requireTenantIdOf(req)
  try {
    const result = await testArcaConnection(tenant)
    await ArcaCredential.updateOne({ adminId: tenant }, { $set: { lastTestAt: new Date(), lastTestStatus: 'ok', lastError: null } })
    return res.json(result)
  } catch (error) {
    await ArcaCredential.updateOne({ adminId: tenant }, { $set: { lastTestAt: new Date(), lastTestStatus: 'error', lastError: String(error.message || 'Error de conexión').slice(0, 500) } }).catch(() => {})
    const response = publicArcaError(error)
    return res.status(error.status || 502).json(response)
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
