import { io } from 'socket.io-client'

let socket = null
const subscribers = new Set()

function connect() {
  if (socket) return socket
  socket = io({ transports: ['websocket', 'polling'] })
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