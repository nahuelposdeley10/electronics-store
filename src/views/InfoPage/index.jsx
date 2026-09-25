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
  'politica-de-privacidad': {
    title: 'Política de privacidad',
    eyebrow: 'Legal',
    cards: ['legal'],
    wide: true,
  },
  'terminos-y-condiciones': {
    title: 'Términos y condiciones',
    eyebrow: 'Legal',
    cards: ['legal'],
    wide: true,
  },
  'politica-de-cookies': {
    title: 'Política de cookies',
    eyebrow: 'Legal',
    cards: ['legal'],
    wide: true,
  },
  'politica-de-reembolsos': {
    title: 'Política de reembolsos',
    eyebrow: 'Legal',
    cards: ['legal'],
    wide: true,
  },
}

const LEGAL = {
  'politica-de-privacidad': {
    updated: 'Septiembre de 2026',
    intro:
      'En esta política te contamos qué datos personales tratamos cuando comprás en la tienda online o visitás el local, para qué los usamos y qué derechos tenés.',
    sections: [
      {
        h: 'Datos que recopilamos',
        p: 'Al realizar una compra o consulta nos dejás: nombre y apellido, correo electrónico, teléfono, domicilio de entrega y los datos propios de la operación (productos, montos y medio de pago). No solicitamos datos sensibles.',
      },
      {
        h: 'Cómo usamos tus datos',
        list: [
          'Procesar tu pedido: confirmación, pago, envío o retiro en el local.',
          'Emitir la factura correspondiente.',
          'Responder consultas y gestionar garantías o devoluciones.',
          'Cumplir obligaciones legales, fiscales y contables.',
          'Contactarte únicamente en relación con tu compra.',
        ],
      },
      {
        h: 'Base legal y destino de los datos',
        p: 'Tratamos tus datos con tu consentimiento al completar la compra y conforme a la Ley 25.326 de Protección de Datos Personales. No vendemos, alquilamos ni cedemos tus datos a terceros con fines de marketing.',
      },
      {
        h: 'Tus derechos (ARCO)',
        p: 'Podés ejercer el acceso, rectificación, actualización y supresión de tus datos personales, así como solicitar información sobre su tratamiento. Para hacerlo, escribinos a los contactos de la página de Contacto y te respondemos dentro de los plazos que establece la ley.',
      },
      {
        h: 'Conservación y seguridad',
        p: 'Conservamos tus datos mientras sea necesario para tu relación comercial con nosotros y para el cumplimiento de obligaciones legales. Los accesos están restringidos y las transferencias se realizan por canales cifrados. El pago se procesa a través de Mercado Pago; nunca vemos ni guardamos el número de tu tarjeta.',
      },
      {
        h: 'Cambios en esta política',
        p: 'Si modificamos esta política, actualizamos esta página y la fecha indicada al final. Te recomendamos revisarla periódicamente.',
      },
    ],
  },
  'terminos-y-condiciones': {
    updated: 'Septiembre de 2026',
    intro:
      'Estos términos regulan la compra de productos en esta tienda online y en el local. Al realizar una compra aceptás las condiciones detalladas a continuación.',
    sections: [
      {
        h: 'Proceso de compra',
        p: 'Agregás los productos al carrito, completás tus datos y elegís el medio de pago. La venta queda confirmada cuando se acredita el pago; en ese momento te llega la confirmación con los detalles del pedido.',
      },
      {
        h: 'Precios y disponibilidad',
        p: 'Los precios se expresan en pesos argentinos e incluyen los impuestos correspondientes. Pueden modificarse sin previo aviso y no se aplican retroactivamente a compras ya confirmadas. La oferta está sujeta a la disponibilidad de stock.',
      },
      {
        h: 'Envío y retiro',
        p: 'Podés recibir el pedido en tu domicilio o retirarlo gratis en el local, según las condiciones vigentes de envío (ver página Envíos y retiro).',
      },
      {
        h: 'Garantía',
        p: 'Los productos cuentan con garantía oficial del fabricante. Ante cualquier inconveniente, acercate al local o escribinos por WhatsApp (ver página Garantía).',
      },
      {
        h: 'Reembolsos y arrepentimiento',
        p: 'Disponés de 10 días corridos desde la recepción del producto para ejercer el derecho de arrepentimiento conforme a la Ley 24.240 de Defensa del Consumidor (ver página Política de reembolsos).',
      },
      {
        h: 'Responsabilidad',
        p: 'Los productos deben usarse según las indicaciones del fabricante. Respondemos por vicios redhibitorios y por los defectos de los productos conforme a la normativa vigente.',
      },
      {
        h: 'Ley aplicable',
        p: 'Estos términos se rigen por la normativa argentina de defensa del consumidor (Ley 24.240), de protección de datos personales (Ley 25.326) y demás normas aplicables. Ante cualquier conflicto, quedan sometidos a los tribunales ordinarios de la localidad.',
      },
    ],
  },
  'politica-de-cookies': {
    updated: 'Septiembre de 2026',
    intro:
      'Te explicamos qué cookies y almacenamientos locales usa este sitio, para qué sirven y cómo podés gestionarlos.',
    sections: [
      {
        h: '¿Qué son las cookies?',
        p: 'Las cookies son pequeños archivos que el navegador guarda en tu dispositivo y que permiten recordar información entre visitas. Este sitio también usa almacenamiento local (localStorage) del navegador para el mismo propósito.',
      },
      {
        h: 'Cookies y almacenamientos que usamos',
        list: [
          'Carrito de compras (localStorage): guarda los productos que agregaste',
          'Cupón aplicado (localStorage): recuerda el cupón de descuento que usás.',
          'Preferencias (localStorage): por ejemplo, tu elección de consentimiento de cookies y de animaciones.',
          'Mercado Pago: al pagar, el entorno de pago de Mercado Pago usa sus propias cookies.',
          'Google Maps: el mapa del local que se muestra en el pie de página usa cookies de Google.',
          'Google Fonts: la carga de tipografías puede implicar solicitudes a Google.',
        ],
      },
      {
        h: 'No usamos seguimiento ni publicidad',
        p: 'Por el momento este sitio no instala cookies de analítica ni de publicidad: no compartimos datos tuyos con redes de anuncios ni medimos tu navegación con servicios de terceros.',
      },
      {
        h: 'Cómo gestionarlas',
        p: 'Podés borrar o bloquear cookies desde la configuración de tu navegador. Tené en cuenta que si desactivás el almacenamiento del carrito, algunas funciones de compra pueden dejar de funcionar correctamente.',
      },
      {
        h: 'Tu consentimiento',
        p: 'Al visitar el sitio te mostramos un aviso para que elijas si aceptás todas las cookies o solo las esenciales. Podés cambiar tu decisión en cualquier momento borrando la preferencia guardada (ts-cookie-consent) o las cookies del sitio desde el navegador.',
      },
    ],
  },
  'politica-de-reembolsos': {
    updated: 'Septiembre de 2026',
    intro:
      'Queremos que compres con confianza. Te contamos cómo funciona el derecho de arrepentimiento y el proceso de reembolso.',
    sections: [
      {
        h: 'Derecho de arrepentimiento',
        p: 'Como consumidor, tenés 10 días corridos desde la recepción del producto para arrepentirte de la compra realizada online, conforme al artículo 34 de la Ley 24.240 de Defensa del Consumidor.',
      },
      {
        h: 'Requisitos para la devolución',
        list: [
          'El producto debe estar en su caja original, sin uso y con los accesorios completos.',
          'Escribinos por teléfono o WhatsApp antes de acercarte o coordinar la devolución.',
          'El reintegro se hace por el mismo medio de pago utilizado.',
        ],
      },
      {
        h: 'Plazos del reembolso',
        p: 'Procesamos el reembolso en hasta 72 horas hábiles desde que recibimos el producto. Si pagaste con tarjeta, la acreditación final depende de los plazos de tu emisor.',
      },
      {
        h: 'Productos con falla o defecto',
        p: 'Si el producto llega con una falla, se aplica la garantía oficial del fabricante y los servicios técnico propios del local. No se trata como un arrepentimiento: te ayudamos a repararlo o reemplazarlo según corresponda (ver página Garantía).',
      },
      {
        h: 'Costos',
        p: 'El arrepentimiento dentro de los 10 días y el reembolso correspondiente no tienen costo para vos.',
      },
    ],
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
  const shippingEnabled = settings.shipping.enabled !== false
  const freeShip =
    shippingEnabled && settings.shipping.freeThreshold && Number(settings.shipping.freeThreshold) > 0
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
            {shippingEnabled ? (
              <li>
                <IconCheck />
                {settings.shipping.label} por {formatARS(settings.shipping.cost)}
                {freeShip}.
              </li>
            ) : (
              <li>
                <IconCheck />No se realiza envío a domicilio.
              </li>
            )}
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

    if (name === 'legal') {
      const legal = LEGAL[slug] || { sections: [] }
      return (
        <section key={name} className="info-card info-legal-card">
          {legal.intro && <p className="info-legal-intro">{legal.intro}</p>}
          {legal.sections.map((s) => (
            <div key={s.h} className="info-legal-section">
              <h3>{s.h}</h3>
              {s.p && <p>{s.p}</p>}
              {Array.isArray(s.list) && s.list.length > 0 && (
                <ul className="info-list">
                  {s.list.map((li) => (
                    <li key={li}>
                      <IconCheck />
                      {li}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {legal.updated && (
            <p className="info-muted info-legal-note">Última actualización: {legal.updated}</p>
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

      <div className={page.wide ? 'info-prose' : 'info-cols'} data-reveal="up">
        {page.cards.map(card).filter(Boolean)}
      </div>
    </main>
  )
}