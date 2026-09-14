import mongoose from 'mongoose'
import { movementsExpireAt } from '../lib/retention.js'

const movementSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashShift', index: true },
    kind: { type: String, enum: ['venta', 'ingreso', 'egreso', 'devolucion'], default: 'ingreso' },
    flow: { type: String, enum: ['in', 'out'], required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
    ref: { type: String, default: null },
    by: { type: String, default: null },
    expiresAt: { type: Date, default: () => movementsExpireAt() },
  },
  { timestamps: true },
)

movementSchema.index({ shiftId: 1, createdAt: -1 })
movementSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const CashMovement = mongoose.model('CashMovement', movementSchema)