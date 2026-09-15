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

  const a = [a1, a2, a3].slice().sort((x, y) => x - y)
  const b = [b1, b2].slice().sort((x, y) => x - y)

  check([...a, ...b].every((n) => Number.isInteger(n)), 'secuencia devuelve enteros')
  check(a.length === 3 && a.every((n, i) => n === 5 + i), `continúa desde seed 4, sin colisiones A (got ${a.join(',')})`)
  check(b.length === 2 && b.every((n, i) => n === 5 + i), `sin colisiones B (got ${b.join(',')})`)
  check(b[0] === 5 && b[1] === 6 && a[2] === 7, 'secuencias independientes entre tenants')

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