import mongoose from 'mongoose'

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Brand = mongoose.model('Brand', brandSchema)