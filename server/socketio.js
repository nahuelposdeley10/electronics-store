import { Server } from 'socket.io'
import { Order } from './models/Order.js'
import { trackOrder } from './lib/order-tracker.js'

const PENDING = new Set(['pending', 'in_process'])

function orderPayload(order) {
  return {
    id: order._id,
    status: order.status,
    paymentId: order.paymentId,
    total: order.total,
    createdAt: order.createdAt,
  }
}

let io = null

export function createSocketServer(httpServer) {
  if (io) return io

  io = new Server(httpServer, {
    cors: { origin: true },
  })

  try {
    const changeStream = Order.watch([], { fullDocument: 'updateLookup' })
    changeStream.on('change', async (change) => {
      const changedId = change.documentKey?._id || change.fullDocument?._id
      if (!changedId) return
      try {
        const order = await Order.findById(changedId)
        if (order) io.emit('order:update', orderPayload(order))
      } catch {
        // orden borrada entre el evento y la lectura
      }
    })
    changeStream.on('error', (error) => {
      console.error('Order socket stream error:', error)
    })
  } catch (error) {
    console.error('Order socket stream error:', error)
  }

  io.on('connection', (socket) => {
    socket.on('order:watch', async (id) => {
      if (!id) return
      const order = await Order.findById(id).catch(() => null)
      if (!order) return
      if (PENDING.has(order.status)) trackOrder(order._id)
      socket.emit('order:update', orderPayload(order))
    })
  })

  return io
}