import { Counter } from '../models/Counter.js'

export function sequenceKey(tenantId, kind) {
  const scope = tenantId ? String(tenantId) : 'global'
  return `${scope}:${kind}`
}

export async function nextSequence(key, startingSeq = 0) {
  const min = Number.isFinite(Number(startingSeq)) ? Number(startingSeq) : 0

  await Counter.findOneAndUpdate(
    { _id: key },
    { $setOnInsert: { seq: min } },
    { upsert: true, setDefaultsOnInsert: true },
  )

  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { returnDocument: 'after' },
  )
  return doc.seq
}