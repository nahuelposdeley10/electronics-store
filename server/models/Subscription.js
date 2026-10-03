import mongoose from 'mongoose'

const paymentSchema = new mongoose.Schema({
  requestId: { type: String, required: true },
  amount: { type: Number, required: true, min: 0.01 },
  paidAt: { type: String, required: true },
  dueDate: { type: String, required: true },
  method: { type: String, enum: ['transferencia', 'efectivo', 'otro'], required: true },
  reference: { type: String, default: '', maxlength: 200 },
  plan: { type: String, required: true },
  recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now },
}, { _id: false })

const schema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  planCode: { type: String, enum: ['', 'inicial', 'profesional', 'negocio'], default: '' },
  plan: { type: String, default: '', maxlength: 80 },
  price: { type: Number, default: 0, min: 0 },
  dueDate: { type: String, default: '' },
  status: { type: String, enum: ['unconfigured', 'trial', 'active', 'paused', 'cancelled'], default: 'unconfigured' },
  revision: { type: Number, default: 0 },
  billing: {
    provider: { type: String, enum: ['mercadopago'], default: 'mercadopago' },
    preapprovalId: { type: String, default: '' },
    initPoint: { type: String, default: '' },
    createdAt: { type: Date, default: null },
    status: { type: String, default: 'pending' },
  },
  payments: { type: [paymentSchema], default: [] },
}, { timestamps: true })

export const Subscription = mongoose.model('Subscription', schema)
