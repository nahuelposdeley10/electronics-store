import mongoose from 'mongoose'

const onboardingSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  lastStep: { type: String, default: 'business' },
  paused: { type: Boolean, default: false },
  shippingSignature: { type: String, default: '' },
  reviewSignature: { type: String, default: '' },
  completedAt: { type: Date, default: null },
}, { timestamps: true })

export const Onboarding = mongoose.model('Onboarding', onboardingSchema)
