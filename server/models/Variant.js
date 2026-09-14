import mongoose from 'mongoose'

const variantSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    product: { type: Number, required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: '', trim: true },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true },
)

variantSchema.index({ adminId: 1, product: 1 })

export const Variant = mongoose.model('Variant', variantSchema)