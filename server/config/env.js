import 'dotenv/config'

export const env = {
  mpAccessToken: process.env.MP_ACCESS_TOKEN,
  mpPublicKey: process.env.MP_PUBLIC_KEY,
  mongodbUri: process.env.MONGODB_URI,
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  serverUrl: process.env.SERVER_URL || 'http://localhost:4000',
}