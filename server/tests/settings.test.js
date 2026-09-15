import 'dotenv/config'
import mongoose from 'mongoose'
import { Setting } from '../models/Setting.js'
import { getSettings, saveSettings } from '../lib/settings.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

async function main() {
  mongoose.set('autoIndex', false)
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-settings'
  await mongoose.connect(base.toString())

  await Setting.collection.drop().catch(() => {})
  await Setting.init()

  const tenantA = new mongoose.Types.ObjectId()
  const tenantB = new mongoose.Types.ObjectId()

  const sA = await getSettings({ fresh: true, tenant: tenantA })
  check(
    sA?.payments?.mercadopago?.webhookSecret == null,
    'sin secreto cargado, el webhookSecret queda vacío (no se genera)',
  )

  await saveSettings({
    tenant: tenantA,
    section: 'payments',
    value: {
      methods: { efectivo: true, tarjeta: true, transferencia: true },
      mercadopago: {
        accessToken: 'APP_USR_test',
        publicKey: null,
        webhookSecret: 'secret-copiado-de-mp',
      },
    },
  })

  const sA2 = await getSettings({ fresh: true, tenant: tenantA })
  check(
    sA2?.payments?.mercadopago?.webhookSecret === 'secret-copiado-de-mp',
    'el webhookSecret pegado desde MP persiste en lecturas siguientes',
  )

  const docA = await Setting.findOne({ key: 'base', adminId: tenantA }).lean()
  check(
    docA?.value?.payments?.mercadopago?.webhookSecret === 'secret-copiado-de-mp',
    'el webhookSecret queda guardado en la base de datos',
  )

  const sA3 = await getSettings({ fresh: true, tenant: tenantA })
  check(
    sA3?.payments?.mercadopago?.webhookSecret === 'secret-copiado-de-mp',
    'el seed no pisa un webhookSecret ya cargado',
  )

  const sB = await getSettings({ fresh: true, tenant: tenantB })
  check(
    sB?.payments?.mercadopago?.webhookSecret == null,
    'otra tienda sigue sin webhookSecret hasta pegarlo',
  )

  const sG = await getSettings({ fresh: true })
  check(
    sG?.payments?.mercadopago?.webhookSecret == null,
    'el scope global queda vacío hasta pegar el de MP',
  )

  await mongoose.disconnect()
  console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})