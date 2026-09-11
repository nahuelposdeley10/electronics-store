import mongoose from 'mongoose'

const categorySchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

export const Category = mongoose.model('Category', categorySchema)