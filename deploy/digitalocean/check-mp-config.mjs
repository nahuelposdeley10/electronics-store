import 'dotenv/config'
import mongoose from 'mongoose'
import { Setting } from './server/models/Setting.js'

await mongoose.connect(process.env.MONGODB_URI)
const rows = await Setting.find({}).lean()
console.log(JSON.stringify(rows.map((row) => ({
  adminId: row.adminId,
  online: row.value?.payments?.online,
  token: Boolean(row.value?.payments?.mercadopago?.accessToken),
  secret: Boolean(row.value?.payments?.mercadopago?.webhookSecret),
  publicKey: Boolean(row.value?.payments?.mercadopago?.publicKey),
}))))
await mongoose.disconnect()

