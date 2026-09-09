import http from 'node:http'
import { createApp, connectDb } from './app.js'
import { createSocketServer } from './socketio.js'
import { initTracker } from './lib/order-tracker.js'

const port = Number(process.env.PORT || 4000)

async function start() {
  await connectDb()
  initTracker()
  const server = http.createServer(createApp())
  createSocketServer(server)
  server.listen(port, () => {
    console.log(`API lista en http://localhost:${port}`)
  })
}

start().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error)
  process.exit(1)
})