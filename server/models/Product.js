import mongoose from 'mongoose'

const productSchema = new mongoose.Schema(
  {
    adminId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    id: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    brand: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    price: { type: Number, required: true },
    oldPrice: { type: Number, default: null },
    costPrice: { type: Number, default: 0 },
    onSale: { type: Boolean, default: false },
    freeShipping: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    stock: { type: Number, default: 0 },
    minStock: { type: Number, default: 0 },
    badge: { type: String, default: null },
    image: { type: String, default: '' },
    images: { type: [String], default: [], validate: { validator: (images) => images.length <= 3, message: 'Máximo 3 imágenes por producto' } },
    description: { type: String, default: '' },
    specs: { type: [String], default: [] },
  },
  { timestamps: true },
)

productSchema.index({ adminId: 1, id: 1 }, { unique: true })

export const Product = mongoose.model('Product', productSchema)