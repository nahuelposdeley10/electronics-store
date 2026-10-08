import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import { Order } from './models/Order.js'
import { Product } from './models/Product.js'
import { Quote } from './models/Quote.js'
import { CashShift } from './models/CashShift.js'
import { CashMovement } from './models/CashMovement.js'
import { CashCount } from './models/CashCount.js'
import { User } from './models/User.js'
import { trackOrder } from './lib/order-tracker.js'
import { verifyRefreshToken } from './lib/order-token.js'
import { slugToAdminId } from './lib/tenant.js'
import { permissionsForUser } from './lib/settings.js'
import { env } from './config/env.js'

const PENDING = new Set(['pending', 'in_process'])

function orderPayload(order, event = 'updated') {
  return {
    id: order._id,
    event,
    status: order.status,
    paymentId: order.paymentId,
    total: order.total,
    createdAt: order.createdAt,
  }
}

function stockStatus(stock, minStock) {
  const value = Number(stock) || 0
  const minimum = Number(minStock) || 0
  if (value <= 0) return 'sin'
  if (minimum > 0 && value <= minimum) return 'bajo'
  return 'ok'
}

function stockPayload(product, event = 'updated') {
  return {
    productId: product.id,
    adminId: product.adminId ? String(product.adminId) : null,
    name: product.name,
    stock: product.stock,
    minStock: product.minStock || 0,
    status: stockStatus(product.stock, product.minStock),
    event,
  }
}

function cashPayload(document, entity, event = 'updated') {
  return {
    id: String(document._id),
    entity,
    event,
    shiftId: document.shiftId ? String(document.shiftId) : String(document._id),
  }
}

function quotePayload(quote, event = 'updated') {
  return {
    id: String(quote._id),
    number: quote.number,
    status: quote.status,
    event,
  }
}

function userMatchesTenant(user, order) {
  if (!user) return false
  if (user.role === 'superadmin') return true
  const tenant = user.adminId || user.sub
  return Boolean(tenant && order.adminId) && String(tenant) === String(order.adminId)
}

async function authenticate(socket, next) {
  try {
    const token = socket.handshake?.auth?.token
    if (token) {
      const payload = jwt.verify(token, env.jwtSecret)
      const user = await User.findById(payload.sub).lean()
      if (!user || user.active !== true) {
        return next(new Error('Sesión inválida o vencida'))
      }
      const adminId = user.adminId ? String(user.adminId) : null
      const perms = await permissionsForUser(user, adminId)
      socket.data.user = {
        ...payload,
        role: user.role,
        adminId,
        perms,
      }
      return next()
    }
    const slug = socket.handshake?.auth?.tenantSlug
    const tenant = slug ? await slugToAdminId(slug) : null
    if (tenant) socket.data.publicTenantId = String(tenant)
    next()
  } catch {
    socket.data.user = null
    next()
  }
}

let io = null
let closing = false

export function emitQuoteUpdate(quote, event = 'updated') {
  if (!io || !quote) return
  const tenant = quote.adminId ? `tenant:${quote.adminId}:quotes` : 'tenant:global:quotes'
  io.to(tenant).emit('quote:update', quotePayload(quote, event))
  io.to('tenant:all:quotes').emit('quote:update', quotePayload(quote, event))
}

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
    cors: { origin: env.corsOrigins },
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
        const event = change.operationType === 'insert' ? 'created' : 'updated'
        const payload = orderPayload(order, event)
        io.to(tenant).emit('order:update', payload)
        io.to('tenant:all').emit('order:update', payload)
        io.to(`order:${String(order._id)}`).emit('order:update', payload)
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

  try {
    const productStream = Product.watch([], { fullDocument: 'updateLookup' })
    productStream.on('change', async (change) => {
      const updatedFields = change.updateDescription?.updatedFields || {}
      const stockChanged =
        change.operationType === 'insert' ||
        change.operationType === 'replace' ||
        Object.hasOwn(updatedFields, 'stock') ||
        Object.hasOwn(updatedFields, 'minStock')
      if (!stockChanged) return

      const changedId = change.documentKey?._id || change.fullDocument?._id
      if (!changedId) return
      try {
        const product = await Product.findById(changedId).select('adminId id name stock minStock').lean()
        if (!product) return
        const tenant = product.adminId ? `tenant:${product.adminId}:stock` : 'tenant:global:stock'
        const event = change.operationType === 'insert' ? 'created' : 'updated'
        const payload = stockPayload(product, event)
        io.to(tenant).emit('stock:update', payload)
        io.to('tenant:all:stock').emit('stock:update', payload)
      } catch {
        // producto eliminado entre el evento y la lectura
      }
    })
    productStream.on('error', (error) => {
      console.error('Stock socket stream error:', error)
    })
  } catch (error) {
    console.error('Stock socket stream error:', error)
  }

  try {
    const quoteStream = Quote.watch([], { fullDocument: 'updateLookup' })
    quoteStream.on('change', async (change) => {
      const changedId = change.documentKey?._id || change.fullDocument?._id
      if (!changedId) return
      try {
        const quote = await Quote.findById(changedId).select('_id adminId number status').lean()
        if (!quote) return
        const event = change.operationType === 'insert' ? 'created' : 'updated'
        emitQuoteUpdate(quote, event)
      } catch {
        // presupuesto eliminado entre el evento y la lectura
      }
    })
    quoteStream.on('error', (error) => {
      console.error('Quote socket stream error:', error)
    })
  } catch (error) {
    console.error('Quote socket stream error:', error)
  }

  const watchCashModel = (Model, entity) => {
    try {
      const stream = Model.watch([], { fullDocument: 'updateLookup' })
      stream.on('change', async (change) => {
        const changedId = change.documentKey?._id || change.fullDocument?._id
        if (!changedId) return
        try {
          const document = await Model.findById(changedId).select('_id adminId shiftId').lean()
          if (!document) return
          const tenant = document.adminId ? `tenant:${document.adminId}:cash` : 'tenant:global:cash'
          const event = change.operationType === 'insert' ? 'created' : 'updated'
          const payload = cashPayload(document, entity, event)
          io.to(tenant).emit('cash:update', payload)
          io.to('tenant:all:cash').emit('cash:update', payload)
        } catch {
          // registro eliminado entre el evento y la lectura
        }
      })
      stream.on('error', (error) => {
        console.error(`${entity} socket stream error:`, error)
      })
    } catch (error) {
      console.error(`${entity} socket stream error:`, error)
    }
  }

  watchCashModel(CashShift, 'shift')
  watchCashModel(CashMovement, 'movement')
  watchCashModel(CashCount, 'count')

  io.on('connection', (socket) => {
    socket.on('error', (error) => {
      console.error('socket error:', error?.message || error)
    })

    const user = socket.data.user
    if (user?.adminId) {
      socket.join(`tenant:${user.adminId}`)
      socket.join(`tenant:${user.adminId}:stock`)
      socket.join(`tenant:${user.adminId}:quotes`)
      if (user.perms?.includes('cash.manage')) {
        socket.join(`tenant:${user.adminId}:cash`)
      }
    }
    if (user?.role === 'superadmin') {
      socket.join('tenant:all')
      socket.join('tenant:all:stock')
      socket.join('tenant:all:cash')
      socket.join('tenant:all:quotes')
    }
    if (socket.data.publicTenantId) {
      socket.join(`tenant:${socket.data.publicTenantId}:stock`)
    }

    socket.on('order:watch', async (id, providedRefresh) => {
      if (!id) return
      const order = await Order.findById(id).catch(() => null)
      if (!order) return
      const refreshOk = verifyRefreshToken(
        order.refreshToken,
        providedRefresh || socket.handshake?.auth?.refreshToken,
      )
      if (!userMatchesTenant(socket.data.user, order) && !refreshOk) return
      socket.join(`order:${String(order._id)}`)
      if (PENDING.has(order.status)) trackOrder(order._id)
      socket.emit('order:update', orderPayload(order, 'snapshot'))
    })

    socket.on('order:unwatch', (id) => {
      if (id) socket.leave(`order:${String(id)}`)
    })
  })

  return io
}
