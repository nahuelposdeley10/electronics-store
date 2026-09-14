import mongoose from 'mongoose'

const userSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, required: true },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      required: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'admin', 'operator'], default: 'admin' },
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    businessSlug: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
      unique: true,
    },
    permissions: { type: [String] },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
)

userSchema.index({ adminId: 1, role: 1 })

export const User = mongoose.model('User', userSchema)