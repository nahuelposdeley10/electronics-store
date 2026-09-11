import mongoose from 'mongoose'

const stockMovementSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true, index: true },
    productName: { type: String, required: true, trim: true },
    delta: { type: Number, required: true },
    type: {
      type: String,
      enum: ['venta', 'compra', 'ajuste', 'devolucion', 'inventario'],
      default: 'ajuste',
    },
    reason: { type: String, default: '', trim: true },
    ref: { type: String, default: null },
    stockBefore: { type: Number, required: true },
    stockAfter: { type: Number, required: true },
    createdBy: { type: String, default: null },
  },
  { timestamps: true },
)

stockMovementSchema.index({ createdAt: -1 })

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema)