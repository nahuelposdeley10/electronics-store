import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    percent: { type: Number, required: true, min: 1, max: 100 },
    active: { type: Boolean, default: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

export const Coupon = mongoose.model('Coupon', couponSchema)