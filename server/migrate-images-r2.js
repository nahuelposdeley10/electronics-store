import 'dotenv/config'
import mongoose from 'mongoose'
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises'
import { resolve } from 'node:path'
import { imageReferences, downloadImage } from './lib/image-migration.js'
import { imageHash, imageKey, r2Config, uploadToR2 } from './services/r2.js'

const mode = process.argv[2] || 'inventory'
const modes = ['inventory', 'copy', 'apply', 'rollback']
const directory = resolve('.r2-migration')
const manifestPath = resolve(directory, 'manifest.json')
async function save(manifest) {
  await mkdir(directory, { recursive: true })
  await writeFile(`${manifestPath}.tmp`, JSON.stringify(manifest, null, 2))
  await rename(`${manifestPath}.tmp`, manifestPath)
}

async function main() {
  if (!modes.includes(mode)) throw new Error(`Modo inválido: ${modes.join(', ')}`)
  if (!process.argv.includes('--all-tenants')) throw new Error('Indicá --all-tenants para procesar las imágenes de todas las tiendas')
  if (!process.env.MONGODB_URI || !process.env.CLOUDINARY_CLOUD_NAME) throw new Error('Faltan MONGODB_URI o CLOUDINARY_CLOUD_NAME')
  const manifest = mode === 'inventory' ? { version: 1, entries: [] } : JSON.parse(await readFile(manifestPath, 'utf8'))
  if (mode === 'copy' || mode === 'apply') r2Config()
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'electronics-store', serverSelectionTimeoutMS: 15000 })
  const db = mongoose.connection.db
  if (mode === 'inventory') {
    // Avoid overwriting a migration journal that is needed for rollback.
    try { await readFile(manifestPath); throw new Error('Ya existe un manifiesto; conservá su backup antes de iniciar otro inventario') }
    catch (error) { if (error.code !== 'ENOENT') throw error }
    for (const [collection, fields] of [['products', ['image', 'images']], ['settings', ['value']]]) {
      const projection = Object.fromEntries(['adminId', ...fields].map((key) => [key, 1]))
      for await (const doc of db.collection(collection).find({}, { projection })) {
        for (const field of fields) {
          for (const ref of imageReferences(doc[field], process.env.CLOUDINARY_CLOUD_NAME, field)) {
            const tenant = doc.adminId?.toString() || null
            manifest.entries.push({ collection, id: doc._id.toString(), tenant, path: ref.path, source: ref.url,
              key: imageKey(tenant, imageHash(Buffer.from(ref.url))) })
          }
        }
      }
    }
    await save(manifest)
    console.log(`Inventario: ${manifest.entries.length} referencias; ${new Set(manifest.entries.map((entry) => entry.key)).size} imágenes por tienda.`)
    return
  }
  if (mode === 'copy') {
    const copied = new Map()
    for (const entry of manifest.entries) {
      let result = copied.get(entry.key)
      if (!result) {
        // Repeat copies safely with deterministic keys. No DB changes in this phase.
        const buffer = await downloadImage(entry.source)
        const target = await uploadToR2({ buffer }, { tenant: entry.tenant, key: entry.key })
        const hash = imageHash(buffer)
        if (imageHash(await downloadImage(target)) !== hash) throw new Error(`Verificación falló para ${entry.key}`)
        result = { target, hash, bytes: buffer.length }
        copied.set(entry.key, result)
      }
      Object.assign(entry, result)
      await save(manifest)
    }
    console.log(`Copiadas y verificadas ${copied.size} imágenes. La base sigue usando Cloudinary.`)
    return
  }
  if (mode === 'apply') {
    // Verify ALL public objects before modifying the first database reference.
    const verified = new Set()
    for (const entry of manifest.entries) {
      if (!entry.target || !entry.hash) throw new Error('Primero completá el modo copy')
      if (!verified.has(entry.target)) {
        if (imageHash(await downloadImage(entry.target)) !== entry.hash) throw new Error(`Verificación falló para ${entry.key}`)
        verified.add(entry.target)
      }
    }
  }
  let updated = 0
  for (const entry of manifest.entries) {
    if (!entry.target) continue
    const from = mode === 'apply' ? entry.source : entry.target
    const to = mode === 'apply' ? entry.target : entry.source
    const identity = { _id: new mongoose.Types.ObjectId(entry.id), adminId: entry.tenant ? new mongoose.Types.ObjectId(entry.tenant) : null }
    // Compare-and-set per field preserves concurrent edits and tenant ownership.
    const result = await db.collection(entry.collection).updateOne({ ...identity, [entry.path]: from }, { $set: { [entry.path]: to } })
    if (!result.matchedCount) {
      const alreadyApplied = await db.collection(entry.collection).findOne({ ...identity, [entry.path]: to }, { projection: { _id: 1 } })
      if (!alreadyApplied) throw new Error(`Conflicto: ${entry.collection}/${entry.id}/${entry.path}. Revisar antes de continuar.`)
    }
    updated += result.modifiedCount
  }
  console.log(`${mode}: ${updated} referencias actualizadas. No se borraron imágenes de ningún proveedor.`)
}

try { await main() }
catch (error) { console.error(error.message); process.exitCode = 1 }
finally { await mongoose.disconnect() }
