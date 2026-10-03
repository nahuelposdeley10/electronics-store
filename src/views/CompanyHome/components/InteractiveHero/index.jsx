import { useEffect, useRef } from 'react'
import { IconArrow, IconCheck, IconPickup } from '@/components/Icons'
import { setupHeroDepth } from './motion.js'
import './styles.css'

export default function InteractiveHero() {
  const scene = useRef(null)
  const art = useRef(null)
  useEffect(() => setupHeroDepth(scene.current, art.current), [])
  return (
    <section className="bnp-hero bnp-wrap" aria-labelledby="bnp-title">
      <div className="bnp-hero-copy">
        <span className="bnp-eyebrow"><span className="bnp-hero-dot" /> TU NEGOCIO, EN SU PRÓXIMA ETAPA</span>
        <h1 id="bnp-title"><span className="bnp-title-line"><span>Tu tienda online.</span></span><span className="bnp-title-line bnp-title-accent"><span>Tu negocio</span></span><span className="bnp-title-line bnp-title-accent"><span>bajo control.</span></span></h1>
        <p>De la vidriera al celular. Vendé online y conectá tu catálogo, las ventas de tu local y la gestión de cada día.</p>
        <div className="bnp-hero-actions"><a className="bnp-button bnp-button-blue" href="#planes">Quiero probarlo <IconArrow /></a><a className="bnp-text-link" href="#producto">Conocé la plataforma <IconArrow /></a></div>
        <div className="bnp-hero-note"><IconCheck /><span>Tu marca. Tu catálogo. Tu propia forma de vender.</span></div>
      </div>
      <div className="bnp-hero-scene" ref={scene}>
        <div className="bnp-hero-atmosphere" aria-hidden="true"><div className="bnp-hero-grid" /><div className="bnp-hero-light" /></div>
        <div className="bnp-hero-orbit" aria-hidden="true" />
        <span className="bnp-hero-caption">TU LOCAL, TAMBIÉN ONLINE</span>
        <div className="bnp-hero-art" ref={art}>
          <img src="/images/company/storefront-960.webp" srcSet="/images/company/storefront-480.webp 480w, /images/company/storefront-960.webp 960w, /images/company/storefront-1280.webp 1280w" sizes="(max-width: 760px) 94vw, 52vw" width="1280" height="1280" alt="Ilustración 3D de una vidriera azul y un celular con un catálogo de productos" fetchPriority="high" />
        </div>
        <div className="bnp-hero-label"><span><IconPickup /></span><div><strong>Una tienda con tu identidad</strong><small>Conectada a tu día a día</small></div></div>
        <span className="bnp-hero-scene-note">Ilustración de la plataforma</span>
      </div>
      <div className="bnp-hero-bottom"><span>Del primer pedido<br /><strong>al cierre de caja.</strong></span><p>TIENDA ONLINE</p><p>VENTAS Y CAJA</p><p>STOCK Y COMPRAS</p><p>REPORTES Y EQUIPO</p></div>
    </section>
  )
}
