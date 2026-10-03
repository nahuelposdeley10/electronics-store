import { useState } from 'react'
import { IconCheck, IconEye } from '@/components/Icons'
import { STEPS, formatMoney } from '../../content.js'
import './styles.css'

export default function ReviewStep({ data, busy, onSave, onStep, onView, canView }) {
  const [reviewed, setReviewed] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')
  const url = data.storePath ? `${window.location.origin}${data.storePath}` : ''
  const copy = async () => {
    try { await navigator.clipboard.writeText(url); setCopyMessage('Enlace copiado.') }
    catch { setCopyMessage('No pudimos copiarlo. Seleccioná y copiá el enlace de abajo.') }
  }
  return (
    <div className="onboard-review">
      {data.finished && <div className="onboard-review-success" role="status"><IconCheck /><div><strong>¡Completaste la puesta en marcha!</strong><p>Tu configuración inicial quedó guardada. Podés volver a revisarla cuando quieras.</p></div></div>}
      <dl>
        <div><dt>Negocio</dt><dd>{data.contact.name || 'Pendiente'}</dd></div>
        <div><dt>Catálogo</dt><dd>{data.products} productos con precio · {data.available} con stock</dd></div>
        <div><dt>Cobros</dt><dd>{data.payments.online ? 'Mercado Pago' : 'Pedidos por WhatsApp'}</dd></div>
        <div><dt>Entrega</dt><dd>{data.shipping.enabled ? `${data.shipping.label}: ${formatMoney(data.shipping.cost)} · gratis desde ${formatMoney(data.shipping.freeThreshold)}` : 'Sin cargo de envío en la web'}</dd></div>
      </dl>
      {!data.ready && <div className="onboard-review-pending"><strong>Antes de finalizar, completá:</strong>{data.steps.filter((step) => step.id !== 'review' && !step.complete).map((step) => <button key={step.id} type="button" className="ghost-btn" disabled={busy} onClick={() => onStep(step.id)}>{STEPS.find((item) => item.id === step.id).title}</button>)}</div>}
      {url && <div className="onboard-review-link"><a href={url} target="_blank" rel="noopener noreferrer"><IconEye />Abrir mi tienda en otra pestaña</a><input aria-label="Enlace público de tu tienda" value={url} readOnly onFocus={(event) => event.target.select()} /><button type="button" className="ghost-btn" onClick={copy}>Copiar enlace</button><span role="status">{copyMessage}</span></div>}
      {!data.finished && <>
        <label className="onboard-review-confirm"><input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} disabled={!data.ready || busy} />Revisé mi tienda y confirmo los datos, productos, cobros y entregas.</label>
        <button type="button" className="primary-btn" disabled={!data.ready || !reviewed || busy} onClick={() => onSave('finish')}>{busy ? 'Verificando…' : 'Finalizar puesta en marcha'}</button>
      </>}
      <aside className="onboard-review-extras"><h3>También podés preparar tu local</h3><p>Opcional. No bloquea la tienda online.</p><div>
        {canView('settings-content') && <button type="button" className="ghost-btn" onClick={() => onView('settings-content')}>Revisar portada y textos</button>}
        {canView('settings-appearance') && <button type="button" className="ghost-btn" onClick={() => onView('settings-appearance')}>Logo, colores y diseño</button>}
        {canView('cash-current') && <button type="button" className="ghost-btn" onClick={() => onView('cash-current')}>{data.cashReady ? 'Revisar caja' : 'Preparar mi caja'}</button>}
        {canView('settings-users') && <button type="button" className="ghost-btn" onClick={() => onView('settings-users')}>Invitar a mi equipo</button>}
      </div></aside>
      <p className="onboard-review-notice">Antes de compartirla, reemplazá los textos e imágenes de ejemplo y revisá las promesas de cuotas, envíos y garantías de la portada. Deben coincidir con lo que ofrece tu negocio.</p>
    </div>
  )
}
