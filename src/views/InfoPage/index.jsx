import { useSiteSettings, mergeSettings } from '@/lib/siteSettings'
import { formatARS } from '@/data/format'
import {
  IconCheck,
  IconMap,
  IconPhone,
  IconMail,
  IconClock,
  IconCart,
} from '@/components/Icons'

import './styles.css'

function maxInstallmentMonths(settings) {
  const steps =
    Array.isArray(settings.general.installments) && settings.general.installments.length
      ? settings.general.installments
      : [{ months: 12 }]
  return Math.max(...steps.map((s) => Number(s.months) || 1))
}

function methodsList(settings) {
  const m = settings.payments?.methods || {}
  const list = []
  if (m.tarjeta) list.push('Tarjeta de crédito y débito')
  if (m.transferencia) list.push('Transferencia bancaria')
  if (m.efectivo) list.push('Efectivo en el local')
  return list
}

function whatsappLink(number) {
  const digits = String(number || '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
}

const PAGES = {
  'como-comprar': {
    title: 'Cómo comprar',
    eyebrow: 'Tienda',
    cards: ['steps', 'payment', 'shipping', 'warranty', 'contact'],
  },
  'medios-de-pago': {
    title: 'Medios de pago',
    eyebrow: 'Pagos',
    cards: ['payment'],
  },
  envios: {
    title: 'Envíos y retiro',
    eyebrow: 'Tienda',
    cards: ['shipping'],
  },
  garantia: {
    title: 'Garantía',
    eyebrow: 'Tienda',
    cards: ['warranty', 'contact'],
  },
  devoluciones: {
    title: 'Devoluciones',
    eyebrow: 'Tienda',
    cards: ['returns', 'contact'],
  },
  contacto: {
    title: 'Contacto',
    eyebrow: 'Tienda',
    cards: ['contact'],
  },
}

const STEPS = [
  'Buscá en el catálogo el producto que quieras y agregalo al carrito.',
  'En el carrito podés aplicar un cupón de descuento si tenés uno.',
  'Tocá «Comprar», completá tus datos y pagá de forma segura. Te llega una confirmación apenas se acredita el pago.',
  'Recibí el pedido en tu domicilio o retiralo gratis en el local.',
]

export default function InfoPage({ slug, onNavigate }) {
  const settings = mergeSettings(useSiteSettings())
  const page = PAGES[slug] || { title: slug || 'Información', eyebrow: 'Tienda', cards: ['contact'] }
  const methods = methodsList(settings)
  const wa = whatsappLink(settings.store.whatsapp)
  const freeShip =
    settings.shipping.freeThreshold && Number(settings.shipping.freeThreshold) > 0
      ? ` gratis desde ${formatARS(settings.shipping.freeThreshold)}`
      : ''

  const card = (name) => {
    if (name === 'steps') {
      return (
        <section key={name} className="info-card info-steps-card">
          <h2>Pasos para comprar</h2>
          <ol className="info-steps">
            {STEPS.map((text, i) => (
              <li key={text}>
                <span className="info-step-num">{i + 1}</span>
                <p>{text}</p>
              </li>
            ))}
          </ol>
          <button
            type="button"
            className="primary-btn"
            onClick={() => onNavigate('home')}
          >
            <IconCart /> Ver el catálogo
          </button>
        </section>
      )
    }

    if (name === 'payment') {
      return (
        <section key={name} className="info-card">
          <h2>Medios de pago</h2>
          {methods.length ? (
            <ul className="info-list">
              {methods.map((m) => (
                <li key={m}>
                  <IconCheck />
                  {m}
                </li>
              ))}
            </ul>
          ) : (
            <p className="info-muted">Consultanos por los medios de pago disponibles.</p>
          )}
          <p className="info-note">
            Con tarjeta podés pagar hasta{' '}
            <strong>{maxInstallmentMonths(settings)} cuotas sin interés</strong>.
          </p>
        </section>
      )
    }

    if (name === 'shipping') {
      return (
        <section key={name} className="info-card">
          <h2>Envíos y retiro</h2>
          <ul className="info-list">
            <li>
              <IconCheck />
              {settings.shipping.label} por {formatARS(settings.shipping.cost)}
              {freeShip}.
            </li>
            <li>
              <IconCheck />
              Retiro gratis en el local ({settings.store.addressShort}).
            </li>
          </ul>
        </section>
      )
    }

    if (name === 'warranty') {
      return (
        <section key={name} className="info-card">
          <h2>Garantía</h2>
          <p>
            Todos los productos cuentan con{' '}
            <strong>garantía oficial del fabricante</strong>. Ante cualquier
            inconveniente, acercate al local o escribinos por WhatsApp y lo
            resolvemos con servicio técnico propio.
          </p>
        </section>
      )
    }

    if (name === 'returns') {
      return (
        <section key={name} className="info-card">
          <h2>Devoluciones</h2>
          <ul className="info-list">
            <li>
              <IconCheck />
              Tenés hasta 10 días desde la recepción para devolver el producto.
            </li>
            <li>
              <IconCheck />
              El producto debe estar en su caja original, sin uso y con los accesorios completos.
            </li>
            <li>
              <IconCheck />
              Escribinos por teléfono o WhatsApp antes de acercarte para agilizar el trámite.
            </li>
            <li>
              <IconCheck />
              El reintegro se hace por el mismo medio de pago en hasta 72 horas hábiles.
            </li>
          </ul>
        </section>
      )
    }

    if (name === 'contact') {
      return (
        <section key={name} className="info-card info-contact-card">
          <h2>¿Tenés dudas?</h2>
          <ul className="info-list info-contact">
            <li><IconMap /> {settings.store.addressFull}</li>
            <li><IconClock /> {settings.store.hours}</li>
            <li><IconPhone /> {settings.store.phone}</li>
            <li><IconMail /> {settings.store.email}</li>
          </ul>
          {wa && (
            <a className="primary-btn info-wa" href={wa} target="_blank" rel="noreferrer">
              Escribinos por WhatsApp
            </a>
          )}
        </section>
      )
    }

    return null
  }

  return (
    <main className="info-page">
      <div className="info-head section-head">
        <div>
          <span className="info-eyebrow">{page.eyebrow}</span>
          <h1 data-reveal="sweep">{page.title}</h1>
        </div>
      </div>

      <div className="info-cols" data-reveal="up">
        {page.cards.map(card).filter(Boolean)}
      </div>
    </main>
  )
}