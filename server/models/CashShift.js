import mongoose from 'mongoose'

const shiftSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    number: { type: Number, required: true },
    status: { type: String, enum: ['open', 'closed'], default: 'open', index: true },
    openingBalance: { type: Number, required: true, min: 0 },
    expectedClose: { type: Number, default: null },
    closedBalance: { type: Number, default: null },
    difference: { type: Number, default: null },
    openedBy: { type: String, default: null },
    openedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    closedBy: { type: String, default: null },
    closedByUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    note: { type: String, default: '' },
    openedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

shiftSchema.index({ adminId: 1, status: 1, openedByUserId: 1, openedAt: -1 })
shiftSchema.index(
  { adminId: 1, openedByUserId: 1, status: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'open', openedByUserId: { $type: 'objectId' } },
  },
)

export const CashShift = mongoose.model('CashShift', shiftSchema)
