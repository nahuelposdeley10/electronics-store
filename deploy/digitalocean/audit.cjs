const { createRequire } = require('node:module')
const appRequire = createRequire('/var/www/electronics-store/package.json')
const mongoose = appRequire('mongoose')
appRequire('dotenv').config({ path: '/var/www/electronics-store/.env', quiet: true })
async function main() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: 'electronics-store', autoIndex: false })
  const db = mongoose.connection.db
  const users = await db.collection('users').find({ role: 'admin' }, { projection: { businessSlug: 1, active: 1 } }).toArray()
  console.log('DATABASE_OK; superadmins:', await db.collection('users').countDocuments({ role: 'superadmin', active: true }))
  for (const user of [{ _id: null, businessSlug: '(global)', active: true }, ...users]) {
    const settings = (await db.collection('settings').findOne({ adminId: user._id, key: 'base' }))?.value
    const payments = settings?.payments
    const store = settings?.store
    console.log(JSON.stringify({ slug: user.businessSlug, active: user.active, products: await db.collection('products').countDocuments({ adminId: user._id }), onlinePayments: payments?.online !== false, mpToken: Boolean(payments?.mercadopago?.accessToken), mpWebhookSecret: Boolean(payments?.mercadopago?.webhookSecret), storeDetailsSaved: Boolean(store), whatsappConfigured: Boolean(store?.whatsapp) }))
    if (payments?.mercadopago?.accessToken) {
      const response = await fetch('https://api.mercadopago.com/users/me', { headers: { Authorization: `Bearer ${payments.mercadopago.accessToken}` }, signal: AbortSignal.timeout(15000) })
      const account = await response.json()
      console.log(JSON.stringify({ slug: user.businessSlug, mercadoPagoStatus: response.status, testAccount: account.tags?.includes('test_user') || false }))
    }
  }
  await mongoose.disconnect()
  const cloudinary = appRequire('cloudinary').v2
  cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET })
  const result = await cloudinary.api.ping()
  console.log('CLOUDINARY:', result.status)
}
main().catch(error => { console.error('AUDIT_FAILED', error.code || error.http_code || error.name); process.exitCode = 1; mongoose.disconnect() })
