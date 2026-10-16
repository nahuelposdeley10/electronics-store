import { findWhatsappConfigByPhoneNumberId } from '../lib/whatsapp-config.js'
import {
  updateWhatsappMessageStatus,
  upsertWhatsappInbound,
} from '../lib/whatsapp-models.js'
import { touchWhatsappWebhook } from '../lib/whatsapp-config.js'
import { sendWhatsappText } from './whatsapp-cloud.js'
import { generateWhatsappReply } from './whatsapp-ai.js'

function messageDate(timestamp) {
  const seconds = Number(timestamp)
  return Number.isFinite(seconds) && seconds > 0 ? new Date(seconds * 1_000) : new Date()
}
function messageContent(message) {
  const type = String(message?.type || 'unknown')
  const source = message?.[type] || {}
  const text = type === 'text'
    ? source.body
    : source.caption || source.title || source.text || source.button_reply?.title || source.list_reply?.title || ''
  return {
    type: type === 'text' || type === 'image' || type === 'audio' || type === 'video' || type === 'document' ? type : 'other',
    rawType: type,
    text: String(text || '').trim().slice(0, 4_096) || null,
    mediaId: source.id || null,
    timestamp: messageDate(message?.timestamp),
    externalId: String(message?.id || '').trim(),
  }
}

function contactNameFor(contacts, waId) {
  const contact = (contacts || []).find((item) => String(item?.wa_id || '') === String(waId))
  return String(contact?.profile?.name || '').trim().slice(0, 160) || null
}

export async function processWhatsappPayload(payload) {
  const summary = { messages: 0, duplicates: 0, ignored: 0, replies: 0, statuses: 0, unavailable: 0 }
  if (payload?.object !== 'whatsapp_business_account' || !Array.isArray(payload?.entry)) return summary

  for (const entry of payload.entry) {
    for (const change of entry?.changes || []) {
      const value = change?.value || {}
      const phoneNumberId = String(value?.metadata?.phone_number_id || '').trim()
      if (!phoneNumberId) continue
      const resolved = await findWhatsappConfigByPhoneNumberId(phoneNumberId, { decrypt: false })
      if (!resolved?.tenant) {
        summary.unavailable += (value.messages || []).length
        continue
      }
      const tenant = resolved.tenant
      await touchWhatsappWebhook(tenant)

      for (const status of value.statuses || []) {
        if (!status?.id) continue
        await updateWhatsappMessageStatus({
          tenant,
          externalId: String(status.id),
          status: String(status.status || 'unknown'),
          error: status.errors?.[0]?.title || status.errors?.[0]?.message,
        })
        summary.statuses += 1
      }

      for (const incoming of value.messages || []) {
        const customerWaId = String(incoming?.from || '').replace(/\D/g, '')
        const message = messageContent(incoming)
        if (!customerWaId || !message.externalId) {
          summary.ignored += 1
          continue
        }
        const stored = await upsertWhatsappInbound({
          tenant,
          phoneNumberId,
          customerWaId,
          contactName: contactNameFor(value.contacts, customerWaId),
          message,
        })
        summary.messages += 1
        if (!stored.available) {
          summary.unavailable += 1
          continue
        }
        if (stored.duplicate) {
          summary.duplicates += 1
          continue
        }
        if (resolved.config.enabled !== true || resolved.config.ai?.enabled !== true || stored.conversation?.status === 'human') {
          summary.ignored += 1
          continue
        }
        try {
          const generated = await generateWhatsappReply({
            tenant,
            config: resolved.config,
            message,
            contactName: contactNameFor(value.contacts, customerWaId),
          })
          if (!generated.reply) {
            summary.ignored += 1
            continue
          }
          await sendWhatsappText({
            tenant,
            to: customerWaId,
            text: generated.reply,
            replyToMessageId: message.externalId,
            conversationId: stored.conversation?._id,
          })
          summary.replies += 1
        } catch (error) {
          console.error('[whatsapp] No se pudo generar o enviar la respuesta', {
            tenant: String(tenant),
            messageId: message.externalId,
            status: error?.status || 500,
          })
        }
      }
    }
  }
  return summary
}
