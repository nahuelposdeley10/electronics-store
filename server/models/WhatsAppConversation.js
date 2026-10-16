import mongoose from 'mongoose'

const whatsappConversationSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    phoneNumberId: { type: String, required: true, trim: true, index: true },
    customerWaId: { type: String, required: true, trim: true, index: true },
    contactName: { type: String, trim: true, default: '', maxlength: 160 },
    status: {
      type: String,
      enum: ['open', 'human', 'closed'],
      default: 'open',
      index: true,
    },
    lastMessageAt: { type: Date, default: null },
    lastInboundAt: { type: Date, default: null },
    lastOutboundAt: { type: Date, default: null },
    lastMessagePreview: { type: String, trim: true, default: '', maxlength: 280 },
    humanTakenOverAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    lastActorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, strict: true },
)

// The tuple is the WhatsApp conversation identity and is tenant-scoped.
whatsappConversationSchema.index(
  { adminId: 1, phoneNumberId: 1, customerWaId: 1 },
  { unique: true },
)
whatsappConversationSchema.index({ adminId: 1, status: 1, lastMessageAt: -1 })

export const WhatsAppConversation = mongoose.model('WhatsAppConversation', whatsappConversationSchema)
export const WhatsappConversation = WhatsAppConversation
