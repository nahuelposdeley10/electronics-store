import 'dotenv/config'
import mongoose from 'mongoose'
import { Counter } from '../models/Counter.js'
import { CashShift } from '../models/CashShift.js'
import { CashMovement } from '../models/CashMovement.js'
import { CashCount } from '../models/CashCount.js'
import {
  cashNet,
  currentShift,
  openShift,
  closeShift,
  addMovement,
  createArqueo,
} from '../lib/cash.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

async function main() {
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-cash'
  await mongoose.connect(base.toString())

  await Promise.all([CashShift.deleteMany({}), CashMovement.deleteMany({}), CashCount.deleteMany({}), Counter.deleteMany({})])

  const open1 = await openShift({ openingBalance: 1000, note: 'test', openedBy: 'caja@test.com' })
  check(open1.status === 'open' && open1.openingBalance === 1000, 'apertura con fondo 1000')
  check(open1.number === 1, `turno #1 (got ${open1.number})`)

  check((await currentShift())?._id.toString() === open1._id.toString(), 'currentShift devuelve el turno abierto')

  let net = await cashNet(open1._id)
  check(net.net === 0 && net.sales === 0, 'neto inicial 0')

  await addMovement({ shiftId: open1._id, kind: 'ingreso', flow: 'in', amount: 500, description: 'vuelto recibido', by: 'caja@test.com' })
  await addMovement({ shiftId: open1._id, kind: 'egreso', flow: 'out', amount: 300, description: 'gasto', by: 'caja@test.com' })
  // simula el hook del POS: venta en efectivo
  await CashMovement.create({ shiftId: open1._id, kind: 'venta', flow: 'in', amount: 1200, description: 'Venta #ABC123', by: 'caja@test.com' })

  net = await cashNet(open1._id)
  check(net.net === 1400, `neto 1000+500-300 = 1400 (got ${net.net})`)
  check(net.sales === 1200 && net.salesCount === 1, 'ventas sumadas al neto')

  const count1 = await createArqueo({ countedAmount: 2400 })
  check(count1.expectedAmount === 2400 && count1.difference === 0, 'arqueo cuadrado (esperado 2400)')

  const count2 = await createArqueo({ countedAmount: 2300 })
  check(count2.difference === -100, `arqueo con faltante -100 (got ${count2.difference})`)

  const shifted = await closeShift({ countedBalance: 2400, closedBy: 'caja@test.com' })
  check(shifted.status === 'closed', 'cierre de caja')
  check(shifted.expectedClose === 2400 && shifted.difference === 0, `cierre cuadrado (esperado ${shifted.expectedClose}, diff ${shifted.difference})`)

  let threw = false
  try {
    await addMovement({ shiftId: open1._id, kind: 'ingreso', flow: 'in', amount: 100, description: '' })
  } catch {
    threw = true
  }
  check(threw, 'no se puede mover plata con la caja cerrada')

  threw = false
  try {
    await closeShift({ countedBalance: 0 })
  } catch {
    threw = true
  }
  check(threw, 'no se puede cerrar dos veces')

  const open2 = await openShift({ openingBalance: 0 })
  check(open2.number === 2, `segundo turno #2 (got ${open2.number})`)

  const afterClose = await cashNet(open1._id)
  check(afterClose.net === 1400, 'el neto del turno cerrado se conserva')

  const beforeSecond = await closeShift({ countedBalance: 50 })
  check(beforeSecond.expectedClose === 0 && beforeSecond.difference === 50, 'cierre con sobra +50 registrado')

  await mongoose.disconnect()
  process.exit(exitCode)
}

main().catch((err) => {
  console.error('TEST CRASH', err)
  process.exit(1)
})