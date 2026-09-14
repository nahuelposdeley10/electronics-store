import mongoose from 'mongoose'

const couponSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    percent: { type: Number, required: true, min: 1, max: 100 },
    active: { type: Boolean, default: true },
    description: { type: String, trim: true, default: '' },
  },
  { timestamps: true },
)

couponSchema.index({ adminId: 1, code: 1 }, { unique: true })

export const Coupon = mongoose.model('Coupon', couponSchema)