import { io } from 'socket.io-client'
import { getSession } from './api.js'

let socket = null
const subscribers = new Set()

function auth() {
  const { token } = getSession()
  return token ? { token } : {}
}

function connect() {
  if (socket) return socket
  socket = io({ transports: ['websocket', 'polling'], auth: auth() })
  socket.on('order:update', (data) => {
    subscribers.forEach((callback) => callback(data))
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