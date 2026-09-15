import 'dotenv/config'
import mongoose from 'mongoose'
import { Setting } from '../models/Setting.js'
import { getSettings } from '../lib/settings.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

const SECRET_RE = /^[0-9a-f]{48}$/

async function main() {
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-settings'
  await mongoose.connect(base.toString())

  await Setting.collection.drop().catch(() => {})
  await Setting.init()

  const tenantA = new mongoose.Types.ObjectId()
  const tenantB = new mongoose.Types.ObjectId()
  const tenantC = new mongoose.Types.ObjectId()

  const sA = await getSettings({ fresh: true, tenant: tenantA })
  const sB = await getSettings({ fresh: true, tenant: tenantB })
  const sG = await getSettings({ fresh: true })

  const secretA = sA?.payments?.mercadopago?.webhookSecret
  const secretB = sB?.payments?.mercadopago?.webhookSecret
  const secretG = sG?.payments?.mercadopago?.webhookSecret

  check(secretA && SECRET_RE.test(secretA), 'tenant A recibe un webhookSecret por defecto')
  check(secretB && SECRET_RE.test(secretB), 'tenant B recibe un webhookSecret por defecto')
  check(secretG && SECRET_RE.test(secretG), 'el scope global recibe un webhookSecret por defecto')
  check(
    new Set([secretA, secretB, secretG]).size === 3,
    'el webhookSecret es distinto por tienda',
  )
  check(secretA !== secretB, `secrets distintos entre tenants (A=${secretA.slice(0, 8)}… B=${secretB.slice(0, 8)}…)`)

  const sA2 = await getSettings({ fresh: true, tenant: tenantA })
  check(
    sA2?.payments?.mercadopago?.webhookSecret === secretA,
    'el secreto se mantiene en lecturas siguientes (no se regenera)',
  )

  await Setting.create({
    key: 'base',
    adminId: tenantC,
    value: { payments: { methods: { efectivo: true, tarjeta: true, transferencia: true } } },
  })
  const sC = await getSettings({ fresh: true, tenant: tenantC })
  const docC = await Setting.findOne({ key: 'base', adminId: tenantC }).lean()
  check(
    sC?.payments?.mercadopago?.webhookSecret &&
      docC?.value?.payments?.mercadopago?.webhookSecret === sC.payments.mercadopago.webhookSecret,
    'tiendas existentes sin secreto lo reciben y queda persistido',
  )

  await mongoose.disconnect()
  console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})