import mongoose from 'mongoose'

const whatsappMessageSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WhatsAppConversation',
      required: true,
      index: true,
    },
    phoneNumberId: { type: String, required: true, trim: true, index: true },
    customerWaId: { type: String, required: true, trim: true, index: true },
    // Meta's wamid for inbound events. Outbound attempts may be created before
    // Meta returns a message ID; the sparse index keeps those documents valid.
    externalId: { type: String, trim: true, default: undefined },
    direction: {
      type: String,
      enum: ['inbound', 'outbound'],
      required: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'audio', 'video', 'document', 'interactive', 'location', 'reaction', 'unknown'],
      default: 'text',
    },
    text: { type: String, trim: true, default: null, maxlength: 10000 },
    mediaId: { type: String, trim: true, default: null },
    status: {
      type: String,
      enum: ['received', 'queued', 'sent', 'delivered', 'read', 'failed', 'skipped'],
      default: 'received',
      index: true,
    },
    timestamp: { type: Date, default: Date.now },
    rawType: { type: String, trim: true, default: null },
  },
  { timestamps: true, strict: true },
)

// Webhook retries with the same wamid are idempotent within one tenant.
whatsappMessageSchema.index(
  { adminId: 1, externalId: 1 },
  {
    unique: true,
    partialFilterExpression: { externalId: { $type: 'string' } },
  },
)
whatsappMessageSchema.index({ adminId: 1, conversationId: 1, timestamp: 1, createdAt: 1 })
whatsappMessageSchema.index({ adminId: 1, phoneNumberId: 1, customerWaId: 1, timestamp: -1 })

export const WhatsAppMessage = mongoose.model('WhatsAppMessage', whatsappMessageSchema)
export const WhatsappMessage = WhatsAppMessage
