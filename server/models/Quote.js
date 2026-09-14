import mongoose from 'mongoose'

const quoteItemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const quoteSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    number: { type: Number, required: true },
    status: { type: String, default: 'draft', index: true },
    customer: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      email: { type: String, default: '' },
    },
    items: [quoteItemSchema],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    note: { type: String, default: '' },
  },
  { timestamps: true },
)

quoteSchema.index({ adminId: 1, number: 1 }, { unique: true })

export const Quote = mongoose.model('Quote', quoteSchema)