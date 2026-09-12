import mongoose from 'mongoose'

const discountSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    scope: {
      type: String,
      enum: ['global', 'category', 'brand', 'product'],
      required: true,
    },
    target: { type: String, trim: true, default: '' },
    percent: { type: Number, required: true, min: 1, max: 100 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

discountSchema.index({ active: 1, scope: 1, target: 1 })

export const Discount = mongoose.model('Discount', discountSchema)