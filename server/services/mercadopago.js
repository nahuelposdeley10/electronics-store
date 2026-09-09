import { MercadoPagoConfig, Preference, Payment } from 'mercadopago'
import { env } from '../config/env.js'

const client = new MercadoPagoConfig({ accessToken: env.mpAccessToken })

export const preferenceService = new Preference(client)
export const paymentService = new Payment(client)