import 'dotenv/config'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { Product } from './models/Product.js'
import { seedProducts } from './data/products.js'

async function run() {
  await mongoose.connect(env.mongodbUri, { dbName: 'electronics-store' })

  for (const product of seedProducts) {
    await Product.findOneAndUpdate(
      { id: product.id },
      product,
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
    )
  }

  const count = await Product.countDocuments()
  console.log(`Productos en DB: ${count} (actualizados desde el catálogo)`)

  await mongoose.disconnect()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})