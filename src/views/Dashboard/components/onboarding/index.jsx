import { useEffect, useRef } from 'react'
import { IconArrow, IconBack, IconCheck, IconRefresh } from '@/components/Icons'
import { claimOnboardingEntry } from '@/lib/onboardingEntry'
import BusinessStep from './components/BusinessStep'
import PaymentsStep from './components/PaymentsStep'
import ShippingStep from './components/ShippingStep'
import ReviewStep from './components/ReviewStep'
import useOnboarding from './useOnboarding.js'
import { STEPS } from './content.js'
import './styles.css'

export default function Onboarding({ screen, role, userId, assistance = false, onView, canView, onBusinessSaved }) {
  const { data, error, busy, refresh, save } = useOnboarding(screen, onBusinessSaved)
  const title = useRef(null)
  const previousStep = useRef(null)
  const entryChecked = useRef(false)
  const entryScreen = useRef(screen)
  const isOpen = screen === 'onboarding'
  const current = data?.lastStep || 'business'

  useEffect(() => {
    if (!data || entryChecked.current) return
    entryChecked.current = true
    const start = claimOnboardingEntry({ role, userId, status: data, storage: sessionStorage })
    // Do not interrupt navigation the admin started while the initial request loaded.
    if (start && screen === entryScreen.current && screen !== 'onboarding') onView('onboarding')
  }, [data, role, userId, screen, onView])

  useEffect(() => {
    if (isOpen && data && previousStep.current !== current) title.current?.focus()
    previousStep.current = isOpen && data ? current : null
  }, [isOpen, current, data])

  if (!data) return <section className="onboard-banner" aria-label="Puesta en marcha"><p role={error ? 'alert' : 'status'}>{error || 'Comprobando la puesta en marcha de tu negocio…'}</p>{error && <button className="ghost-btn" type="button" onClick={refresh}>Reintentar</button>}</section>

  const stepIndex = STEPS.findIndex((step) => step.id === current)
  const step = STEPS[stepIndex]
  const done = data.steps.find((item) => item.id === current)?.complete
  const percent = Math.round(data.completed / data.total * 100)
  const goStep = (id) => save('visit', id)
  const missingSteps = data.steps
    .filter((item) => !item.complete && item.id !== 'review')
    .map((item) => ({ ...item, content: STEPS.find((stepItem) => stepItem.id === item.id) }))

  if (!isOpen) {
    if (assistance || data.finished) return null
    return <section className="onboard-banner" aria-label="Puesta en marcha">
      <div><span className="dash-eyebrow">Tu negocio, paso a paso</span><strong>{data.completedAt ? 'Tu configuración necesita una revisión' : 'Prepará tu tienda para comenzar'}</strong><span>{data.completed} de {data.total} pasos completos. Guardá los cambios en cada pantalla y volvé a la guía.</span></div>
      {missingSteps.length > 0 && <div className="onboard-missing" aria-label="Secciones pendientes">
        <span>Te falta completar</span>
        <div>{missingSteps.map((item) => <button key={item.id} type="button" onClick={async () => { onView('onboarding'); await goStep(item.id) }}>{item.content?.title || item.id}</button>)}</div>
      </div>}
      <div className="onboard-banner-actions"><button className="primary-btn" type="button" onClick={() => onView('onboarding')}>Continuar puesta en marcha<IconArrow /></button><button type="button" className="ghost-btn" disabled={busy} onClick={() => save('pause')}>Más tarde</button></div>
      {error && <p role="alert">{error}</p>}
    </section>
  }

  return <section className="onboard dash-screen" aria-label="Puesta en marcha" aria-busy={busy}>
    <header className="onboard-heading"><div><span className="dash-eyebrow">{assistance ? 'Asistencia al comercio' : 'Configuración inicial'} · {data.contact.name || 'Tu negocio'}</span><h1>{assistance ? 'Ayudá a configurar este negocio.' : 'Empezá con todo en orden.'}</h1><p>{assistance ? 'Estás trabajando sobre el comercio seleccionado. Sus datos y su progreso son independientes de tu cuenta de dueño general.' : 'Un paso a la vez. Tu avance se guarda en este negocio, incluso si cerrás sesión.'}</p></div><button type="button" className="ghost-btn" disabled={busy} onClick={async () => { if (assistance || await save('pause')) onView('overview') }}>{assistance ? 'Volver al panel' : 'Seguir después'}</button></header>
    <div className="onboard-progress"><div><strong>{data.completed} de {data.total} pasos completos</strong><span>{percent}%</span></div><progress aria-label="Avance de puesta en marcha" value={data.completed} max={data.total} /></div>
    {error && <div className="onboard-error" role="alert"><span>{error}</span><button type="button" className="ghost-btn" disabled={busy} onClick={refresh}>Volver a comprobar</button></div>}
    <div className="onboard-layout">
      <nav className="onboard-steps" aria-label="Pasos de puesta en marcha"><ol>{STEPS.map((item, index) => {
        const complete = data.steps[index].complete
        return <li key={item.id}><button type="button" aria-current={current === item.id ? 'step' : undefined} disabled={busy} onClick={() => goStep(item.id)}><span className={`onboard-step-number${complete ? ' is-complete' : ''}`}>{complete ? <IconCheck /> : String(index + 1).padStart(2, '0')}</span><span><strong>{item.title}</strong><small>{complete ? 'Completo' : item.hint}</small></span></button></li>
      })}</ol><p>Los pasos se verifican con los datos guardados. No hace falta completarlos en orden.</p></nav>
      <article className="onboard-detail">
        <div className="onboard-step-heading"><span className="dash-eyebrow">Paso {String(stepIndex + 1).padStart(2, '0')} / 06{done ? ' · Completo' : ''}</span><h2 ref={title} tabIndex={-1}>{step.title}</h2><p>{step.description}</p></div>
        {current === 'business' && <BusinessStep key={current} data={data} busy={busy} onSave={save} onView={onView} />}
        {current === 'catalog' && <div className="onboard-task"><div className="onboard-task-count"><strong>{data.products}</strong><span>productos con precio de venta</span></div><div className="onboard-task-actions">{canView('products') && <button type="button" className="primary-btn" onClick={() => onView('products')}>Cargar productos</button>}{canView('product-import') && <button type="button" className="ghost-btn" onClick={() => onView('product-import')}>Importar JSON / CSV</button>}</div><p>Agregá fotos, una descripción clara y revisá los precios. La guía no carga productos de ejemplo en tu negocio.</p></div>}
        {current === 'stock' && <div className="onboard-task"><div className="onboard-task-count"><strong>{data.available}</strong><span>productos con precio y stock disponible</span></div><div className="onboard-task-actions">{canView('stock-adjustments') && <button type="button" className="primary-btn" onClick={() => onView('stock-adjustments')}>Cargar stock inicial</button>}{canView('stock-purchases') && <button type="button" className="ghost-btn" onClick={() => onView('stock-purchases')}>Registrar una compra</button>}</div><p>No necesitás inventar una compra: usá un ajuste de inventario para registrar las unidades que ya tenés.</p></div>}
        {current === 'payments' && <PaymentsStep data={data} busy={busy} onSave={save} onView={onView} />}
        {current === 'shipping' && <ShippingStep key={current} data={data} busy={busy} onSave={save} />}
        {current === 'review' && <ReviewStep data={data} busy={busy} onSave={save} onStep={goStep} onView={onView} canView={canView} />}
        <footer className="onboard-controls"><button type="button" className="ghost-btn" disabled={busy || stepIndex === 0} onClick={() => goStep(STEPS[stepIndex - 1].id)}><IconBack />Anterior</button><button type="button" className="ghost-btn" disabled={busy} onClick={refresh}><IconRefresh />Comprobar</button>{stepIndex < STEPS.length - 1 && <button type="button" className="ghost-btn" disabled={busy} onClick={() => goStep(STEPS[stepIndex + 1].id)}>{done ? 'Siguiente' : 'Ver siguiente paso'}<IconArrow /></button>}</footer>
      </article>
    </div>
    <p className="onboard-footnote">No se crean ventas ni se prueban pagos automáticamente. Podés retomar esta guía desde «{assistance ? 'Asistir a negocio' : 'Puesta en marcha'}» en el menú.</p>
  </section>
}
