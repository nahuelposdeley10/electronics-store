import mongoose from 'mongoose'

const settingSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    key: { type: String, required: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
)

settingSchema.index({ key: 1, adminId: 1 }, { unique: true })

export const Setting = mongoose.model('Setting', settingSchema)