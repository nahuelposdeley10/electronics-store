import http from 'node:http'
import mongoose from 'mongoose'
import { createApp, connectDb } from './app.js'
import { createSocketServer, closeSocketServer } from './socketio.js'
import { initTracker } from './lib/order-tracker.js'

const port = Number(process.env.PORT || 4000)

function logError(label, error) {
  console.error(`[${label}]`, error?.stack || error)
}

process.on('unhandledRejection', (reason) => {
  logError('unhandledRejection', reason)
})

process.on('uncaughtException', (error) => {
  logError('uncaughtException', error)
})

let server = null

async function start() {
  await connectDb()
  initTracker()
  server = http.createServer(createApp())
  server.requestTimeout = 120_000
  server.headersTimeout = 60_000
  server.keepAliveTimeout = 5_000

  server.on('clientError', (error, socket) => {
    logError('clientError', error)
    if (socket.writable) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
    }
  })

  createSocketServer(server)

  server.on('error', (error) => {
    if (error?.code === 'EADDRINUSE') {
      console.error(`El puerto ${port} ya está en uso. ¿Ya tenés otro server corriendo?`)
      process.exit(1)
    }
    logError('listen', error)
  })

  server.listen(port, () => {
    console.log(`API lista en http://localhost:${port}`)
  })
}

async function shutdown(signal) {
  console.log(`[${signal}] Cerrando server…`)
  const onClose = () => {
    mongoose.disconnect().catch(() => {})
    setTimeout(() => process.exit(0), 300)
  }
  try {
    closeSocketServer()
  } catch (error) {
    logError('shutdown.socket', error)
  }
  if (server && server.listening) {
    server.close(onClose)
    server.closeIdleConnections?.()
  } else {
    onClose()
  }
  setTimeout(() => process.exit(0), 3000)
}

process.on('SIGINT', () => shutdown('SIGINT'))
process.on('SIGTERM', () => shutdown('SIGTERM'))

start().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error)
  process.exit(1)
})