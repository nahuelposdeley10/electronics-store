import { env } from '../config/env.js'

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function textValue(value) {
  return String(value ?? '').trim()
}

export function adminWelcomeEmail({
  name,
  email,
  storeName,
  planName,
  planPrice,
  panelUrl,
  storeUrl,
  password,
}) {
  const safeName = escapeHtml(name || 'equipo')
  const safeStoreName = escapeHtml(storeName || 'tu negocio')
  const safePlanName = escapeHtml(planName || 'Plan inicial')
  const safePlanPrice = escapeHtml(planPrice || '')
  const safeEmail = escapeHtml(email)
  const safePassword = escapeHtml(password)
  const safePanelUrl = escapeHtml(panelUrl)
  const safeStoreUrl = storeUrl ? escapeHtml(storeUrl) : ''
  const storeLink = storeUrl
    ? `<p style="margin:24px 0 0"><a href="${safeStoreUrl}" style="color:#315cf5">Ver la tienda pública</a></p>`
    : ''
  const textStoreLink = storeUrl ? `\nTienda pública: ${storeUrl}` : ''

  return {
    subject: `Tu acceso a ${textValue(storeName) || 'Tienda BNP'}`,
    text: `Hola ${textValue(name) || 'equipo'},

Ya podés ingresar al panel de ${textValue(storeName) || 'tu negocio'} en Tienda BNP.

Plan: ${textValue(planName) || 'Plan inicial'}${textValue(planPrice) ? ` (${textValue(planPrice)} por mes)` : ''}
Email de acceso: ${textValue(email)}
Contraseña de acceso: ${textValue(password)}
Panel: ${textValue(panelUrl)}${textStoreLink}

Podés cambiar esta contraseña desde el panel, en Usuarios. Nunca compartas estos datos.

Saludos,
Equipo Tienda BNP`,
    html: `<!doctype html>
<html lang="es">
  <body style="margin:0;background:#f5f7fc;color:#14243e;font-family:Arial,Helvetica,sans-serif">
    <div style="max-width:620px;margin:32px auto;padding:0 16px">
      <div style="background:#14243e;border-radius:20px 20px 0 0;padding:28px 32px;color:#fff">
        <div style="font-size:24px;font-weight:700;letter-spacing:-.5px">Tienda BNP</div>
        <div style="margin-top:8px;color:#dce8ff;font-size:14px">Tu negocio bajo control</div>
      </div>
      <div style="background:#fff;padding:32px;border-radius:0 0 20px 20px;box-shadow:0 12px 30px rgba(20,36,62,.08)">
        <p style="font-size:18px;margin:0 0 14px">Hola ${safeName},</p>
        <h1 style="font-size:26px;line-height:1.2;margin:0 0 14px;color:#14243e">Tu cuenta ya está lista</h1>
        <p style="font-size:16px;line-height:1.6;color:#617089;margin:0">Creamos el acceso para <strong style="color:#14243e">${safeStoreName}</strong>. Desde tu panel podés administrar la tienda, el catálogo y las operaciones de tu negocio.</p>
        <div style="background:#f5f7fc;border:1px solid #dce8ff;border-radius:14px;padding:20px;margin:24px 0">
          <p style="margin:0 0 10px;font-size:13px;color:#617089;text-transform:uppercase;letter-spacing:.08em">Datos de ingreso</p>
          <p style="margin:8px 0"><strong>Plan:</strong> ${safePlanName}${safePlanPrice ? ` · ${safePlanPrice} por mes` : ''}</p>
          <p style="margin:8px 0"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin:8px 0"><strong>Contraseña de acceso:</strong> <span style="font-family:monospace;background:#fff;padding:4px 7px;border-radius:6px">${safePassword}</span></p>
        </div>
        <p style="text-align:center;margin:28px 0"><a href="${safePanelUrl}" style="display:inline-block;background:#315cf5;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700">Ingresar al panel</a></p>
        ${storeLink}
        <p style="font-size:13px;line-height:1.6;color:#617089;margin:28px 0 0">Podés cambiar la contraseña desde el panel, en Usuarios. No compartas estos datos. Si no solicitaste esta cuenta, respondé este correo para que podamos ayudarte.</p>
      </div>
      <p style="font-size:12px;color:#617089;text-align:center;margin:18px 0">Tienda BNP · Plataforma para comercios</p>
    </div>
  </body>
</html>`,
  }
}

export async function sendAdminWelcomeEmail(details) {
  if (env.emailProvider !== 'resend' || !env.resendApiKey || !env.emailFrom) {
    return { sent: false, skipped: true, reason: 'email_not_configured' }
  }

  const message = adminWelcomeEmail(details)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.emailFrom,
        to: [details.email],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(env.emailReplyTo ? { reply_to: env.emailReplyTo } : {}),
      }),
      signal: controller.signal,
    })
    if (!response.ok) {
      const errorText = await response.text().catch(() => '')
      throw new Error(`Resend respondió ${response.status}${errorText ? `: ${errorText.slice(0, 180)}` : ''}`)
    }
    return { sent: true }
  } finally {
    clearTimeout(timeout)
  }
}

export function commercialActivationEmail({ name, storeName, planName, planPrice, activationUrl }) {
  const safeName = escapeHtml(name || 'equipo')
  const safeStoreName = escapeHtml(storeName || 'tu negocio')
  const safePlanName = escapeHtml(planName || 'Plan inicial')
  const safePlanPrice = escapeHtml(planPrice || '')
  const safeActivationUrl = escapeHtml(activationUrl)
  return {
    subject: `Activá tu cuenta de ${textValue(storeName) || 'Tienda BNP'}`,
    text: `Hola ${textValue(name) || 'equipo'},

Tu suscripción al plan ${textValue(planName)} de Tienda BNP fue confirmada.

Negocio: ${textValue(storeName)}
Plan: ${textValue(planName)}${textValue(planPrice) ? ` (${textValue(planPrice)} por mes)` : ''}

Creá tu contraseña y activá tu cuenta desde este link:
${activationUrl}

El link vence en 48 horas y solo puede utilizarse una vez.

Saludos,
Equipo Tienda BNP`,
    html: `<!doctype html>
<html lang="es"><body style="margin:0;background:#f5f7fc;color:#14243e;font-family:Arial,Helvetica,sans-serif">
  <div style="max-width:620px;margin:32px auto;padding:0 16px">
    <div style="background:#14243e;border-radius:20px 20px 0 0;padding:28px 32px;color:#fff"><div style="font-size:24px;font-weight:700">Tienda BNP</div><div style="margin-top:8px;color:#dce8ff;font-size:14px">Tu negocio bajo control</div></div>
    <div style="background:#fff;padding:32px;border-radius:0 0 20px 20px;box-shadow:0 12px 30px rgba(20,36,62,.08)">
      <p style="font-size:18px;margin:0 0 14px">Hola ${safeName},</p>
      <h1 style="font-size:26px;line-height:1.2;margin:0 0 14px">Tu suscripción fue confirmada</h1>
      <p style="font-size:16px;line-height:1.6;color:#617089">Ya podés activar la cuenta de <strong style="color:#14243e">${safeStoreName}</strong> en Tienda BNP.</p>
      <div style="background:#f5f7fc;border:1px solid #dce8ff;border-radius:14px;padding:20px;margin:24px 0"><p style="margin:0 0 8px"><strong>Plan:</strong> ${safePlanName}</p><p style="margin:8px 0"><strong>Mensualidad:</strong> ${safePlanPrice}</p></div>
      <p style="text-align:center;margin:28px 0"><a href="${safeActivationUrl}" style="display:inline-block;background:#315cf5;color:#fff;text-decoration:none;padding:14px 22px;border-radius:10px;font-weight:700">Crear mi contraseña y activar cuenta</a></p>
      <p style="font-size:13px;line-height:1.6;color:#617089;margin:28px 0 0">Este link vence en 48 horas y solo puede utilizarse una vez. Si no reconocés esta suscripción, respondé este correo para que podamos ayudarte.</p>
    </div><p style="font-size:12px;color:#617089;text-align:center;margin:18px 0">Tienda BNP · Plataforma para comercios</p>
  </div>
</body></html>`,
  }
}

export async function sendCommercialActivationEmail(details) {
  if (env.emailProvider !== 'resend' || !env.resendApiKey || !env.emailFrom) {
    return { sent: false, skipped: true, reason: 'email_not_configured' }
  }
  const message = commercialActivationEmail(details)
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.emailFrom, to: [details.email], subject: message.subject, html: message.html, text: message.text, ...(env.emailReplyTo ? { reply_to: env.emailReplyTo } : {}) }),
      signal: controller.signal,
    })
    if (!response.ok) throw new Error(`Resend respondió ${response.status}`)
    return { sent: true }
  } finally {
    clearTimeout(timeout)
  }
}
