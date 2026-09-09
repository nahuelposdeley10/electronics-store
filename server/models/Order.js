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
    status: { type: String, default: 'pending', index: true },
    items: [itemSchema],
    coupon: { type: String, default: null },
    subtotal: { type: Number, required: true },
    discount: { type: Number, required: true },
    shippingCost: { type: Number, required: true },
    total: { type: Number, required: true },
    paymentId: { type: Number, default: null },
    merchantOrderId: { type: Number, default: null },
  },
  { timestamps: true },
)

export const Order = mongoose.model('Order', orderSchema)