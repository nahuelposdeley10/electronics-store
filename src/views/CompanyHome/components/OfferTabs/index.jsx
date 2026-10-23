import { useEffect, useState, useSyncExternalStore } from 'react'
import OfferSwitcher from '../OfferSwitcher'
import Pricing from '../Pricing'
import WhatsAppBot from '../WhatsAppBot'
import './styles.css'

const validTabs = new Set(['planes', 'bot'])
const subscribeHydration = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

function initialTab() {
  if (typeof window === 'undefined') return 'planes'
  const hash = window.location.hash.slice(1)
  return validTabs.has(hash) ? hash : 'planes'
}

export default function OfferTabs() {
  const [selectedTab, setActiveTab] = useState(initialTab)
  // The prerender contains plans; match it before revealing a direct #bot link.
  const hydrated = useSyncExternalStore(subscribeHydration, clientSnapshot, serverSnapshot)
  const activeTab = hydrated ? selectedTab : 'planes'

  useEffect(() => {
    let frame = 0
    const selectFromHash = () => {
      const hash = window.location.hash.slice(1)
      if (!validTabs.has(hash)) return
      setActiveTab(hash)
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' }))
    }
    window.addEventListener('hashchange', selectFromHash)
    return () => {
      window.removeEventListener('hashchange', selectFromHash)
      window.cancelAnimationFrame(frame)
    }
  }, [])

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (!hydrated || !validTabs.has(hash)) return undefined
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'instant', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [hydrated])

  const selectTab = (tab) => {
    if (!validTabs.has(tab)) return
    setActiveTab(tab)
    window.history.pushState({}, '', `#${tab}`)
  }

  return <section className="bnp-offer-tabs" aria-label="Planes y automatización">
    <div className="bnp-wrap bnp-offer-tabs-menu">
      <OfferSwitcher active={activeTab} onSelect={selectTab} />
    </div>
    <div className="bnp-offer-tabs-panel" id="offer-panel" role="tabpanel" aria-labelledby={`offer-tab-${activeTab}`} aria-label={activeTab === 'planes' ? 'Planes de tienda' : 'Bot por WhatsApp'}>
      {activeTab === 'planes' ? <Pricing /> : <WhatsAppBot />}
    </div>
  </section>
}
