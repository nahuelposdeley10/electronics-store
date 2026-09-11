import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number, default: null },
    onSale: { type: Boolean, default: false },
    freeShipping: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    badge: { type: String, default: null },
    image: { type: String, default: '' },
    description: { type: String, default: '' },
    specs: { type: [String], default: [] },
  },
  { timestamps: true },
)

export const Product = mongoose.model('Product', productSchema)