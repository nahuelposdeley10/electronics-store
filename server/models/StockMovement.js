import mongoose from 'mongoose'

const stockMovementSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    productId: { type: Number, required: true },
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

stockMovementSchema.index({ adminId: 1, createdAt: -1 })
stockMovementSchema.index({ productId: 1 })

export const StockMovement = mongoose.model('StockMovement', stockMovementSchema)