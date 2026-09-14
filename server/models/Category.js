import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    key: { type: String, required: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

categorySchema.index({ adminId: 1, key: 1 }, { unique: true })

export const Category = mongoose.model('Category', categorySchema)