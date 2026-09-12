import mongoose from 'mongoose'

const purchaseSchema = new mongoose.Schema(
  {
    number: { type: Number, required: true, unique: true },
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

purchaseSchema.index({ createdAt: -1 })

export const Purchase = mongoose.model('Purchase', purchaseSchema)