import { useState } from 'react'
import { useSiteSettings, mergeSettings } from '../lib/siteSettings'
import { isMotionForced, setMotionForced } from '../lib/motion'
import {
  IconBolt,
  IconMap,
  IconPhone,
  IconMail,
  IconClock,
} from './Icons'

function maxInstallmentMonths(settings) {
  const steps =
    Array.isArray(settings.general.installments) && settings.general.installments.length
      ? settings.general.installments
      : [{ months: 12 }]
  return Math.max(...steps.map((s) => Number(s.months) || 1))
}

export default function Footer({ onNavigate }) {
  const settings = mergeSettings(useSiteSettings())
  const year = new Date().getFullYear()
  const [motionOn, setMotionOn] = useState(() => isMotionForced())

  const toggleMotion = () => {
    const next = !motionOn
    setMotionForced(next)
    setMotionOn(next)
  }

  return (
    <footer className="site-footer">
      <div className="footer-band">{settings.store.band}</div>
      <div className="footer-grid">
        <div className="footer-col footer-about">
          <span className="footer-brand">
            {settings.store.logoUrl ? (
              <img className="footer-logo" src={settings.store.logoUrl} alt="" />
            ) : (
              <IconBolt />
            )}
            {settings.store.name === 'TechStore' ? (
              <>
                Tech<span className="footer-accent">Store</span>
              </>
            ) : (
              settings.store.name
            )}
          </span>
          <p>
            {settings.store.tagline}. Precio de mostrador, hasta {maxInstallmentMonths(settings)} cuotas sin
            interés y servicio técnico propio.
          </p>
        </div>

        <div className="footer-col">
          <h3>Compra</h3>
          <ul>
            <li><button type="button" onClick={() => onNavigate('home')}>Catálogo</button></li>
            <li><button type="button" onClick={() => onNavigate('cart')}>Carrito</button></li>
            <li><button type="button" onClick={() => onNavigate('info', 'como-comprar')}>Cómo comprar</button></li>
            <li><button type="button">Formas de pago</button></li>
          </ul>
        </div>

        <div className="footer-col">
          <h3>Ayuda</h3>
          <ul>
            <li><button type="button">Envíos</button></li>
            <li><button type="button">Garantía</button></li>
            <li><button type="button">Devoluciones</button></li>
            <li><button type="button">Contacto</button></li>
          </ul>
        </div>

        <div className="footer-col footer-contact">
          <h3>El local</h3>
          <ul>
            <li><IconMap /> {settings.store.addressFull}</li>
            <li><IconPhone /> {settings.store.phone}</li>
            <li><IconMail /> {settings.store.email}</li>
            <li><IconClock /> {settings.store.hours}</li>
          </ul>
          <div className="footer-map">
            <iframe
              title={`Ubicación ${settings.store.name}`}
              src={`https://www.google.com/maps?q=${encodeURIComponent(settings.store.addressFull)}&output=embed`}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© {year} {settings.store.name}. Todos los derechos reservados.</p>
        <div className="footer-bottom-actions">
          <button
            type="button"
            className={`footer-motion-toggle${motionOn ? ' on' : ''}`}
            onClick={toggleMotion}
            aria-pressed={motionOn}
            title="Activar o desactivar las animaciones de la tienda"
          >
            ⚡ Movimiento {motionOn ? 'ON' : 'OFF'}
          </button>
          <button type="button" className="footer-panel-link" onClick={() => onNavigate('dashboard')}>
            Panel de ventas
          </button>
        </div>
      </div>
    </footer>
  )
}