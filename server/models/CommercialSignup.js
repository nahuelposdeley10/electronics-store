import mongoose from 'mongoose'

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  email: { type: String, required: true, trim: true, lowercase: true, maxlength: 180 },
  storeName: { type: String, required: true, trim: true, maxlength: 160 },
  businessSlug: { type: String, required: true, trim: true, lowercase: true, maxlength: 80 },
  planCode: { type: String, enum: ['inicial', 'profesional', 'negocio'], required: true },
  planName: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending_payment', 'ready', 'activated', 'cancelled'], default: 'pending_payment' },
  billing: {
    provider: { type: String, enum: ['mercadopago'], default: 'mercadopago' },
    preapprovalId: { type: String, default: '' },
    initPoint: { type: String, default: '' },
    status: { type: String, default: 'pending' },
  },
  activationTokenHash: { type: String, default: '' },
  activationTokenExpiresAt: { type: Date, default: null },
  activationSentAt: { type: Date, default: null },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true })

schema.index({ email: 1, status: 1 })
schema.index({ 'billing.preapprovalId': 1 }, { sparse: true })

export const CommercialSignup = mongoose.model('CommercialSignup', schema)
