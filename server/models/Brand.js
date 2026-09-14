import mongoose from 'mongoose'

const brandSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

brandSchema.index({ adminId: 1, name: 1 }, { unique: true })

export const Brand = mongoose.model('Brand', brandSchema)