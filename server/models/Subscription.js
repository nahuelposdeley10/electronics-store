import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  paidAt: { type: String, required: true },
  dueDate: { type: String, required: true },
  method: { type: String, enum: ['transferencia', 'efectivo', 'otro', 'mercadopago'], required: true },
  reference: { type: String, default: '', maxlength: 200 },
  plan: { type: String, required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  providerPaymentId: { type: String, default: '' },
  providerStatus: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const schema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  planCode: { type: String, enum: ['', 'inicial', 'profesional', 'negocio'], default: '' },
  plan: { type: String, default: '', maxlength: 80 },
  price: { type: Number, default: 0, min: 0 },
  dueDate: { type: String, default: '' },
  status: { type: String, enum: ['unconfigured', 'trial', 'active', 'paused', 'cancelled'], default: 'unconfigured' },
  trialEndedEmailSentAt: { type: Date, default: null },
  paymentFailureEmailSentAt: { type: Date, default: null },
  graceReminderDueDate: { type: String, default: '' },
  graceSuspensionDueDate: { type: String, default: '' },
  pausedAt: { type: Date, default: null },
  pauseReason: { type: String, enum: ['', 'trial_expired', 'payment_failed', 'manual'], default: '' },
  revision: { type: Number, default: 0 },
  billing: {
    provider: { type: String, enum: ['mercadopago'], default: 'mercadopago' },
    preapprovalId: { type: String, default: '' },
    initPoint: { type: String, default: '' },
    createdAt: { type: Date, default: null },
    status: { type: String, default: 'pending' },
    lastPaymentId: { type: String, default: '' },
    lastPaymentStatus: { type: String, default: '' },
    lastPaymentAt: { type: Date, default: null },
  },
  payments: { type: [paymentSchema], default: [] },
}, { timestamps: true })

export const Subscription = mongoose.model('Subscription', schema)
