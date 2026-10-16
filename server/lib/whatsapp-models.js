import mongoose from 'mongoose'

// Contract consumed from the data agent's models:
// The data-agent models use tenant-scoped WhatsApp phone/contact tuples and
// a unique { adminId, externalId } message index for Meta retry idempotency.

let modelLoadPromise = null

async function loadModels() {
  if (modelLoadPromise) return modelLoadPromise
  modelLoadPromise = (async () => {
    const load = async (name, path) => {
      if (mongoose.models[name]) return mongoose.models[name]
      try {
        await import(path)
      } catch (error) {
        if (error?.code === 'ERR_MODULE_NOT_FOUND') return null
        throw error
      }
      return mongoose.models[name] || null
    }
    const [Conversation, Message] = await Promise.all([
      load('WhatsappConversation', '../models/WhatsAppConversation.js'),
      load('WhatsappMessage', '../models/WhatsAppMessage.js'),
    ])
    return { Conversation, Message }
  })()
  return modelLoadPromise
}
export async function whatsappDataAvailability() {
  const models = await loadModels()
  return { available: Boolean(models.Conversation && models.Message), models }
}

export async function upsertWhatsappInbound({ tenant, phoneNumberId, customerWaId, contactName, message }) {
  const { Conversation, Message } = await loadModels()
  if (!Conversation || !Message) return { available: false, duplicate: false, conversation: null, message: null }

  const now = message.timestamp || new Date()
  const conversation = await Conversation.findOneAndUpdate(
    { adminId: tenant, phoneNumberId, customerWaId },
    {
      $set: {
        contactName: contactName || '',
        lastMessageAt: now,
        lastInboundAt: now,
        lastMessagePreview: message.text || `[${message.type}]`,
      },
      $setOnInsert: { adminId: tenant, phoneNumberId, customerWaId, status: 'open' },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  )

  const existing = await Message.findOne({ adminId: tenant, externalId: message.externalId }).lean()
  if (existing) return { available: true, duplicate: true, conversation, message: existing }

  let created
  try {
    created = await Message.create({
      adminId: tenant,
      conversationId: conversation._id,
      phoneNumberId,
      customerWaId,
      externalId: message.externalId,
      direction: 'inbound',
      type: message.type === 'other' ? 'unknown' : message.type,
      text: message.text || null,
      mediaId: message.mediaId || null,
      status: 'received',
      timestamp: now,
      rawType: message.rawType || message.type,
    })
  } catch (error) {
    if (error?.code !== 11000) throw error
    const duplicate = await Message.findOne({ adminId: tenant, externalId: message.externalId }).lean()
    return { available: true, duplicate: true, conversation, message: duplicate }
  }
  return { available: true, duplicate: false, conversation, message: created }
}

export async function recordWhatsappOutbound({ tenant, phoneNumberId, customerWaId, conversationId, externalId, text, status = 'sent' }) {
  const { Conversation, Message } = await loadModels()
  if (!Conversation || !Message) return { available: false, message: null }
  if (!mongoose.Types.ObjectId.isValid(conversationId)) {
    const error = new Error('Conversación inválida')
    error.status = 400
    throw error
  }
  const conversation = await Conversation.findOne({ _id: conversationId, adminId: tenant }).lean()
  if (!conversation) {
    const error = new Error('Conversación no encontrada')
    error.status = 404
    throw error
  }
  if (String(conversation.customerWaId) !== String(customerWaId)) {
    const error = new Error('El destinatario no coincide con la conversación')
    error.status = 400
    throw error
  }
  const now = new Date()
  const message = await Message.create({
    adminId: tenant,
    conversationId,
    phoneNumberId,
    customerWaId,
    externalId: externalId || undefined,
    direction: 'outbound',
    type: 'text',
    text,
    status,
    timestamp: now,
    rawType: 'text',
  })
  await Conversation.updateOne(
    { _id: conversation._id, adminId: tenant },
    { $set: { lastMessageAt: now, lastOutboundAt: now, lastMessagePreview: text } },
  )
  return { available: true, message }
}

export async function updateWhatsappMessageStatus({ tenant, externalId, status }) {
  const { Message } = await loadModels()
  if (!Message) return { available: false, message: null }
  const message = await Message.findOneAndUpdate(
    { adminId: tenant, externalId },
    { $set: { status: ['received', 'queued', 'sent', 'delivered', 'read', 'failed', 'skipped'].includes(status) ? status : 'failed' } },
    { new: true },
  ).lean()
  return { available: true, message }
}

export async function listWhatsappConversations({ tenant, page = 1, limit = 30, status }) {
  const { Conversation } = await loadModels()
  if (!Conversation) return { available: false, items: [], total: 0 }
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 30))
  const filter = { adminId: tenant }
  if (['open', 'human', 'closed'].includes(status)) filter.status = status
  const [total, items] = await Promise.all([
    Conversation.countDocuments(filter),
    Conversation.find(filter).sort({ lastMessageAt: -1, updatedAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
  ])
  return { available: true, items, total, page: safePage, limit: safeLimit }
}

export async function listWhatsappMessages({ tenant, conversationId, page = 1, limit = 100 }) {
  const { Conversation, Message } = await loadModels()
  if (!Conversation || !Message) return { available: false, items: [], total: 0 }
  const conversation = await Conversation.findOne({ _id: conversationId, adminId: tenant }).lean()
  if (!conversation) return { available: true, conversation: null, items: [], total: 0 }
  const safePage = Math.max(1, Number(page) || 1)
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 100))
  const filter = { adminId: tenant, conversationId }
  const [total, items] = await Promise.all([
    Message.countDocuments(filter),
    Message.find(filter).sort({ timestamp: 1, createdAt: 1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
  ])
  return { available: true, conversation, items, total, page: safePage, limit: safeLimit }
}

export async function findWhatsappConversation({ tenant, conversationId }) {
  const { Conversation } = await loadModels()
  if (!Conversation) return { available: false, conversation: null }
  if (!mongoose.Types.ObjectId.isValid(conversationId)) return { available: true, conversation: null }
  const conversation = await Conversation.findOne({ _id: conversationId, adminId: tenant }).lean()
  return { available: true, conversation }
}

export async function setWhatsappConversationStatus({ tenant, conversationId, status, actorId }) {
  const { Conversation } = await loadModels()
  if (!Conversation) return { available: false, conversation: null }
  const update = { status }
  if (status === 'human') update.humanTakenOverAt = new Date()
  if (status === 'closed') update.closedAt = new Date()
  const conversation = await Conversation.findOneAndUpdate(
    { _id: conversationId, adminId: tenant },
    { $set: { ...update, ...(actorId ? { lastActorId: actorId } : {}) } },
    { new: true },
  ).lean()
  return { available: true, conversation }
}
