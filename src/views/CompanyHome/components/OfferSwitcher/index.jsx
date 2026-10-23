import { useLayoutEffect, useRef } from 'react'
import { setupTabIndicator } from '../ProductPreview/motion.js'
import './styles.css'

const options = [
  { id: 'planes', label: 'Planes de tienda' },
  { id: 'bot', label: 'Bot por WhatsApp' },
]

export default function OfferSwitcher({ active = 'planes', onSelect }) {
  const tabRefs = useRef([])
  const activeIndex = Math.max(0, options.findIndex((option) => option.id === active))
  useLayoutEffect(() => setupTabIndicator(tabRefs.current[activeIndex]?.parentElement, tabRefs.current[activeIndex]), [activeIndex])
  const onKey = (event, index) => {
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % options.length
    if (event.key === 'ArrowLeft') next = (index + options.length - 1) % options.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = options.length - 1
    if (next === undefined) return
    event.preventDefault()
    onSelect?.(options[next].id)
    tabRefs.current[next]?.focus()
  }
  return <div className="bnp-offer-switcher" role="tablist" aria-label="Planes y bot por WhatsApp">{options.map((option, index) => <button className="bnp-offer-switcher-option" id={`offer-tab-${option.id}`} key={option.id} ref={(node) => { tabRefs.current[index] = node }} type="button" role="tab" aria-selected={active === option.id} aria-controls="offer-panel" tabIndex={active === option.id ? 0 : -1} onClick={() => onSelect?.(option.id)} onKeyDown={(event) => onKey(event, index)}>{option.label}</button>)}</div>
}
