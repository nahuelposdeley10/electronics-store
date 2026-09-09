import { createApp, connectDb } from './app.js'

const port = Number(process.env.PORT || 4000)

async function start() {
  await connectDb()
  createApp().listen(port, () => {
    console.log(`API lista en http://localhost:${port}`)
  })
}

start().catch((error) => {
  console.error('No se pudo iniciar el servidor:', error)
  process.exit(1)
})