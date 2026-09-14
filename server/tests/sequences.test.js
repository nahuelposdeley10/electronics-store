import 'dotenv/config'
import mongoose from 'mongoose'
import { Counter } from '../models/Counter.js'
import { nextSequence, sequenceKey } from '../lib/counter.js'

let exitCode = 0

function check(cond, label) {
  console.log(`${cond ? 'PASS' : 'FAIL'} — ${label}`)
  if (!cond) exitCode = 1
}

async function main() {
  const base = new URL(process.env.MONGODB_URI)
  base.pathname = '/electronics-store-test-sequences'
  await mongoose.connect(base.toString())

  await Counter.deleteMany({})

  const tenantA = new mongoose.Types.ObjectId()
  const tenantB = new mongoose.Types.ObjectId()

  const [a1, a2, a3, b1, b2] = await Promise.all([
    nextSequence(sequenceKey(tenantA, 'product'), 4),
    nextSequence(sequenceKey(tenantA, 'product'), 4),
    nextSequence(sequenceKey(tenantA, 'product'), 4),
    nextSequence(sequenceKey(tenantB, 'product'), 4),
    nextSequence(sequenceKey(tenantB, 'product'), 4),
  ])

  check([a1, a2, a3].every((n) => Number.isInteger(n)), 'secuencia devuelve enteros')
  check(new Set([a1, a2, a3]).size === 3, `concurrentes sin colisiones A (${a1},${a2},${a3})`)
  check(new Set([b1, b2]).size === 2, `concurrentes sin colisiones B (${b1},${b2})`)
  check(a1 > 4 && a3 === a1 + 2, `continúa desde el último id existente (seed 4 → ${a1})`)
  check(b1 !== a1 && b2 !== a3, 'secuencias independientes entre tenants')

  const global1 = await nextSequence(sequenceKey(null, 'shift'), 0)
  const global2 = await nextSequence(sequenceKey(null, 'shift'), 0)
  check(global1 === 1 && global2 === 2, `scope global arranca en 1 (${global1},${global2})`)

  const q1 = await nextSequence(sequenceKey(tenantA, 'quote'), 1000)
  check(q1 === 1001, `quote arranca en 1001 (got ${q1})`)

  await mongoose.disconnect()
  console.log(exitCode === 0 ? '\nTODOS LOS CHECKS OK' : `\nFALLARON CHECKS: ${exitCode}`)
  process.exit(exitCode)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})