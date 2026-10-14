import { useLayoutEffect, useRef, useState } from 'react'
import { IconArrow, IconCheck } from '@/components/Icons'
import './styles.css'

import { tabs } from './data.js'
import { setupTabIndicator } from './motion.js'

export default function ProductPreview() {
  const [selected, setSelected] = useState(0)
  const tabRefs = useRef([])
  const tabList = useRef(null)
  useLayoutEffect(() => setupTabIndicator(tabList.current, tabRefs.current[selected]), [selected])
  const onKey = (event, index) => {
    let next
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
    if (event.key === 'Home') next = 0
    if (event.key === 'End') next = tabs.length - 1
    if (next === undefined) return
    event.preventDefault()
    setSelected(next)
    tabRefs.current[next]?.focus()
  }
  return <section id="producto" className="bnp-preview bnp-wrap bnp-section" aria-labelledby="bnp-product-title">
    <div className="bnp-section-intro"><span className="bnp-eyebrow">UNA PLATAFORMA. DOS LADOS DE TU NEGOCIO.</span><h2 id="bnp-product-title">Lo que tus clientes ven.<br />Lo que vos controlás.</h2><p>Una tienda para vender y un panel para trabajar. Conocé cómo se conectan.</p></div>
    <div className="bnp-preview-tabs" ref={tabList} role="tablist" aria-label="Vistas de la plataforma">{tabs.map((tab, i) => <button key={tab.id} ref={(node) => { tabRefs.current[i] = node }} type="button" role="tab" id={`bnp-tab-${tab.id}`} aria-selected={selected === i} aria-controls={`bnp-panel-${tab.id}`} tabIndex={selected === i ? 0 : -1} onClick={() => setSelected(i)} onKeyDown={(event) => onKey(event, i)}>{tab.label}</button>)}</div>
    {tabs.map((active, index) => <div key={active.id} hidden={selected !== index} className="bnp-preview-panel" role="tabpanel" id={`bnp-panel-${active.id}`} aria-labelledby={`bnp-tab-${active.id}`} tabIndex={0}>
      <div className="bnp-preview-visual"><div className="bnp-preview-browser"><span aria-hidden="true"><i /><i /><i /></span><small>Captura de interfaz real · datos de demostración local</small></div><div className="bnp-screenshot-scroll" role="region" tabIndex={0} aria-label={`${active.alt}. Usá el desplazamiento para recorrer la captura completa.`}><figure className="bnp-real-screenshot"><img src={active.image} alt={active.alt} loading={index === 0 ? 'eager' : 'lazy'} /><figcaption>Interfaz real de Tienda BNP · datos de demostración local</figcaption></figure><span className="bnp-screenshot-scroll-hint" aria-hidden="true">Desplazá para ver la captura completa</span></div></div>
      <div className="bnp-preview-copy"><span className="bnp-eyebrow">{active.eyebrow}</span><h3>{active.title}</h3><p>{active.text}</p><ul>{active.bullets.map((bullet) => <li key={bullet}><IconCheck />{bullet}</li>)}</ul><a className="bnp-text-link" href="#planes">Ver qué incluye cada plan <IconArrow /></a></div>
    </div>)}
  </section>
}
