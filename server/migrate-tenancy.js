import 'dotenv/config'
import mongoose from 'mongoose'
import { env } from './config/env.js'
import { ALL_PERMISSIONS, OPERATOR_DEFAULT_PERMISSIONS } from './lib/settings.js'
import { User } from './models/User.js'
import { Product } from './models/Product.js'
import { Order } from './models/Order.js'
import { Category } from './models/Category.js'
import { Brand } from './models/Brand.js'
import { Variant } from './models/Variant.js'
import { Coupon } from './models/Coupon.js'
import { Quote } from './models/Quote.js'
import { Purchase } from './models/Purchase.js'
import { StockMovement } from './models/StockMovement.js'
import { CashShift } from './models/CashShift.js'
import { CashMovement } from './models/CashMovement.js'
import { CashCount } from './models/CashCount.js'
import { Setting } from './models/Setting.js'

const TENANT_MODELS = [
  Product,
  Order,
  Category,
  Brand,
  Variant,
  Coupon,
  Quote,
  Purchase,
  StockMovement,
  CashShift,
  CashMovement,
  CashCount,
]

async function run() {
  const dbName =
    process.env.MIGRATE_DB_NAME ||
    (process.env.MONGODB_URI === env.mongodbUri ? 'electronics-store' : null)

  await mongoose.connect(env.mongodbUri, { dbName: dbName || undefined })

  const admin = await User.findOne({ role: 'admin' }).sort({ createdAt: 1 }).lean()
  const superadmin = await User.findOne({ role: 'superadmin' }).sort({ createdAt: 1 }).lean()

  if (!admin) {
    console.error('No hay ningún usuario ADMIN para asignar los datos. Corré primero `npm run seed:users`.')
    process.exit(1)
  }
  if (!superadmin) {
    console.error('No hay ningún SUPERADMIN. Corré primero `npm run seed:users`.')
    process.exit(1)
  }

  const slug =
    process.env.ADMIN_BUSINESS_SLUG || 'techstore'
  if (!admin.businessSlug) {
    await User.updateOne({ _id: admin._id }, { $set: { businessSlug: slug } })
    console.log(`✅ Admin ${admin.email} → businessSlug "${slug}"`)
  } else {
    console.log(`ℹ️  Admin ${admin.email} ya tenía slug "${admin.businessSlug}"`)
  }

  let assigned = 0
  for (const Model of TENANT_MODELS) {
    const result = await Model.updateMany(
      { adminId: null },
      { $set: { adminId: admin._id } },
    )
    assigned += result.modifiedCount
    console.log(`  ${Model.modelName}: ${result.modifiedCount} documento(s) asignados`)
  }

  const globalSettings = await Setting.findOne({ key: 'base', adminId: null }).lean()
  if (globalSettings) {
    const tenantSetting = await Setting.findOne({ key: 'base', adminId: admin._id }).lean()
    if (tenantSetting) {
      await Setting.deleteOne({ _id: globalSettings._id })
      console.log('  ℹ️  Setting base global sobrante eliminado (el negocio ya tiene el suyo)')
    } else {
      await Setting.updateOne(
        { _id: globalSettings._id },
        { $set: { adminId: admin._id } },
      )
      console.log(`  Setting base: asignado al negocio "${slug}"`)
    }
  } else {
    console.log('  Setting base: ya estaba asignado (o no existe)')
  }

  const tenantSettings = await Setting.findOne({ key: 'base', adminId: admin._id }).lean()
  if (tenantSettings?.value?.roles) {
    const roles = tenantSettings.value.roles
    const needsAdmin = !Array.isArray(roles.admin) || roles.admin.length === 0
    const needsOperator = !Array.isArray(roles.operator)
    if (needsAdmin || needsOperator) {
      if (needsAdmin) roles.admin = [...ALL_PERMISSIONS]
      if (needsOperator) roles.operator = [...OPERATOR_DEFAULT_PERMISSIONS]
      await Setting.updateOne(
        { _id: tenantSettings._id },
        { $set: { 'value.roles': roles } },
      )
      console.log('  ℹ️  roles del negocio normalizados (admin = todos los permisos)')
    }
  }

  console.log('\nRegenerando índices (admite duplicados únicos por negocio)...')
  for (const Model of TENANT_MODELS) {
    await Model.syncIndexes()
    console.log(`  ✅ ${Model.modelName}`)
  }
  try {
    await User.collection.dropIndex('businessSlug_1')
    console.log('  ℹ️  businessSlug_1 (vieja, no sparse) eliminada')
  } catch {
    // index no existe o ya es la versión correcta
  }
  await User.syncIndexes()
  await Setting.syncIndexes()
  console.log('  ✅ User')
  console.log('  ✅ Setting')

  if (admin.businessSlug !== slug && !process.env.ADMIN_BUSINESS_SLUG) {
    await User.updateOne({ _id: admin._id }, { $set: { businessSlug: slug } })
    console.log(`ℹ️  Slug actualizado a "${slug}"`)
  }

  console.log(`\nMigración lista: ${assigned} documento(s) de negocio+operadores bajo ${admin.email}.`)
  await mongoose.disconnect()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})