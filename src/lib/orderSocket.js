import { io } from 'socket.io-client'
import { getOrderRefreshToken, getSession } from './api.js'
import { getTenantSlug } from './tenant.js'

let socket = null
const subscribers = new Set()
const stockSubscribers = new Set()
const cashSubscribers = new Set()
const quoteSubscribers = new Set()

function auth() {
  const { token } = getSession()
  const tenantSlug = getTenantSlug()
  return {
    ...(token ? { token } : {}),
    ...(tenantSlug ? { tenantSlug } : {}),
  }
}

function connect() {
  if (socket) return socket
  socket = io({ transports: ['websocket', 'polling'], auth: auth() })
  socket.on('order:update', (data) => {
    subscribers.forEach((callback) => callback(data))
  })
  socket.on('stock:update', (data) => {
    stockSubscribers.forEach((callback) => callback(data))
  })
  socket.on('cash:update', (data) => {
    cashSubscribers.forEach((callback) => callback(data))
  })
  socket.on('quote:update', (data) => {
    quoteSubscribers.forEach((callback) => callback(data))
  })
  return socket
}

export function subscribeToOrders(callback) {
  connect()
  subscribers.add(callback)
  return () => {
    subscribers.delete(callback)
  }
}

export function subscribeToStock(callback) {
  connect()
  stockSubscribers.add(callback)
  return () => {
    stockSubscribers.delete(callback)
  }
}

export function subscribeToCash(callback) {
  connect()
  cashSubscribers.add(callback)
  return () => {
    cashSubscribers.delete(callback)
  }
}

export function subscribeToQuotes(callback) {
  connect()
  quoteSubscribers.add(callback)
  return () => {
    quoteSubscribers.delete(callback)
  }
}

export function watchOrder(orderId, refreshToken = getOrderRefreshToken(orderId)) {
  if (!orderId) return
  const id = String(orderId)
  const client = connect()
  client.emit('order:watch', id, refreshToken || undefined)
  return () => client.emit('order:unwatch', id)
}
