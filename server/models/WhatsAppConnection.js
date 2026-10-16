import mongoose from 'mongoose'
import { sanitizeWhatsAppErrorMessage } from '../lib/whatsapp-persistence.js'

const credentialReferencesSchema = new mongoose.Schema(
  {
    accessTokenRef: { type: String, trim: true, default: null },
    appSecretRef: { type: String, trim: true, default: null },
    verifyTokenRef: { type: String, trim: true, default: null },
  },
  { _id: false, strict: true },
)

const whatsappConnectionSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    provider: {
      type: String,
      enum: ['meta-cloud'],
      default: 'meta-cloud',
      required: true,
    },
    status: {
      type: String,
      enum: ['disconnected', 'pending', 'connected', 'paused', 'error'],
      default: 'disconnected',
      index: true,
    },
    enabled: { type: Boolean, default: false },
    aiEnabled: { type: Boolean, default: false },
    phoneNumberId: { type: String, required: true, trim: true },
    businessAccountId: { type: String, trim: true, default: null },
    displayPhoneNumber: { type: String, trim: true, default: '' },
    verifiedName: { type: String, trim: true, default: '' },
    // References only. Tokens and app secrets are resolved outside MongoDB.
    credentialRefs: {
      type: credentialReferencesSchema,
      default: () => ({}),
      select: false,
    },
    connectionSource: {
      type: String,
      enum: ['embedded-signup', 'manual', 'migration'],
      default: 'manual',
    },
    lastWebhookAt: { type: Date, default: null },
    lastConnectedAt: { type: Date, default: null },
    lastErrorCode: { type: String, trim: true, default: null },
    lastErrorMessage: { type: String, trim: true, default: null, maxlength: 500, set: sanitizeWhatsAppErrorMessage },
  },
  { timestamps: true, strict: true },
)

// A tenant cannot register the same phone twice, and a Meta phone ID cannot
// be shared accidentally by two tenants.
whatsappConnectionSchema.index({ adminId: 1, phoneNumberId: 1 }, { unique: true })
whatsappConnectionSchema.index({ phoneNumberId: 1 }, { unique: true })
whatsappConnectionSchema.index({ adminId: 1, status: 1 })

export const WhatsAppConnection = mongoose.model('WhatsAppConnection', whatsappConnectionSchema)
export const WhatsappConnection = WhatsAppConnection
