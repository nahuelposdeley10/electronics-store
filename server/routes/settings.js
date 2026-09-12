import express from 'express'
import multer from 'multer'
import { requireAuth, requirePermission } from '../middleware/auth.js'
import { getSettings, saveSettings } from '../lib/settings.js'
import { uploadToCloudinary } from '../services/cloudinary.js'

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
})

const PUBLIC_SECTIONS = ['store', 'shipping', 'general']

router.get('/settings/public', async (req, res) => {
  try {
    const settings = await getSettings()
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

router.get('/admin/settings', requireAuth, requirePermission('settings.manage'), async (req, res) => {
  try {
    const settings = await getSettings()
    return res.json(settings)
  } catch (error) {
    console.error('Settings read error:', error)
    return res.status(500).json({ error: 'No se pudieron leer los ajustes' })
  }
})

router.put('/admin/settings', requireAuth, requirePermission('settings.manage'), async (req, res) => {
  const { section, value } = req.body || {}
  if (!section || value === undefined) {
    return res.status(400).json({ error: 'Sección y valor requeridos' })
  }
  try {
    const saved = await saveSettings({ section, value })
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
      const url = await uploadToCloudinary(req.file)
      const current = await getSettings()
      const saved = await saveSettings({
        section: 'store',
        value: { ...(current.store || {}), [`${field}Url`]: url },
      })
      return res.json({ [field]: url, store: saved.store })
    } catch (error) {
      console.error('Settings media error:', error)
      return res.status(500).json({ error: 'No se pudo subir la imagen' })
    }
  },
)

export default router