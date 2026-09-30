import test from 'node:test'
import assert from 'node:assert/strict'
import { productImages, retainedProductImages } from '../lib/product-images.js'
import { Product } from '../models/Product.js'

test('product galleries preserve legacy images and allow adding, removing and replacing', () => {
  const legacy = { image: 'old.jpg', images: [] }
  assert.deepEqual(productImages(legacy), ['old.jpg'])
  assert.deepEqual(retainedProductImages(undefined, legacy), ['old.jpg'])
  assert.deepEqual(retainedProductImages('["old.jpg"]', legacy, 2), ['old.jpg'])
  assert.deepEqual(retainedProductImages('[]', legacy), [])
  assert.deepEqual(retainedProductImages(undefined, legacy, 1), [])
})

test('gallery rejects more than three images and foreign or malformed retained images', async () => {
  const product = { images: ['a', 'b', 'c'] }
  for (const [raw, count] of [['["a","b","c"]', 1], ['["foreign"]', 0], ['["a","a"]', 0], ['{}', 0], ['invalid', 0]]) {
    assert.throws(() => retainedProductImages(raw, product, count), { status: 400 })
  }
  const doc = new Product({ id: 1, name: 'Test', brand: 'Test', category: 'audio', price: 10, images: ['a', 'b', 'c', 'd'] })
  await assert.rejects(doc.validate(), (error) => Boolean(error.errors.images))
  doc.images = ['a', 'b', 'c']
  await doc.validate()
})
