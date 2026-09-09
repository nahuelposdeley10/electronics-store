import { Order } from '../models/Order.js'
import { verifyOrderPayment } from './order-verify.js'

const PENDING = new Set(['pending', 'in_process'])
const TRACK_INTERVAL = 4000
const TRACK_MAX_MS = 10 * 60 * 1000

const queue = new Map()

function clearEntry(id) {
  const entry = queue.get(id)
  if (entry?.timer) clearTimeout(entry.timer)
  queue.delete(id)
}

function schedule(id) {
  const entry = queue.get(id)
  if (!entry) return
  entry.timer = setTimeout(() => runOnce(id), TRACK_INTERVAL)
}

async function runOnce(id) {
  const entry = queue.get(id)
  if (!entry) return
  if (entry.timer) clearTimeout(entry.timer)

  if (Date.now() > entry.deadline) {
    queue.delete(id)
    return
  }

  try {
    const order = await Order.findById(id)
    if (!order || !PENDING.has(order.status)) {
      queue.delete(id)
      return
    }
    const updated = await verifyOrderPayment(order)
    if (PENDING.has(updated.status)) {
      schedule(id)
    } else {
      queue.delete(id)
    }
  } catch (error) {
    console.error('Order track error:', error)
    schedule(id)
  }
}

export function trackOrder(id) {
  const key = String(id)
  clearEntry(key)
  queue.set(key, { deadline: Date.now() + TRACK_MAX_MS, timer: null })
  schedule(key)
}

export function initTracker() {
  Order.find({ status: { $in: ['pending', 'in_process'] }, demo: { $ne: true } })
    .select('_id')
    .limit(200)
    .lean()
    .then((orders) => {
      if (orders.length > 0) console.log(`Order tracker: vigilando ${orders.length} órdenes pendientes`)
      for (const order of orders) trackOrder(order._id)
    })
    .catch((error) => console.error('Order tracker init error:', error))
}