import { useEffect, useRef } from 'react'
import { applySEO } from '@/lib/seo'
import Navigation from './components/Navigation'
import InteractiveHero from './components/InteractiveHero'
import ProductPreview from './components/ProductPreview'
import Features from './components/Features'
import Payments from './components/Payments'
import GettingStarted from './components/GettingStarted'
import Pricing from './components/Pricing'
import Faq from './components/Faq'
import Closing from './components/Closing'
import { companyMeta } from './content.js'
import { setupCompanyMotion } from './motion.js'
import './styles.css'

export default function CompanyHome({ legacyPlans = false }) {
  const root = useRef(null)
  useEffect(() => setupCompanyMotion(root.current), [])
  useEffect(() => {
    applySEO({ ...companyMeta,
      canonical: new URL('/home', window.location.origin).href,
      image: new URL('/images/company/storefront-social.jpg', window.location.origin).href,
    })
    if (legacyPlans) window.history.replaceState({}, '', '/home#planes')
    const target = document.getElementById(window.location.hash.slice(1))
    if (target) target.scrollIntoView({ behavior: 'instant' })
  }, [legacyPlans])
  return (
    <div className="bnp-home" ref={root}>
      <a className="bnp-skip" href="#contenido">Saltar al contenido</a>
      <Navigation />
      <main id="contenido" tabIndex={-1}>
        <InteractiveHero />
        <ProductPreview />
        <Features />
        <Payments />
        <GettingStarted />
        <Pricing />
        <Faq />
        <Closing />
      </main>
      <footer className="bnp-footer bnp-wrap">
        <a className="bnp-brand" href="/home" aria-label="Tienda BNP, inicio">tienda<span>bnp.</span></a>
        <p>Software para comercios.<br />Hecho para tu día a día.</p>
        <nav aria-label="Enlaces del pie"><a href="#planes">Planes</a><a href="/admin">Acceso al panel</a></nav>
        <small>© {new Date().getFullYear()} Tienda BNP · Argentina</small>
      </footer>
    </div>
  )
}
