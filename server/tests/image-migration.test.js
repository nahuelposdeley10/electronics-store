import test from 'node:test'
import assert from 'node:assert/strict'
import { imageReferences, isCloudinaryImage } from '../lib/image-migration.js'
import { imageKey, uploadToR2 } from '../services/r2.js'

test('migration only selects the configured Cloudinary account and upload images', () => {
  const url = 'https://res.cloudinary.com/shop/image/upload/v1/photo.jpg'
  assert.deepEqual(imageReferences({ gallery: [url, 'https://example.com/a.jpg'], logo: url }, 'shop'), [
    { path: 'gallery.0', url }, { path: 'logo', url },
  ])
  for (const value of [url.replace('/shop/', '/other/'), url.replace('https:', 'http:'), url.replace('/image/', '/video/'), url.replace('.com/', '.com.evil/'), null]) {
    assert.equal(isCloudinaryImage(value, 'shop'), false)
  }
})

test('R2 keys isolate tenants and reject traversal; invalid images never upload', async () => {
  const a = imageKey('aaaaaaaaaaaaaaaaaaaaaaaa', 'same')
  const b = imageKey('bbbbbbbbbbbbbbbbbbbbbbbb', 'same')
  assert.notEqual(a, b)
  assert.match(imageKey(null, 'same'), /^stores\/global\//)
  assert.throws(() => imageKey('../other', 'same'))
  assert.throws(() => imageKey(null, '../other'))
  await assert.rejects(uploadToR2({ buffer: Buffer.from('<svg>unsafe</svg>') }), { status: 400 })
})
