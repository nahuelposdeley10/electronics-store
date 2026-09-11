import mongoose from 'mongoose'

const variantSchema = new mongoose.Schema(
  {
    product: { type: Number, required: true, index: true },
    name: { type: String, required: true, trim: true },
    sku: { type: String, default: '', trim: true },
    price: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
  },
  { timestamps: true },
)

export const Variant = mongoose.model('Variant', variantSchema)