import 'dotenv/config'
import fs from 'node:fs'
import path from 'node:path'
import readline from 'node:readline'
import { Writable } from 'node:stream'
import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { env } from './config/env.js'
import { User } from './models/User.js'

const ENV_FILE = path.resolve(process.cwd(), '.env')
const dbName = process.env.SEED_DB_NAME || 'electronics-store'
const persistEnv = dbName === 'electronics-store'

function createPasswordReader() {
  const isTTY = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  let muted = false
  const mutableStdout = new Writable({
    write(chunk, encoding, callback) {
      if (!muted) process.stdout.write(chunk, encoding)
      callback()
    },
  })
  const rl = readline.createInterface({
    input: process.stdin,
    output: mutableStdout,
    terminal: isTTY,
  })
  const lines = rl[Symbol.asyncIterator]()
  return {
    async ask(prompt) {
      if (isTTY) {
        return await new Promise((resolve) => {
          rl.question(prompt, (answer) => resolve(answer.trim()))
          muted = true
        })
      }
      process.stdout.write(prompt)
      const entry = await lines.next()
      return (entry.value || '').trim()
    },
    close() {
      rl.close()
      mutableStdout.destroy()
    },
  }
}

async function promptPassword(pw, label) {
  for (;;) {
    const first = await pw.ask(`Contraseña para ${label} (oculto al escribir): `)
    if (first.length < 8) {
      console.error('  La contraseña debe tener al menos 8 caracteres.')
      continue
    }
    const second = await pw.ask(`Repetí la contraseña para ${label}: `)
    if (first === second) return first
    console.error('  Las contraseñas no coinciden. Volvé a intentar.')
  }
}

function saveEnv(key, value) {
  try {
    const raw = fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : ''
    const eol = raw.includes('\r\n') ? '\r\n' : '\n'
    const lines = raw.split(/\r?\n/)
    const line = `${key}="${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    const idx = lines.findIndex((l) => new RegExp(`^${key}\\s*=`).test(l))
    if (idx >= 0) lines[idx] = line
    else lines.push(line)
    fs.writeFileSync(ENV_FILE, lines.join(eol))
  } catch (error) {
    console.warn(`  No se pudo guardar ${key} en .env:`, error.message)
  }
}

async function ensureUser({ name, email, password, role, adminId = null, businessSlug = null }) {
  const passwordHash = await bcrypt.hash(password, 10)
  const slug = businessSlug ? String(businessSlug).trim().toLowerCase() : null
  const data = { name, passwordHash, role, active: true }
  if (slug) data.businessSlug = slug
  if (adminId) data.adminId = adminId
  const user = await User.findOneAndUpdate(
    { email },
    { $set: data },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true },
  )
  if (!slug && user.businessSlug) {
    await User.updateOne({ _id: user._id }, { $unset: { businessSlug: 1 } })
    user.businessSlug = undefined
  }
  if (!user.createdAt) {
    await User.updateOne({ _id: user._id }, { $set: { createdAt: user.updatedAt || new Date() } })
    user.createdAt = user.updatedAt || new Date()
  }
  console.log(`${user.role.padEnd(10)} ${user.email} (contraseña actualizada)`)
  return user
}

async function resolveCredentials({ role, email, envKey, ask, pw }) {
  const existing = process.env[envKey]
  if (existing && !ask) {
    return { password: existing, saved: false }
  }
  const password = await promptPassword(pw, `${role} — ${email}`)
  if (password !== existing) {
    if (persistEnv) {
      saveEnv(envKey, password)
      console.log(`  Guardada en .env como ${envKey}.`)
    }
  }
  return { password, saved: true }
}

async function run() {
  const pw = createPasswordReader()
  try {
    const ask = process.argv.includes('--ask')

    const superadmin = {
      name: process.env.SUPERADMIN_NAME || 'Dueño',
      email: process.env.SUPERADMIN_EMAIL,
      role: 'superadmin',
    }
    const admin = process.env.ADMIN_EMAIL
      ? {
          name: process.env.ADMIN_NAME || 'Encargado',
          email: process.env.ADMIN_EMAIL,
          role: 'admin',
          businessSlug: process.env.ADMIN_BUSINESS_SLUG || '',
        }
      : null
    const operatorEmail = process.env.OPERATOR_EMAIL

    const missing = []
    if (!superadmin.email) missing.push('SUPERADMIN_EMAIL')
    if (admin && !process.env.ADMIN_PASSWORD && !ask) missing.push('ADMIN_PASSWORD')
    if (operatorEmail && !process.env.OPERATOR_PASSWORD && !ask) missing.push('OPERATOR_PASSWORD')

    if (missing.length) {
      console.log(
        `Faltan en .env: ${missing.join(', ')}. Por las contraseñas te las pido por consola (o definilas en .env).`,
      )
    }

    await mongoose.connect(env.mongodbUri, { dbName })

    const superCred = await resolveCredentials({ role: 'superadmin', email: superadmin.email, envKey: 'SUPERADMIN_PASSWORD', ask, pw })
    superadmin.password = superCred.password

    const usersToSeed = [superadmin]
    let adminUser = null
    if (admin) {
      const adminCred = await resolveCredentials({ role: 'admin', email: admin.email, envKey: 'ADMIN_PASSWORD', ask, pw })
      admin.password = adminCred.password
      usersToSeed.push(admin)
    }

    for (const user of usersToSeed) {
      if (!user.email || !user.password) {
        console.error(`Faltan credenciales para ${user.role} (revisá .env)`)
        continue
      }
      const created = await ensureUser(user)
      if (created.role === 'admin') adminUser = created
    }

    if (adminUser && operatorEmail) {
      const hasOperatorPassword = Boolean(process.env.OPERATOR_PASSWORD)
      const operatorCred = await resolveCredentials({
        role: 'operator',
        email: operatorEmail,
        envKey: 'OPERATOR_PASSWORD',
        ask: ask || !hasOperatorPassword,
        pw,
      })
      if (!operatorCred.password) {
        console.error('No se definió contraseña para el operador (revisá .env)')
      } else {
        await ensureUser({
          name: process.env.OPERATOR_NAME || 'Operador',
          email: operatorEmail,
          password: operatorCred.password,
          role: 'operator',
          adminId: adminUser._id,
        })
      }
    }

    console.log('')
    console.log('Usuarios listos.')
    if (ask) {
      console.log('Podés cambiar las contraseñas cuando quieras con: npm run seed:users -- --ask')
    } else if (persistEnv && !process.env.OPERATOR_PASSWORD) {
      console.log('Operador: contraseña definida recién (guardada en .env como OPERATOR_PASSWORD).')
    }
  } finally {
    pw.close()
    await mongoose.disconnect().catch(() => {})
  }
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})