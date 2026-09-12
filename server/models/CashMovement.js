import mongoose from 'mongoose'

const movementSchema = new mongoose.Schema(
  {
    shiftId: { type: mongoose.Schema.Types.ObjectId, ref: 'CashShift', index: true },
    kind: { type: String, enum: ['venta', 'ingreso', 'egreso', 'devolucion'], default: 'ingreso' },
    flow: { type: String, enum: ['in', 'out'], required: true },
    amount: { type: Number, required: true, min: 0 },
    description: { type: String, trim: true, default: '' },
    ref: { type: String, default: null },
    by: { type: String, default: null },
  },
  { timestamps: true },
)

movementSchema.index({ shiftId: 1, createdAt: -1 })

export const CashMovement = mongoose.model('CashMovement', movementSchema)