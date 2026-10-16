import { getSettings } from '../lib/settings.js'
import { searchProducts } from '../lib/whatsapp-tools.js'

function providerConfig() {
  return {
    provider: String(process.env.WHATSAPP_AI_PROVIDER || '').trim().toLowerCase(),
    baseUrl: String(process.env.WHATSAPP_AI_BASE_URL || '').trim().replace(/\/$/, ''),
    apiKey: String(process.env.WHATSAPP_AI_API_KEY || '').trim(),
    model: String(process.env.WHATSAPP_AI_MODEL || '').trim(),
  }
}
function extractText(message) {
  return String(message?.text || '').trim()
}

export function whatsappAiAvailability() {
  const config = providerConfig()
  return {
    enabled: config.provider === 'openai-compatible' && Boolean(config.baseUrl && config.apiKey && config.model),
    provider: config.provider || 'disabled',
    modelConfigured: Boolean(config.model),
  }
}

function safeText(value, max = 2_000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max)
}

export async function generateWhatsappReply({ tenant, config, message, contactName } = {}) {
  if (config?.ai?.enabled !== true) return { skipped: 'tenant_ai_disabled' }
  const provider = providerConfig()
  if (provider.provider !== 'openai-compatible' || !provider.baseUrl || !provider.apiKey || !provider.model) {
    return { skipped: 'provider_not_configured' }
  }
  const text = extractText(message)
  if (!text) return { skipped: 'unsupported_message_type' }

  const settings = await getSettings({ fresh: true, tenant })
  const products = await searchProducts({ tenant, query: text, limit: 8 })
  const storeName = safeText(settings.store?.name || 'la tienda', 160)
  const system = [
    `Sos el vendedor de WhatsApp de ${storeName}.`,
    'Respondé en español rioplatense, claro, breve y cordial.',
    'Nunca inventes productos, precios, stock, envíos ni estados de pago.',
    'Usá únicamente la información del contexto. Si no alcanza, pedí un dato o derivá a una persona.',
    `Tono configurado: ${safeText(config.ai.tone, 120)}.`,
    config.ai.instructions ? `Indicaciones del negocio: ${safeText(config.ai.instructions, 1_500)}` : '',
  ].filter(Boolean).join('\n')
  const context = JSON.stringify({
    customer: safeText(contactName, 120),
    message: text,
    products: products.items,
  })
  const response = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${provider.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: 0.3,
      max_tokens: 300,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: context },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    const error = new Error('El proveedor de IA no respondió correctamente')
    error.status = response.status >= 500 ? 502 : 400
    throw error
  }
  const reply = safeText(payload?.choices?.[0]?.message?.content, 4_096)
  if (!reply) return { skipped: 'empty_provider_response' }
  return { reply, products: products.items }
}
