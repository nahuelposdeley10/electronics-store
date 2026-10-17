import { useEffect, useState } from 'react'
import { apiGet, apiPut } from '@/lib/api'
import {
  EmptyNote,
  ScreenBlocked,
  ScreenLoading,
  ToggleRow,
} from '../common'
import {
  IconArrow,
  IconChart,
  IconCheck,
  IconClock,
  IconRefresh,
  IconShield,
  IconUsers,
} from '@/components/Icons'

import './styles.css'

const DEFAULT_HANDOFF_MESSAGE = 'Te voy a comunicar con una persona del equipo.'

const EMPTY_FORM = {
  enabled: false,
  aiEnabled: false,
  tone: 'claro y cordial',
  instructions: '',
  handoffMessage: DEFAULT_HANDOFF_MESSAGE,
  phoneNumberId: '',
  businessAccountId: '',
  displayPhoneNumber: '',
  accessToken: '',
}

const WHATSAPP_GUIDE_LINKS = {
  metaSetup: 'https://developers.facebook.com/apps/1427201806174669/use_cases/customize/wa-configurations-v2/?use_case_enum=WHATSAPP_BUSINESS_MESSAGING&product_route=whatsapp-business&business_id=3490564327784794&selected_tab=wa-configurations-v2',
  manager: 'https://business.facebook.com/latest/settings/whatsapp_account?business_id=3490564327784794&selected_asset_id=991739800624988&selected_asset_type=whatsapp-business-account&detail_view_tab=PHONE_NUMBERS',
  docs: 'https://developers.facebook.com/docs/whatsapp/cloud-api/get-started',
  webhookDocs: 'https://developers.facebook.com/docs/graph-api/webhooks/getting-started',
  video: 'https://www.youtube.com/watch?v=N5LLmBtcfCs',
}

function formFromData(data) {
  const connection = data?.connection || {}
  const ai = connection.ai || {}
  return {
    enabled: connection.enabled === true,
    aiEnabled: ai.enabled === true,
    tone: ai.tone || EMPTY_FORM.tone,
    instructions: ai.instructions || '',
    handoffMessage: ai.handoffMessage || DEFAULT_HANDOFF_MESSAGE,
    phoneNumberId: connection.phoneNumberId || '',
    businessAccountId: connection.businessAccountId || '',
    displayPhoneNumber: connection.displayPhoneNumber || '',
    accessToken: '',
  }
}

function statusMeta(status) {
  if (status === 'connected') return { label: 'Conectado', className: 'is-connected' }
  if (status === 'error') return { label: 'Requiere atención', className: 'is-error' }
  if (status === 'pending') return { label: 'Pendiente', className: 'is-pending' }
  return { label: 'No conectado', className: 'is-pending' }
}

function WhatsAppStatus({ status }) {
  const meta = statusMeta(status)
  return (
    <span className={`wa-ai-status ${meta.className}`}>
      <span className="wa-ai-status-dot" aria-hidden="true" />
      {meta.label}
    </span>
  )
}

function Capability({ Icon, title, children }) {
  return (
    <article className="wa-ai-capability">
      <span className="wa-ai-capability-icon" aria-hidden="true"><Icon /></span>
      <div>
        <h3>{title}</h3>
        <p>{children}</p>
      </div>
    </article>
  )
}

function FieldError({ children }) {
  return <span className="wa-ai-field-error" role="alert">{children}</span>
}

function ConfigurationForm({ data, form, setForm, onSubmit, saving, onView, formError }) {
  const connection = data?.connection || {}
  const aiAvailable = data?.ai?.enabled === true
  const hasToken = connection.tokenConfigured === true
  const set = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  return (
    <section className="wa-ai-card wa-ai-config-card" aria-labelledby="wa-ai-config-title">
      <div className="wa-ai-card-heading">
        <div>
          <span className="wa-ai-kicker">Configuración</span>
          <h2 id="wa-ai-config-title">Conexión y comportamiento</h2>
        </div>
        <span className="wa-ai-planned-badge"><IconShield aria-hidden="true" /> Datos protegidos</span>
      </div>
      <form className="wa-ai-form" onSubmit={onSubmit} noValidate>
        <div className="wa-ai-form-intro">
          <p>Usá las credenciales de tu propia cuenta de WhatsApp Cloud API. El token se guarda en el servidor y nunca vuelve a mostrarse en el panel.</p>
          {onView && <button type="button" className="wa-ai-link-button" onClick={() => onView('settings-store')}>Editar contacto público de la tienda</button>}
        </div>

        <div className="wa-ai-form-section">
          <h3>Cuenta de WhatsApp Business</h3>
          <div className="wa-ai-form-grid">
            <label className="inv-field">
              <span>Phone Number ID <em>(requerido para conectar)</em></span>
              <input value={form.phoneNumberId} onChange={set('phoneNumberId')} placeholder="ID entregado por Meta" autoComplete="off" aria-invalid={Boolean(formError?.phoneNumberId)} />
              {formError?.phoneNumberId && <FieldError>{formError.phoneNumberId}</FieldError>}
            </label>
            <label className="inv-field">
              <span>WhatsApp Business Account ID</span>
              <input value={form.businessAccountId} onChange={set('businessAccountId')} placeholder="ID de la cuenta de negocio" autoComplete="off" />
            </label>
            <label className="inv-field">
              <span>Número visible para clientes</span>
              <input value={form.displayPhoneNumber} onChange={set('displayPhoneNumber')} placeholder="+54 9 11 5555-5555" autoComplete="tel" />
            </label>
            <label className="inv-field">
              <span>Token de acceso {hasToken && <em>(guardado)</em>}</span>
              <input type="password" value={form.accessToken} onChange={set('accessToken')} placeholder={hasToken ? 'Dejá vacío para conservarlo' : 'Pegá el token de Meta'} autoComplete="new-password" aria-invalid={Boolean(formError?.accessToken)} />
              {formError?.accessToken && <FieldError>{formError.accessToken}</FieldError>}
            </label>
          </div>
          <p className="wa-ai-form-hint"><IconShield aria-hidden="true" /> No guardamos el token en el navegador ni lo mostramos después de guardar.</p>
        </div>

        <div className="wa-ai-form-section">
          <h3>Respuesta automática</h3>
          <ToggleRow
            label="Activar atención automática de este negocio"
            hint="Guardar esta preferencia no envía mensajes si la conexión o el proveedor todavía no están listos."
            checked={form.enabled}
            onChange={(enabled) => setForm((current) => ({ ...current, enabled }))}
          />
          <ToggleRow
            label="Permitir respuestas del vendedor IA"
            hint={aiAvailable ? 'El proveedor de IA está disponible para este entorno.' : 'El proveedor de IA todavía no está configurado en el servidor.'}
            checked={form.aiEnabled}
            onChange={(aiEnabled) => setForm((current) => ({ ...current, aiEnabled }))}
            disabled={!aiAvailable && !form.aiEnabled}
          />
          {!aiAvailable && <p className="wa-ai-provider-note" role="status"><IconClock aria-hidden="true" /> La preferencia queda bloqueada hasta que el proveedor sea configurado.</p>}
          <div className="wa-ai-form-grid wa-ai-form-grid-single">
            <label className="inv-field">
              <span>Tono del vendedor</span>
              <input value={form.tone} onChange={set('tone')} maxLength="120" placeholder="Claro y cordial" />
            </label>
            <label className="inv-field">
              <span>Indicaciones para tu negocio</span>
              <textarea value={form.instructions} onChange={set('instructions')} rows="4" maxLength="1500" placeholder="Ej.: priorizá explicar garantía y formas de entrega." />
            </label>
            <label className="inv-field">
              <span>Mensaje para derivar a una persona</span>
              <textarea value={form.handoffMessage} onChange={set('handoffMessage')} rows="3" maxLength="500" />
            </label>
          </div>
        </div>

        {formError?.general && <p className="wa-ai-form-error" role="alert">{formError.general}</p>}
        <div className="wa-ai-form-actions">
          <button type="submit" className="primary-btn" disabled={saving} aria-busy={saving}>
            {saving ? 'Guardando…' : 'Guardar configuración'}
          </button>
          <span>Podés volver a editar estos datos cuando quieras.</span>
        </div>
      </form>
    </section>
  )
}

function ConversationsPreview({ conversations }) {
  if (!conversations?.available) {
    return <EmptyNote title="La bandeja todavía no está disponible" text="Las conversaciones aparecerán cuando la persistencia de WhatsApp quede habilitada para este entorno." />
  }
  if (!conversations.total) {
    return <EmptyNote title="Todavía no hay conversaciones" text="Cuando llegue un mensaje, vas a poder verlo y tomar la atención desde acá." />
  }

  return (
    <div className="wa-ai-conversations-list">
      {(conversations.preview || []).map((conversation) => {
        const name = conversation.contactName || conversation.contact?.displayName || conversation.customerWaId || 'Contacto sin nombre'
        const preview = conversation.lastMessagePreview || 'Sin vista previa'
        return (
          <div className="wa-ai-conversation-row" key={conversation._id || conversation.id || conversation.customerWaId}>
            <span className="wa-ai-conversation-avatar" aria-hidden="true">{String(name).slice(0, 1).toUpperCase()}</span>
            <span className="wa-ai-conversation-copy"><strong>{name}</strong><small>{preview}</small></span>
            <span className="wa-ai-conversation-status">{conversation.status || 'abierta'}</span>
          </div>
        )
      })}
      <p className="wa-ai-conversations-total">{conversations.total} conversación{conversations.total === 1 ? '' : 'es'} registradas</p>
    </div>
  )
}

function WhatsAppSetupGuide() {
  return (
    <section className="wa-ai-card wa-ai-guide-card" aria-labelledby="wa-ai-guide-title">
      <div className="wa-ai-card-heading">
        <div>
          <span className="wa-ai-kicker">Ayuda para el dueño</span>
          <h2 id="wa-ai-guide-title">Guía para conectar WhatsApp</h2>
        </div>
        <span className="wa-ai-planned-badge"><IconClock aria-hidden="true" /> Guardala para volver después</span>
      </div>
      <div className="wa-ai-guide-body">
        <p className="wa-ai-guide-intro">Si se cierra Meta o se pierde el paso, retomá desde estos enlaces. La pantalla te indica exactamente qué completar.</p>
        <div className="wa-ai-guide-steps">
          <article className="wa-ai-guide-step">
            <span className="wa-ai-guide-number">1</span>
            <div>
              <strong>Abrir la configuración de Meta</strong>
              <p>Entrá al caso de uso de WhatsApp y elegí <em>Paso 2. Configuración de producción</em>.</p>
            </div>
          </article>
          <article className="wa-ai-guide-step">
            <span className="wa-ai-guide-number">2</span>
            <div>
              <strong>Configurar el webhook</strong>
              <p>En <em>Configurar Webhooks</em>, usá esta URL pública:</p>
              <code>https://www.tiendabnp.com/api/whatsapp/webhook</code>
            </div>
          </article>
          <article className="wa-ai-guide-step">
            <span className="wa-ai-guide-number">3</span>
            <div>
              <strong>Verificar y guardar</strong>
              <p>Completá el identificador de verificación del servidor y presioná <em>Verificar y guardar</em>.</p>
            </div>
          </article>
          <article className="wa-ai-guide-step">
            <span className="wa-ai-guide-number">4</span>
            <div>
              <strong>Revisar el número</strong>
              <p>En WhatsApp Manager podés confirmar que el número y la cuenta estén asociados.</p>
            </div>
          </article>
        </div>
        <div className="wa-ai-guide-links" aria-label="Enlaces de ayuda">
          <a href={WHATSAPP_GUIDE_LINKS.metaSetup} target="_blank" rel="noreferrer">
            <span><strong>Abrir configuración de Meta</strong><small>Paso 2 listo para completar</small></span>
            <IconArrow aria-hidden="true" />
          </a>
          <a href={WHATSAPP_GUIDE_LINKS.manager} target="_blank" rel="noreferrer">
            <span><strong>Abrir WhatsApp Manager</strong><small>Revisar número y cuenta de negocio</small></span>
            <IconArrow aria-hidden="true" />
          </a>
          <a href={WHATSAPP_GUIDE_LINKS.docs} target="_blank" rel="noreferrer">
            <span><strong>Ver guía visual oficial</strong><small>Documentación de Meta</small></span>
            <IconArrow aria-hidden="true" />
          </a>
          <a href={WHATSAPP_GUIDE_LINKS.webhookDocs} target="_blank" rel="noreferrer">
            <span><strong>Ver ayuda de Webhooks</strong><small>Qué recibe Meta y cómo verificarlo</small></span>
            <IconArrow aria-hidden="true" />
          </a>
          <a href={WHATSAPP_GUIDE_LINKS.video} target="_blank" rel="noreferrer">
            <span><strong>Ver video paso a paso</strong><small>Video externo; la interfaz puede cambiar</small></span>
            <IconArrow aria-hidden="true" />
          </a>
        </div>
        <p className="wa-ai-guide-warning"><IconShield aria-hidden="true" /> Nunca compartas el token de Meta ni el identificador de verificación por WhatsApp o correo.</p>
      </div>
    </section>
  )
}

function WhatsAppSellerScreen({ onView }) {
  const [data, setData] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState('')
  const [formError, setFormError] = useState(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let alive = true
    apiGet('/api/admin/whatsapp')
      .then((result) => {
        if (!alive) return
        setData(result)
        setForm(formFromData(result))
        setError('')
      })
      .catch((err) => {
        if (alive) setError(err.message || 'No pudimos leer la conexión de WhatsApp.')
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [attempt])

  const reload = () => {
    setData(null)
    setLoading(true)
    setError('')
    setAttempt((value) => value + 1)
  }

  const refresh = () => {
    setRefreshing(true)
    setSavedMessage('')
    apiGet('/api/admin/whatsapp')
      .then((result) => {
        setData(result)
        setForm(formFromData(result))
        setError('')
      })
      .catch((err) => setError(err.message || 'No pudimos actualizar el estado.'))
      .finally(() => setRefreshing(false))
  }

  const save = async (event) => {
    event.preventDefault()
    const nextErrors = {}
    if (form.enabled && !form.phoneNumberId.trim()) nextErrors.phoneNumberId = 'Cargá el Phone Number ID antes de activar la conexión.'
    if (form.enabled && !data?.connection?.tokenConfigured && !form.accessToken.trim()) nextErrors.accessToken = 'Cargá el token de acceso antes de activar la conexión.'
    if (Object.keys(nextErrors).length) {
      setFormError(nextErrors)
      return
    }
    setSaving(true)
    setSavedMessage('')
    setFormError(null)
    try {
      const result = await apiPut('/api/admin/whatsapp', {
        enabled: form.enabled,
        phoneNumberId: form.phoneNumberId.trim() || null,
        businessAccountId: form.businessAccountId.trim() || null,
        displayPhoneNumber: form.displayPhoneNumber.trim() || null,
        ...(form.accessToken.trim() ? { accessToken: form.accessToken.trim() } : {}),
        ai: {
          enabled: form.aiEnabled,
          tone: form.tone.trim(),
          instructions: form.instructions.trim(),
          handoffMessage: form.handoffMessage.trim(),
        },
      })
      setData((current) => ({ ...current, connection: result.connection, ai: result.ai }))
      setForm((current) => ({ ...current, accessToken: '' }))
      setSavedMessage('Configuración guardada. La conexión no se activa hasta que los datos sean válidos y el webhook esté listo.')
    } catch (err) {
      setFormError({ general: err.message || 'No pudimos guardar la configuración.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading && !data) return <ScreenLoading label="Leyendo estado de WhatsApp…" />
  if (error && !data) return <ScreenBlocked message={error} onRetry={reload} />
  if (!data) return <section className="dash-screen wa-ai-screen"><EmptyNote title="No hay configuración disponible" text="Cuando la integración responda, su estado aparecerá acá." /></section>

  const connection = data.connection || {}
  const aiReady = data.ai?.enabled === true
  const webhook = data.webhook || {}

  return (
    <section className="dash-screen wa-ai-screen" aria-labelledby="wa-ai-title">
      <header className="dash-head wa-ai-head">
        <div>
          <span className="dash-eyebrow">Administración · canales de venta</span>
          <h1 id="wa-ai-title">Vendedor IA por WhatsApp</h1>
          <p className="wa-ai-lead">Configurá la atención automática con tu propio número y mantené siempre una salida hacia tu equipo.</p>
        </div>
        <button type="button" className="ghost-btn wa-ai-refresh" onClick={refresh} disabled={refreshing}>
          <IconRefresh aria-hidden="true" />
          {refreshing ? 'Actualizando…' : 'Actualizar estado'}
        </button>
      </header>

      {error && <p className="wa-ai-inline-error" role="alert">{error}</p>}
      {savedMessage && <p className="wa-ai-success" role="status"><IconCheck aria-hidden="true" /> {savedMessage}</p>}

      <section className="wa-ai-card wa-ai-connection-card" aria-labelledby="wa-ai-connection-title">
        <div className="wa-ai-card-heading">
          <div>
            <span className="wa-ai-kicker">Estado de la integración</span>
            <h2 id="wa-ai-connection-title">WhatsApp Cloud API</h2>
          </div>
          <WhatsAppStatus status={connection.status} />
        </div>
        <div className="wa-ai-status-grid">
          <div><span>Número conectado</span><strong>{connection.displayPhoneNumber || 'Todavía no cargado'}</strong></div>
          <div><span>Phone Number ID</span><strong>{connection.phoneNumberId || 'Todavía no cargado'}</strong></div>
          <div><span>Proveedor de IA</span><strong>{aiReady ? `${data.ai.provider || 'Configurado'}${data.ai.modelConfigured ? '' : ' · modelo pendiente'}` : 'Pendiente de configuración'}</strong></div>
          <div><span>Token de Meta</span><strong>{connection.tokenConfigured ? 'Guardado de forma segura' : 'No configurado'}</strong></div>
        </div>
      </section>

      <ConfigurationForm data={data} form={form} setForm={setForm} onSubmit={save} saving={saving} onView={onView} formError={formError} />

      <section className="wa-ai-card wa-ai-overview-card" aria-labelledby="wa-ai-overview-title">
        <div className="wa-ai-card-heading">
          <div>
            <span className="wa-ai-kicker">Conversaciones</span>
            <h2 id="wa-ai-overview-title">Bandeja de atención</h2>
          </div>
          <span className="wa-ai-planned-badge"><IconUsers aria-hidden="true" /> {data.conversations?.total || 0} registradas</span>
        </div>
        <div className="wa-ai-conversations"><ConversationsPreview conversations={data.conversations} /></div>
      </section>

      <section className="wa-ai-card wa-ai-overview-card" aria-labelledby="wa-ai-webhook-title">
        <div className="wa-ai-card-heading">
          <div>
            <span className="wa-ai-kicker">Recepción de mensajes</span>
            <h2 id="wa-ai-webhook-title">Webhook de WhatsApp</h2>
          </div>
          <span className={`wa-ai-webhook-badge${webhook.verificationConfigured && webhook.signatureConfigured ? ' is-ready' : ''}`}>
            {webhook.verificationConfigured && webhook.signatureConfigured ? 'Listo para verificar' : 'Falta configuración del servidor'}
          </span>
        </div>
        <div className="wa-ai-webhook-body">
          <p>Usá esta ruta en Meta para recibir eventos. El servidor valida la verificación y la firma antes de procesar mensajes.</p>
          <code>{webhook.callbackPath || '/api/whatsapp/webhook'}</code>
          <div className="wa-ai-check-list">
            <span className={webhook.verificationConfigured ? 'is-ok' : ''}><IconCheck aria-hidden="true" /> Token de verificación</span>
            <span className={webhook.signatureConfigured ? 'is-ok' : ''}><IconCheck aria-hidden="true" /> Firma de Meta</span>
          </div>
        </div>
      </section>

      <WhatsAppSetupGuide />

      <div className="wa-ai-capabilities">
        <Capability Icon={IconChart} title="Consulta datos reales">Productos, precios y stock se consultan desde la tienda antes de responder.</Capability>
        <Capability Icon={IconUsers} title="Derivación a una persona">Podés tomar una conversación y pausar la respuesta automática cuando haga falta.</Capability>
        <Capability Icon={IconShield} title="Cada negocio aislado">La conexión y las conversaciones pertenecen únicamente a este negocio.</Capability>
      </div>
    </section>
  )
}

export default WhatsAppSellerScreen
