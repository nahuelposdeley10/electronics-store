import mongoose from 'mongoose'

const itemSchema = new mongoose.Schema(
  {
    productId: { type: Number, required: true },
    name: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false },
)

const orderSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    status: { type: String, default: 'pending', index: true },
    refreshToken: { type: String, default: null, index: true },
    stockDeducted: { type: Boolean, default: false },
    items: [itemSchema],
    coupon: { type: String, default: null },
    subtotal: { type: Number, required: true },
    discount: { type: Number, required: true },
    shippingCost: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentId: { type: Number, default: null },
    merchantOrderId: { type: Number, default: null },
    payerEmail: { type: String, default: null },
    payerName: { type: String, default: null },
    payerSurname: { type: String, default: null },
    payerIdType: { type: String, default: null },
    payerIdNumber: { type: String, default: null },
    cashReceived: { type: Number, default: null },
    change: { type: Number, default: null },
    soldBy: { type: String, default: null },
    demo: { type: Boolean, default: false },
    source: { type: String, default: 'web' },
    payment: { type: String, default: null },
    returnedAt: { type: Date, default: null },
  },
  { timestamps: true },
)

orderSchema.index({ adminId: 1, status: 1, createdAt: -1 })
orderSchema.index({ paymentId: 1 })

export const Order = mongoose.model('Order', orderSchema)