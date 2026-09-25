import { useState } from 'react'
import { IconCookie } from '@/components/Icons'

import './styles.css'

const STORAGE_KEY = 'ts-cookie-consent'

function getStoredConsent() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

export default function CookieConsent({ onNavigate }) {
  const [consent, setConsent] = useState(() => getStoredConsent())

  if (consent !== null) return null

  const choose = (value) => {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // sin almacenamiento igual ocultamos el aviso en esta sesión
    }
    setConsent(value)
  }

  return (
    <div className="cookie-consent" role="region" aria-label="Aviso de cookies">
      <span className="cookie-consent-icon">
        <IconCookie />
      </span>
      <div className="cookie-consent-body">
        <strong>Usamos cookies</strong>
        <p>
          Algunas son necesarias para que el carrito y la compra funcionen. Por ahora no usamos
          cookies de seguimiento ni publicidad. Podés aceptar todas o solo las esenciales, y ver
          los detalles en la política de cookies.
        </p>
      </div>
      <div className="cookie-consent-actions">
        <button
          type="button"
          className="cookie-consent-link"
          onClick={() => onNavigate('info', 'politica-de-cookies')}
        >
          Política de cookies
        </button>
        <button type="button" className="cookie-consent-btn" onClick={() => choose('essential')}>
          Solo esenciales
        </button>
        <button
          type="button"
          className="cookie-consent-btn cookie-consent-accept"
          onClick={() => choose('all')}
        >
          Aceptar todo
        </button>
      </div>
    </div>
  )
}