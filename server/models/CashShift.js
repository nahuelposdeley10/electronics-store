import mongoose from 'mongoose'

const shiftSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    openingBalance: { type: Number, required: true, min: 0 },
    expectedClose: { type: Number, default: null },
    closedBalance: { type: Number, default: null },
    difference: { type: Number, default: null },
    openedBy: { type: String, default: null },
    closedBy: { type: String, default: null },
    note: { type: String, default: '' },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

shiftSchema.index({ status: 1, openedAt: -1 })

export const CashShift = mongoose.model('CashShift', shiftSchema)