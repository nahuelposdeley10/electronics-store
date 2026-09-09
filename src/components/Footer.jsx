import {
  IconBolt,
  IconMap,
  IconPhone,
  IconMail,
  IconClock,
} from './Icons'

export default function Footer({ onNavigate }) {
  return (
    <footer className="site-footer">
      <div className="footer-band">TechStore — Abierto lun a vie 9–19 · Sáb 9–13</div>
      <div className="footer-grid">
        <div className="footer-col footer-about">
          <span className="footer-brand">
            <IconBolt />
            Tech<span className="footer-accent">Store</span>
          </span>
          <p>
            La galería de tecnología del barrio, ahora online. Precio de
            mostrador, hasta 12 cuotas sin interés y servicio técnico propio.
          </p>
        </div>

        <div className="footer-col">
          <h3>Compra</h3>
          <ul>
            <li><button type="button" onClick={() => onNavigate('home')}>Catálogo</button></li>
            <li><button type="button" onClick={() => onNavigate('cart')}>Carrito</button></li>
            <li><button type="button">Cómo comprar</button></li>
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
            <li><IconMap /> Av. Triunvirato 4600, Villa Urquiza, CABA</li>
            <li><IconPhone /> +54 11 5555-4294</li>
            <li><IconMail /> ventas@techstore.com.ar</li>
            <li><IconClock /> Lun a Vie 9–19h · Sáb 9–13h</li>
          </ul>
          <div className="footer-map">
            <iframe
              title="Ubicación TechStore"
              src="https://www.google.com/maps?q=Av.+Triunvirato+4600,+Villa+Urquiza,+Buenos+Aires&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <p>© 2026 TechStore. Todos los derechos reservados.</p>
      </div>
    </footer>
  )
}