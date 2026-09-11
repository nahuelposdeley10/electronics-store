import { useState } from 'react'
import { useCart } from '../context/useCart'
import {
  IconBolt,
  IconSearch,
  IconCart,
  IconCard,
  IconTruck,
  IconShield,
  IconWrench,
  IconPickup,
} from './Icons'

const announcementItems = [
  'Envíos a todo el país',
  'Hasta 12 cuotas sin interés',
  'Garantía oficial',
  'Servicio técnico propio',
  'Retiro en Villa Urquiza, CABA',
]

const counters = [
  { icon: IconCard, title: 'Cuotas', text: 'hasta 12 sin interés' },
  { icon: IconTruck, title: 'Envío', text: 'gratis + $300.000' },
  { icon: IconShield, title: 'Garantía', text: 'oficial de fábrica' },
  { icon: IconWrench, title: 'Técnico', text: 'servicio propio' },
  { icon: IconPickup, title: 'Retiro', text: 'Villa Urquiza, CABA' },
]

export default function Header({ onNavigate, view, onSearch }) {
  const { totalItems } = useCart()
  const [query, setQuery] = useState('')

  const handleSearch = (e) => {
    e.preventDefault()
    onSearch(query)
  }

  return (
    <>
      <div className="marquee" role="marquee">
        <div className="marquee-track">
          {[...announcementItems, ...announcementItems].map((item, i) => (
            <span key={i} className="marquee-item">
              <IconBolt className="marquee-bolt" />
              {item}
            </span>
          ))}
        </div>
      </div>

      <header className="store-header">
        <div className="fascia">
          <button
            type="button"
            className="brand"
            onClick={() => onNavigate('home')}
            aria-label="TechStore — ir al inicio"
          >
            <span className="brand-chip">
              <IconBolt />
            </span>
            <span className="brand-word">
              Tech<span className="brand-accent">Store</span>
            </span>
            <span className="brand-sub">galería de tecnología</span>
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
              {totalItems > 0 && <span className="cart-punch">{totalItems}</span>}
            </button>
          </div>
        </div>

        <div className="counter-strip" aria-label="Servicios de TechStore">
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