import express from 'express'
import { requireAuth, requirePermission, requireRole, requireSubscriptionAccess } from '../middleware/auth.js'
import { requireTenantIdOf } from '../lib/tenant.js'
import { getWhatsappConfig, publicWhatsappConfig, saveWhatsappConfig } from '../lib/whatsapp-config.js'
import { whatsappAiAvailability } from '../services/whatsapp-ai.js'
import { sendWhatsappText } from '../services/whatsapp-cloud.js'
import {
  listWhatsappConversations,
  listWhatsappMessages,
  findWhatsappConversation,
  setWhatsappConversationStatus,
  whatsappDataAvailability,
} from '../lib/whatsapp-models.js'

const router = express.Router()

router.use(requireAuth, requireSubscriptionAccess, requirePermission('settings.manage'), requireRole('admin', 'superadmin'))

function tenantFor(req, res) {
  try {
    return requireTenantIdOf(req)
  } catch (error) {
    res.status(error.status || 400).json({ error: error.message })
    return null
  }
}

function handleError(res, error, fallback) {
  if (error?.status) return res.status(error.status).json({ error: error.message })
  console.error(fallback, error)
  return res.status(500).json({ error: fallback })
}

router.get('/admin/whatsapp', async (req, res) => {
  const tenant = tenantFor(req, res)
  if (!tenant) return
  try {
    const [config, data] = await Promise.all([
      getWhatsappConfig(tenant),
      whatsappDataAvailability(),
    ])
    const conversations = data.available
      ? await listWhatsappConversations({ tenant, page: 1, limit: 5 })
      : { available: false, items: [], total: 0 }
    return res.json({
      connection: publicWhatsappConfig(config),
      ai: whatsappAiAvailability(),
      conversations: {
        available: conversations.available,
        total: conversations.total,
        preview: conversations.items,
      },
      webhook: {
        callbackPath: '/api/whatsapp/webhook',
        verificationConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
        signatureConfigured: Boolean(process.env.WHATSAPP_APP_SECRET),
      },
    })
  } catch (error) {
    return handleError(res, error, 'No se pudo leer la conexión de WhatsApp')
  }
})

router.put('/admin/whatsapp', async (req, res) => {
  const tenant = tenantFor(req, res)
  if (!tenant) return
  try {
    const saved = await saveWhatsappConfig(tenant, req.body || {})
    return res.json({ connection: saved, ai: whatsappAiAvailability() })
  } catch (error) {
    return handleError(res, error, 'No se pudo guardar la conexión de WhatsApp')
  }
})

router.get('/admin/whatsapp/conversations', async (req, res) => {
  const tenant = tenantFor(req, res)
  if (!tenant) return
  try {
    const result = await listWhatsappConversations({
      tenant,
      page: req.query.page,
      limit: req.query.limit,
      status: req.query.status,
    })
    if (!result.available) return res.status(503).json({ error: 'La bandeja de conversaciones todavía no está disponible' })
    return res.json(result)
  } catch (error) {
    return handleError(res, error, 'No se pudieron leer las conversaciones')
  }
})

router.get('/admin/whatsapp/conversations/:conversationId/messages', async (req, res) => {
  const tenant = tenantFor(req, res)
  if (!tenant) return
  try {
    const result = await listWhatsappMessages({ tenant, conversationId: req.params.conversationId, page: req.query.page, limit: req.query.limit })
    if (!result.available) return res.status(503).json({ error: 'La bandeja de conversaciones todavía no está disponible' })
    if (!result.conversation) return res.status(404).json({ error: 'Conversación no encontrada' })
    return res.json(result)
  } catch (error) {
    return handleError(res, error, 'No se pudieron leer los mensajes')
  }
})

router.post('/admin/whatsapp/conversations/:conversationId/status', async (req, res) => {
  const tenant = tenantFor(req, res)
  if (!tenant) return
  const status = String(req.body?.status || '').trim()
  if (!['open', 'human', 'closed'].includes(status)) return res.status(400).json({ error: 'Estado de conversación inválido' })
  try {
    const result = await setWhatsappConversationStatus({ tenant, conversationId: req.params.conversationId, status, actorId: req.user?.sub })
    if (!result.available) return res.status(503).json({ error: 'La bandeja de conversaciones todavía no está disponible' })
    if (!result.conversation) return res.status(404).json({ error: 'Conversación no encontrada' })
    return res.json(result.conversation)
  } catch (error) {
    return handleError(res, error, 'No se pudo actualizar la conversación')
  }
})

router.post('/admin/whatsapp/conversations/:conversationId/reply', async (req, res) => {
  const tenant = tenantFor(req, res)
  if (!tenant) return
  const text = String(req.body?.text || '').trim()
  if (!text) return res.status(400).json({ error: 'El mensaje es requerido' })
  try {
    const conversation = await findWhatsappConversation({ tenant, conversationId: req.params.conversationId })
    if (!conversation.available) return res.status(503).json({ error: 'La bandeja de conversaciones todavía no está disponible' })
    if (!conversation.conversation) return res.status(404).json({ error: 'Conversación no encontrada' })
    const to = conversation.conversation.customerWaId
    const result = await sendWhatsappText({
      tenant,
      to,
      text,
      conversationId: req.params.conversationId,
      allowWhenDisabled: true,
    })
    return res.json({ ok: true, id: result.externalId, stored: result.stored.available })
  } catch (error) {
    return handleError(res, error, 'No se pudo enviar el mensaje')
  }
})

export default router
