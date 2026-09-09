import { createApp, connectDb } from '../server/app.js'

let app

async function getApp() {
  if (!app) {
    await connectDb()
    app = createApp()
  }
  return app
}

export default async function handler(req, res) {
  const ready = await getApp()
  return ready(req, res)
}