import 'dotenv/config'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { env } from './config/env.js'
import { User } from './models/User.js'

async function ensureUser({ name, email, password, role }) {
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await User.findOneAndUpdate(
    { email },
    { name, passwordHash, role, active: true },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )
  console.log(`${user.role.padEnd(10)} ${user.email} (contraseña reestablecida)`)
  return user
}

async function run() {
  await mongoose.connect(env.mongodbUri, { dbName: 'electronics-store' })

  const users = [
    {
      name: process.env.SUPERADMIN_NAME || 'Dueño',
      email: process.env.SUPERADMIN_EMAIL,
      password: process.env.SUPERADMIN_PASSWORD,
      role: 'superadmin',
    },
    {
      name: process.env.ADMIN_NAME || 'Encargado',
      email: process.env.ADMIN_EMAIL,
      password: process.env.ADMIN_PASSWORD,
      role: 'admin',
    },
  ]

  for (const user of users) {
    if (!user.email || !user.password) {
      console.error(`Faltan credenciales para ${user.role} (revisá .env)`)
      continue
    }
    await ensureUser(user)
  }

  await mongoose.disconnect()
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})