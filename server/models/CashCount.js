import mongoose from 'mongoose'

const countSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashShift', index: true },
    expectedAmount: { type: Number, required: true },
    countedAmount: { type: Number, required: true },
    difference: { type: Number, required: true },
    note: { type: String, trim: true, default: '' },
    by: { type: String, default: null },
    byUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
  },
  { timestamps: true },
)

countSchema.index({ shiftId: 1, createdAt: -1 })

export const CashCount = mongoose.model('CashCount', countSchema)
