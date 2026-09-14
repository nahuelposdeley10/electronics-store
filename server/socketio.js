import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { Order } from './models/Order.js'
import { trackOrder } from './lib/order-tracker.js'
import { env } from './config/env.js'

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

function authenticate(socket, next) {
  try {
    const token = socket.handshake?.auth?.token
    if (!token) return next()
    socket.data.user = jwt.verify(token, env.jwtSecret)
    next()
  } catch {
    socket.data.user = null
    next()
  }
}

let io = null
let closing = false

export function closeSocketServer() {
  if (!io) return
  if (closing) return
  closing = true
  io.close()
  io = null
}

export function createSocketServer(httpServer) {
  if (io) return io

  io = new Server(httpServer, {
    cors: { origin: true },
  })

  io.use(authenticate)

  try {
    const changeStream = Order.watch([], { fullDocument: 'updateLookup' })
    changeStream.on('change', async (change) => {
      const changedId = change.documentKey?._id || change.fullDocument?._id
      if (!changedId) return
      try {
        const order = await Order.findById(changedId)
        if (!order) return
        const tenant = order.adminId ? `tenant:${order.adminId}` : 'tenant:global'
        io.to(tenant).emit('order:update', orderPayload(order))
        io.to('tenant:all').emit('order:update', orderPayload(order))
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
    socket.on('error', (error) => {
      console.error('socket error:', error?.message || error)
    })

    const user = socket.data.user
    if (user?.adminId) {
      socket.join(`tenant:${user.adminId}`)
    }
    if (user?.role === 'superadmin') {
      socket.join('tenant:all')
    }

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