import mongoose from 'mongoose'
import { Setting } from '../models/Setting.js'
import { WhatsappConnection } from '../models/WhatsAppConnection.js'
import { decryptWhatsappSecret, encryptWhatsappSecret } from './whatsapp-crypto.js'

export const WHATSAPP_SETTING_KEY = 'whatsapp'

const MAX_TEXT = 2_000

function tenantFilter(tenant) {
  if (!tenant || !mongoose.Types.ObjectId.isValid(tenant)) {
    const error = new Error('Negocio inválido')
    error.status = 400
    throw error
  }
  return { adminId: new mongoose.Types.ObjectId(tenant) }
}

function cleanText(value, max = MAX_TEXT) {
  const text = String(value ?? '').trim()
  return text ? text.slice(0, max) : null
}

function cleanPhoneNumberId(value) {
  const text = cleanText(value, 100)
  if (!text) return null
  if (!/^[a-zA-Z0-9_-]+$/.test(text)) {
    const error = new Error('El Phone Number ID de WhatsApp no es válido')
    error.status = 400
    throw error
  }
  return text
}

function normalizeAi(input = {}, current = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  return {
    enabled: source.enabled === undefined ? current.enabled === true : source.enabled === true,
    tone: cleanText(source.tone === undefined ? current.tone : source.tone, 120) || 'claro y cordial',
    instructions: cleanText(source.instructions === undefined ? current.instructions : source.instructions, 1_500) || '',
    handoffMessage: cleanText(source.handoffMessage === undefined ? current.handoffMessage : source.handoffMessage, 500) || 'Te voy a comunicar con una persona del equipo.',
  }
}

function normalizeStored(value = {}) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  return {
    enabled: source.enabled === true,
    ai: normalizeAi(source.ai),
    phoneNumberId: cleanPhoneNumberId(source.phoneNumberId),
    businessAccountId: cleanText(source.businessAccountId, 120),
    displayPhoneNumber: cleanText(source.displayPhoneNumber, 80),
    accessTokenEncrypted: cleanText(source.accessTokenEncrypted, 8_000),
    connectionStatus: cleanText(source.connectionStatus, 40),
    updatedAt: source.updatedAt || new Date(),
  }
}

export function publicWhatsappConfig(config) {
  return {
    enabled: config?.enabled === true,
    ai: {
      enabled: config?.ai?.enabled === true,
      tone: config?.ai?.tone || 'claro y cordial',
      instructions: config?.ai?.instructions || '',
      handoffMessage: config?.ai?.handoffMessage || 'Te voy a comunicar con una persona del equipo.',
    },
    phoneNumberId: config?.phoneNumberId || null,
    businessAccountId: config?.businessAccountId || null,
    displayPhoneNumber: config?.displayPhoneNumber || null,
    tokenConfigured: Boolean(config?.accessTokenEncrypted),
    status: config?.connectionStatus || (config?.enabled && config?.phoneNumberId && config?.accessTokenEncrypted ? 'connected' : 'disconnected'),
    updatedAt: config?.updatedAt || null,
  }
}

export async function getWhatsappConfig(tenant, { decrypt = false } = {}) {
  const filter = { key: WHATSAPP_SETTING_KEY, ...tenantFilter(tenant) }
  const doc = await Setting.findOne(filter).lean()
  const connection = await WhatsappConnection.findOne({ adminId: tenant }).lean()
  const config = normalizeStored({
    ...doc?.value,
    enabled: connection?.enabled ?? doc?.value?.enabled,
    ai: { ...doc?.value?.ai, enabled: connection?.aiEnabled ?? doc?.value?.ai?.enabled },
    phoneNumberId: connection?.phoneNumberId || doc?.value?.phoneNumberId,
    businessAccountId: connection?.whatsappBusinessAccountId || doc?.value?.businessAccountId,
    displayPhoneNumber: connection?.displayPhoneNumber || doc?.value?.displayPhoneNumber,
    connectionStatus: connection?.status,
  })
  if (!decrypt) return config
  if (!config.accessTokenEncrypted) return { ...config, accessToken: null }
  return { ...config, accessToken: decryptWhatsappSecret(config.accessTokenEncrypted) }
}

export async function findWhatsappConfigByPhoneNumberId(phoneNumberId, { decrypt = false } = {}) {
  const cleanId = cleanPhoneNumberId(phoneNumberId)
  if (!cleanId) return null
  const connections = await WhatsappConnection.find({ phoneNumberId: cleanId }).select('adminId phoneNumberId whatsappBusinessAccountId displayPhoneNumber enabled aiEnabled status').lean()
  if (connections.length > 1) return null
  if (connections.length === 1) {
    const connection = connections[0]
    const setting = await Setting.findOne({ key: WHATSAPP_SETTING_KEY, adminId: connection.adminId }).select('value').lean()
    const config = normalizeStored({
      ...setting?.value,
      enabled: connection.enabled,
      ai: { ...setting?.value?.ai, enabled: connection.aiEnabled },
      phoneNumberId: connection.phoneNumberId,
      businessAccountId: connection.whatsappBusinessAccountId,
      displayPhoneNumber: connection.displayPhoneNumber,
      connectionStatus: connection.status,
    })
    const result = { tenant: connection.adminId, connection, config }
    if (decrypt && config.accessTokenEncrypted) result.config = { ...config, accessToken: decryptWhatsappSecret(config.accessTokenEncrypted) }
    return result
  }

  const docs = await Setting.find({ key: WHATSAPP_SETTING_KEY, adminId: { $ne: null }, 'value.phoneNumberId': cleanId }).select('adminId value').lean()
  if (docs.length !== 1) return null
  const doc = docs[0]
  const config = normalizeStored(doc.value)
  const result = { tenant: doc.adminId, config, connection: null }
  if (decrypt && config.accessTokenEncrypted) {
    result.config = { ...config, accessToken: decryptWhatsappSecret(config.accessTokenEncrypted) }
  }
  return result
}

export async function saveWhatsappConfig(tenant, input = {}) {
  const filter = { key: WHATSAPP_SETTING_KEY, ...tenantFilter(tenant) }
  const current = await getWhatsappConfig(tenant)
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {}
  const next = {
    ...current,
    enabled: source.enabled === undefined ? current.enabled : source.enabled === true,
    ai: normalizeAi(source.ai, current.ai),
    phoneNumberId: source.phoneNumberId === undefined ? current.phoneNumberId : cleanPhoneNumberId(source.phoneNumberId),
    businessAccountId: source.businessAccountId === undefined ? current.businessAccountId : cleanText(source.businessAccountId, 120),
    displayPhoneNumber: source.displayPhoneNumber === undefined ? current.displayPhoneNumber : cleanText(source.displayPhoneNumber, 80),
    updatedAt: new Date(),
  }

  const accessToken = String(source.accessToken || '').trim()
  if (accessToken) next.accessTokenEncrypted = encryptWhatsappSecret(accessToken)

  const saved = await Setting.findOneAndUpdate(
    filter,
    { $set: { value: next } },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean()
  const stored = normalizeStored(saved.value)
  if (stored.phoneNumberId) {
    const status = stored.enabled && stored.accessTokenEncrypted ? 'connected' : 'disconnected'
    await WhatsappConnection.findOneAndUpdate(
      { adminId: tenant },
      {
        $set: {
          provider: 'meta-cloud',
          status,
          enabled: stored.enabled,
          aiEnabled: stored.ai.enabled,
          phoneNumberId: stored.phoneNumberId,
          whatsappBusinessAccountId: stored.businessAccountId || null,
          displayPhoneNumber: stored.displayPhoneNumber || '',
          credentialRefs: { accessTokenRef: `setting:${String(tenant)}:${WHATSAPP_SETTING_KEY}` },
          connectionSource: 'manual',
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    )
  }
  return publicWhatsappConfig({
    ...stored,
    connectionStatus: stored.enabled && stored.phoneNumberId && stored.accessTokenEncrypted ? 'connected' : 'disconnected',
  })
}

export async function touchWhatsappWebhook(tenant) {
  await WhatsappConnection.updateOne({ adminId: tenant }, { $set: { lastWebhookAt: new Date() } })
}

export function whatsappWebhookVerifyToken() {
  return String(process.env.WHATSAPP_VERIFY_TOKEN || '').trim()
}

export function whatsappGraphConfig() {
  return {
    apiVersion: String(process.env.WHATSAPP_GRAPH_API_VERSION || 'v23.0').trim(),
    appSecret: String(process.env.WHATSAPP_APP_SECRET || '').trim(),
  }
}
