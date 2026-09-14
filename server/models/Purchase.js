import mongoose from 'mongoose'

const purchaseSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    number: { type: Number, required: true },
    supplier: { type: String, required: true, trim: true },
    invoice: { type: String, default: '', trim: true },
    items: [
      {
        productId: { type: Number, required: true },
        name: { type: String, required: true, trim: true },
        quantity: { type: Number, required: true },
        cost: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    total: { type: Number, required: true },
    createdBy: { type: String, default: null },
  },
  { timestamps: true },
)

purchaseSchema.index({ adminId: 1, number: 1 }, { unique: true })
purchaseSchema.index({ adminId: 1, createdAt: -1 })

export const Purchase = mongoose.model('Purchase', purchaseSchema)