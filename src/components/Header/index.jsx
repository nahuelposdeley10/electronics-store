import { useEffect, useState } from 'react'
import { useCart } from '@/context/useCart'
import { useSiteSettings, mergeSettings } from '@/lib/siteSettings'
import {
  IconBolt,
  IconSearch,
  IconCart,
  IconBox,
  IconCard,
  IconCash,
  IconLock,
  IconMap,
  IconPhone,
  IconPickup,
  IconShield,
  IconTruck,
  IconWrench,
} from '@/components/Icons'
import {
  DEFAULT_HEADER_COUNTERS,
  normalizeHeaderCounters,
} from '@/lib/siteSettings.js'

import './styles.css'

export default function Header({ onNavigate, view, onSearch }) {
  const { totalItems } = useCart()
  const [query, setQuery] = useState('')
  const settings = mergeSettings(useSiteSettings())

  useEffect(() => {
    if (!settings.store.logoUrl) return undefined
    const link = document.querySelector('link[rel="icon"]')
    if (link) link.href = settings.store.logoUrl
    return undefined
  }, [settings.store.logoUrl])

  const marqueeItems =
    Array.isArray(settings.general.marquee) && settings.general.marquee.length
      ? settings.general.marquee
      : null

  const steps =
    Array.isArray(settings.general.installments) && settings.general.installments.length
      ? settings.general.installments.map((s) => Number(s.months) || 1)
      : [12]
  const maxMonths = Math.max(...steps)

  const counterFallback = DEFAULT_HEADER_COUNTERS.map((counter) => (
    counter.title === 'Cuotas' ? { ...counter, text: `hasta ${maxMonths} sin interés` } : counter
  ))
  const counterIcons = {
    card: IconCard,
    truck: IconTruck,
    shield: IconShield,
    pickup: IconPickup,
    wrench: IconWrench,
    box: IconBox,
    map: IconMap,
    phone: IconPhone,
    lock: IconLock,
    cash: IconCash,
  }
  const counters = normalizeHeaderCounters(settings.general.headerCounters).map((counter, index) => ({
    ...counter,
    icon: counterIcons[counter.icon] || counterIcons[counterFallback[index]?.icon] || IconBox,
  }))

  const handleSearch = (e) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <>
      {settings.appearance.showMarquee && marqueeItems && (
        <div className="marquee" aria-label="Beneficios de la tienda">
          <div className="marquee-track">
            {[...marqueeItems, ...marqueeItems, ...marqueeItems, ...marqueeItems].map(
              (item, i) => (
                <span
                  key={i}
                  className="marquee-item"
                  aria-hidden={i >= marqueeItems.length}
                >
                  <IconBolt className="marquee-bolt" />
                {item}
              </span>
            ))}
          </div>
        </div>
      )}

      <header className="store-header">
        <div className="fascia">
          <button
            type="button"
            className="brand"
            onClick={() => onNavigate('home')}
            aria-label={`${settings.store.name} — ir al inicio`}
          >
            <span className="brand-chip">
              {settings.store.logoUrl ? (
                <img className="brand-logo" src={settings.store.logoUrl} alt="" />
              ) : (
                <IconBolt />
              )}
            </span>
            <span className="brand-word">
              {settings.store.name === 'TechStore' ? (
                <>
                  Tech<span className="brand-accent">Store</span>
                </>
              ) : (
                settings.store.name
              )}
            </span>
            <span className="brand-sub">{settings.store.tagline}</span>
          </button>

          <form className="search-bar" onSubmit={handleSearch} role="search">
            <input
              type="text"
              placeholder="Buscá producto, marca o categoría…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Buscar productos"
            />
            <button type="submit" aria-label="Buscar">
              <IconSearch />
            </button>
          </form>

          <div className="header-actions">
            <button type="button" className="nav-link" onClick={() => onNavigate('home')}>
              Inicio
            </button>
            <button
              type="button"
              className="nav-link cart-link"
              onClick={() => onNavigate(view === 'cart' ? 'home' : 'cart')}
            >
              <IconCart />
              <span className="cart-label">Carrito</span>
              {totalItems > 0 && (
                <span className="cart-punch" key={totalItems}>
                  {totalItems}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="counter-strip" aria-label={`Servicios de ${settings.store.name}`}>
          {counters.map(({ icon: Icon, title, text }) => (
            <div key={title} className="counter-tab">
              <Icon className="counter-icon" />
              <span className="counter-titles">
                <strong>{title}</strong>
                <em>{text}</em>
              </span>
            </div>
          ))}
        </div>
      </header>
    </>
  )
}
