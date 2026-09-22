import 'dotenv/config'
import mongoose from 'mongoose'
import { User } from '../models/User.js'
import { Product } from '../models/Product.js'
import { Category } from '../models/Category.js'
import { Brand } from '../models/Brand.js'
import { buildPublicCatalogFilter, parseMetaFilter } from '../lib/catalog-query.js'
import { deleteCatalogMeta } from '../lib/catalog-meta.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

async function makeAdmin() {
  const email = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@test.com`
  const user = await User.create({ name: 'Admin', email, passwordHash: 'x', role: 'admin' })
  return user
}

async function main() {
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-catalog-meta'
  await mongoose.connect(base.toString())

  await Promise.all([
    User.deleteMany({}),
    Product.deleteMany({}),
    Category.deleteMany({}),
    Brand.deleteMany({}),
  ])

  check(parseMetaFilter('audio,oficina').join(',') === 'audio,oficina', 'parseMetaFilter pasa valores planos')
  check(parseMetaFilter(':none:,audio').join('|') === '|audio', 'parseMetaFilter mapea :none: a cadena vacía')
  check(parseMetaFilter(':none:').join('') === '', 'parseMetaFilter solo :none:')
  check(parseMetaFilter('') === null, 'parseMetaFilter con vacío retorna null')
  check(parseMetaFilter(undefined) === null, 'parseMetaFilter con undefined retorna null')

  const pf = buildPublicCatalogFilter('')
  check(
    Array.isArray(pf.$and) &&
      pf.$and.some((c) => c.brand && c.brand.$ne === '') &&
      pf.$and.some((c) => c.category && c.category.$ne === ''),
    'buildPublicCatalogFilter excluye brand/categoría vacíos',
  )

  const adminA = await makeAdmin()
  const adminB = await makeAdmin()

  await Category.create([
    { adminId: adminA._id, key: 'audio', name: 'Audio' },
    { adminId: adminB._id, key: 'audio', name: 'Audio' },
  ])
  await Brand.create({ adminId: adminA._id, name: 'Acme' })
  await Brand.create({ adminId: adminB._id, name: 'Acme' })

  await Product.create([
    { adminId: adminA._id, id: 1, name: 'A uno', brand: 'Acme', category: 'audio', price: 100, stock: 5 },
    { adminId: adminA._id, id: 2, name: 'A dos', brand: 'Acme', category: 'audio', price: 100, stock: 5 },
    { adminId: adminA._id, id: 3, name: 'A tres', brand: 'Acme2', category: 'audio', price: 100, stock: 5 },
    { adminId: adminA._id, id: 4, name: 'A cuatro', brand: 'Acme', category: 'hogar', price: 100, stock: 5 },
    { adminId: adminB._id, id: 1, name: 'B uno', brand: 'Acme', category: 'audio', price: 100, stock: 5 },
  ])

  const catA = await Category.findOne({ adminId: adminA._id, key: 'audio' })
  const blocked = await deleteCatalogMeta({
    Model: Category,
    doc: catA,
    tenant: adminA._id,
    productField: 'category',
    reassign: false,
  })
  check(blocked.blocked === true && blocked.used === 3, `borrar categoría usada sin reassign queda bloqueado (used=${blocked.used})`)
  check((await Category.countDocuments({ adminId: adminA._id, key: 'audio' })) === 1, 'categoría sigue existiendo tras bloqueo')

  const reassignedCat = await deleteCatalogMeta({
    Model: Category,
    doc: catA,
    tenant: adminA._id,
    productField: 'category',
    reassign: true,
  })
  check(reassignedCat.ok === true && reassignedCat.reassigned === 3, `reassign de categoría mueve sus productos (reassigned=${reassignedCat.reassigned})`)
  check((await Category.countDocuments({ adminId: adminA._id, key: 'audio' })) === 0, 'categoría eliminada tras reassign')
  check((await Product.countDocuments({ adminId: adminA._id, category: 'audio' })) === 0, 'ningún producto de A queda con la categoría borrada')
  const keptCatB = await Product.findOne({ adminId: adminB._id, id: 1 }).lean()
  check(keptCatB.category === 'audio', 'el reassign de A no toca productos de B')

  const catalogASinCat = await Product.countDocuments({ ...buildPublicCatalogFilter(''), adminId: adminA._id })
  check(catalogASinCat === 1, 'tras el reassign de categoría solo queda visible el producto completo (1 visible)')

  const brandA = await Brand.findOne({ adminId: adminA._id, name: 'Acme' })
  const reassignedBrand = await deleteCatalogMeta({
    Model: Brand,
    doc: brandA,
    tenant: adminA._id,
    productField: 'brand',
    reassign: true,
  })
  check(reassignedBrand.ok === true && reassignedBrand.reassigned === 3, `reassign de marca mueve sus productos en A (reassigned=${reassignedBrand.reassigned})`)
  check((await Brand.countDocuments({ adminId: adminA._id, name: 'Acme' })) === 0, 'marca eliminada tras reassign')
  check((await Product.countDocuments({ adminId: adminB._id, brand: 'Acme' })) === 1, 'el reassign de marca no cruza tenant')

  await Product.updateMany(
    { adminId: adminA._id, id: 4 },
    { $set: { brand: '' } },
  )

  const productsA = await Product.countDocuments({ adminId: adminA._id })
  const visibleA = await Product.countDocuments({ ...buildPublicCatalogFilter(''), adminId: adminA._id })
  check(productsA === 4 && visibleA === 0, 'el catálogo público oculta sin marca y sin categoría (4 productos → 0 visibles)')

  const visibleB = await Product.find({ ...buildPublicCatalogFilter(''), adminId: adminB._id }).lean()
  check(visibleB.length === 1 && visibleB[0].name === 'B uno', 'el catálogo público de B conserva sus productos completos')

  await mongoose.disconnect()
  console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})