import { useEffect, useState } from 'react'
import { apiGet, apiPost, apiPut } from '@/lib/api'
import { formatARS } from '@/data/format'
import { BUSINESS_PLANS } from '@/data/plans'
import { useToast } from '@/context/useToast'
import './styles.css'

const LABELS = { unconfigured: 'Sin configurar', trial: 'En prueba', active: 'Activa', overdue: 'Vencida', paused: 'Pausada', cancelled: 'Cancelada' }
const displayDate = (value) => value ? value.split('-').reverse().join('/') : 'Sin fecha'
const displayDateTime = (value) => value ? new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : 'Sin pagos todavía'
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())

function SubscriptionForms({ data, business, onChange }) {
  const [form, setForm] = useState({ planCode: data.planCode || '', plan: data.plan, price: data.price, status: data.status === 'unconfigured' ? 'trial' : data.status, dueDate: data.dueDate })
  const [payment, setPayment] = useState(() => ({ requestId: crypto.randomUUID(), amount: data.price || '', paidAt: today(), dueDate: data.dueDate, method: 'transferencia', reference: '' }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const { showToast } = useToast()
  const path = `/api/admin/subscriptions/${business.id}`
  const change = (setter, key) => (event) => setter((old) => ({ ...old, [key]: event.target.value }))
  const changePlan = (event) => {
    const planCode = event.target.value
    const plan = BUSINESS_PLANS.find((item) => item.code === planCode)
    setForm((old) => ({ ...old, planCode, plan: plan?.name || old.plan, price: plan?.price ?? old.price }))
  }
  const save = async (event, isPayment) => {
    event.preventDefault()
    if (busy) return
    setBusy(true)
    setError('')
    try {
      const result = isPayment
        ? await apiPost(`${path}/payments`, { ...payment, amount: Number(payment.amount), revision: data.revision })
        : await apiPut(path, { ...form, price: Number(form.price), revision: data.revision })
      onChange(result)
      showToast(isPayment ? 'Pago registrado y vencimiento actualizado.' : 'Suscripción guardada.', 'success')
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }
  return <>
    {error && <p className="subscription-error" role="alert">{error}</p>}
    <div className="subscription-forms">
      <form onSubmit={(event) => save(event, false)} className="subscription-card">
        <h2>Plan del negocio</h2>
        <fieldset disabled={busy}>
          <label>Plan<select value={form.planCode} onChange={changePlan} required>
            <option value="">Elegí un plan…</option>
            {BUSINESS_PLANS.map((plan) => <option key={plan.code} value={plan.code}>{plan.name} · {formatARS(plan.price)} / mes</option>)}
          </select></label>
          <label>Precio mensual (ARS)<input type="number" min="0" max="100000000" step="0.01" value={form.price} onChange={change(setForm, 'price')} required /></label>
          <label>Vencimiento<input type="date" value={form.dueDate} onChange={change(setForm, 'dueDate')} required /></label>
          <label>Estado<select value={form.status} onChange={change(setForm, 'status')}>
            {['trial', 'active', 'paused', 'cancelled'].map((status) => <option key={status} value={status}>{LABELS[status]}</option>)}
          </select></label>
          <button type="submit" className="primary-btn">{busy ? 'Guardando…' : 'Guardar suscripción'}</button>
        </fieldset>
      </form>
      <form onSubmit={(event) => save(event, true)} className="subscription-card">
        <h2>Registrar pago manual</h2>
        <p>Registrá un cobro recibido. El pago deja la suscripción activa con el vencimiento que indiques.</p>
        {!data.plan && <p>Primero guardá el plan del negocio.</p>}
        <fieldset disabled={busy || !data.plan}>
          <label>Importe cobrado (ARS)<input type="number" min="0.01" max="100000000" step="0.01" value={payment.amount} onChange={change(setPayment, 'amount')} required /></label>
          <label>Fecha del pago<input type="date" max={today()} value={payment.paidAt} onChange={change(setPayment, 'paidAt')} required /></label>
          <label>Nuevo vencimiento<input type="date" min={data.dueDate > payment.paidAt ? data.dueDate : payment.paidAt} value={payment.dueDate} onChange={change(setPayment, 'dueDate')} required /></label>
          <label>Medio de pago<select value={payment.method} onChange={change(setPayment, 'method')}>
            <option value="transferencia">Transferencia</option><option value="efectivo">Efectivo</option><option value="otro">Otro</option>
          </select></label>
          <label>Referencia o comprobante<input value={payment.reference} onChange={change(setPayment, 'reference')} maxLength={200} /></label>
          <button type="submit" className="primary-btn">{busy ? 'Guardando…' : 'Registrar pago y renovar'}</button>
        </fieldset>
      </form>
    </div>
  </>
}

export default function Subscription({ business, onBack, onUpdated }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [billingBusy, setBillingBusy] = useState(false)
  const [billingError, setBillingError] = useState('')
  useEffect(() => {
    let alive = true
    apiGet(`/api/admin/subscriptions/${business.id}`).then((result) => { if (alive) { setData(result); setError('') } }).catch((err) => { if (alive) setError(err.message) })
    return () => { alive = false }
  }, [business.id, reload])
  const update = (result) => { setData(result); onUpdated(result) }
  const createBillingLink = async () => {
    setBillingBusy(true); setBillingError('')
    try { update(await apiPost(`/api/admin/subscriptions/${business.id}/billing-link`, {})) }
    catch (err) { setBillingError(err.message) }
    finally { setBillingBusy(false) }
  }
  return <div className="dash-screen">
    <header className="dash-head"><div><span className="dash-eyebrow">Superadmin · Suscripciones</span><h1>{business.storeName}</h1></div></header>
    <div className="dash-toolbar"><button type="button" className="ghost-btn" onClick={onBack}>Volver a negocios</button><button type="button" className="ghost-btn" onClick={() => setReload((n) => n + 1)}>Actualizar datos</button></div>
    <p className="list-note">Administración del abono mensual. El local autoriza el débito desde Mercado Pago y el sistema actualiza el estado y el historial con cada notificación.</p>
    {error && <p role="alert" className="subscription-error">{error}</p>}
    {billingError && <p role="alert" className="subscription-error">{billingError}</p>}
    {!data && !error && <p role="status">Cargando suscripción…</p>}
    {data && <>
      <p className="subscription-summary"><strong>{LABELS[data.effectiveStatus]}</strong> · {data.plan || 'Sin plan'} · {formatARS(data.price)} / mes · Próximo vencimiento: {displayDate(data.dueDate)}</p>
      {data.effectiveStatus === 'paused' || data.effectiveStatus === 'cancelled' || data.effectiveStatus === 'overdue' ? <div className="subscription-alert"><strong>{LABELS[data.effectiveStatus]}</strong><span>El acceso queda restringido hasta confirmar el pago o reactivar la suscripción.</span></div> : null}
      <section className="subscription-metrics" aria-label="Estado del cobro">
        <div><span>Último pago</span><strong>{displayDateTime(data.billing?.lastPaymentAt)}</strong></div>
        <div><span>Estado del último pago</span><strong>{data.billing?.lastPaymentStatus || 'Sin cobros automáticos'}</strong></div>
        <div><span>Próximo vencimiento</span><strong>{displayDate(data.dueDate)}</strong></div>
      </section>
      <section className="subscription-card subscription-billing"><h2>Cobro automático</h2><p>Generá un enlace de Mercado Pago para que el local autorice o actualice el débito mensual.</p><button type="button" className="primary-btn" disabled={billingBusy || !data.plan || !data.price} onClick={createBillingLink}>{billingBusy ? 'Generando…' : data.billing?.initPoint ? 'Regenerar enlace de suscripción' : 'Generar enlace de suscripción'}</button>{data.billing?.initPoint && <a className="ghost-btn" href={data.billing.initPoint} target="_blank" rel="noreferrer">Abrir enlace de autorización</a>}</section>
      <SubscriptionForms key={`${data.revision}-${reload}`} data={data} business={business} onChange={update} />
      <section className="subscription-card"><h2>Historial de pagos ({data.payments.length})</h2>
        {!data.payments.length ? <p>Todavía no hay pagos registrados.</p> : <div className="subscription-history"><table className="table"><thead><tr><th>Fecha</th><th>Plan</th><th>Importe</th><th>Medio</th><th>Referencia</th><th>Vencimiento</th></tr></thead><tbody>
          {data.payments.map((p) => <tr key={p.requestId}><td>{displayDate(p.paidAt)}</td><td>{p.plan}</td><td>{formatARS(p.amount)}</td><td>{p.method === 'mercadopago' ? 'Mercado Pago' : p.method}</td><td>{p.reference || '—'}</td><td>{displayDate(p.dueDate)}</td></tr>)}
        </tbody></table></div>}
      </section>
    </>}
  </div>
}
