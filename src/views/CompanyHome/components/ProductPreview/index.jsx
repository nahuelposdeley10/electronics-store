import { useLayoutEffect, useRef, useState } from 'react'
import { IconArrow, IconBox, IconCard, IconChart, IconCheck, IconInventory, IconSearch, IconCart } from '@/components/Icons'
import './styles.css'

import { tabs } from './data.js'
import { setupTabIndicator } from './motion.js'

function ProductDrawing({ lamp = false }) {
  return <svg className="bnp-sample-drawing" viewBox="0 0 120 110" fill="none" aria-hidden="true">{lamp ? <><path d="M60 60v35M42 97h36" stroke="#14243E" strokeWidth="6" strokeLinecap="round" /><path d="M32 61h56L76 18H45L32 61Z" fill="#B4C7FD" /><path d="M45 18h31" stroke="#315CF5" strokeWidth="4" /></> : <><path d="M28 63V48a32 32 0 0 1 64 0v15" stroke="#315CF5" strokeWidth="10" /><rect x="21" y="52" width="22" height="39" rx="10" fill="#14243E" /><rect x="78" y="52" width="22" height="39" rx="10" fill="#14243E" /><path d="M40 57v28M81 57v28" stroke="#A7BEFC" strokeWidth="6" strokeLinecap="round" /></>}</svg>
}

function StoreExample() {
  return <div className="bnp-sample-store">
    <div className="bnp-sample-store-nav"><strong>casa<span>norte.</span></strong><div><IconSearch /><IconCart /></div></div>
    <div className="bnp-sample-store-banner"><span>OBJETOS PARA TU DÍA A DÍA</span><strong>Pequeños detalles.<br />Tu espacio, más tuyo.</strong><span className="bnp-sample-pill">Colección de ejemplo</span></div>
    <div className="bnp-sample-products">{[['Auriculares inalámbricos', '$45.000'], ['Lámpara de escritorio', '$32.000']].map(([name, price], i) => <div key={name}><div className="bnp-sample-product-art"><ProductDrawing lamp={i === 1} /></div><span>{name}</span><strong>{price}</strong></div>)}</div>
  </div>
}

function AdminExample({ inventory }) {
  return <div className="bnp-sample-admin">
    <aside aria-hidden="true"><span>cn.</span><IconChart /><IconCard /><IconInventory /><IconBox /></aside>
    <div className="bnp-sample-admin-main"><div className="bnp-sample-admin-title"><strong>{inventory ? 'Inventario' : 'Ventas y caja'}</strong><span>Casa Norte</span></div>
      <div className="bnp-sample-kpis"><div><small>{inventory ? 'Unidades en stock' : 'Ventas del día'}</small><strong>{inventory ? '148' : '$128.000'}</strong></div><div><small>{inventory ? 'Productos a reponer' : 'Estado de caja'}</small><strong>{inventory ? '2' : 'Abierta'}</strong></div></div>
      {inventory ? <><div className="bnp-sample-table"><div><strong>Producto</strong><strong>Stock</strong><strong>Estado</strong></div><div><span>Auriculares</span><span>24</span><span className="bnp-sample-status">Disponible</span></div><div><span>Lámpara</span><span>3</span><span className="bnp-sample-low">Stock bajo</span></div></div><div className="bnp-sample-chart"><strong>Ventas por semana</strong><div aria-label="Gráfico ilustrativo: semana 1, 80 mil pesos; semana 2, 120 mil; semana 3, 100 mil; semana 4, 160 mil.">{[50, 75, 62.5, 100].map((height, i) => <span key={i}><i style={{ height: `${height}%` }} /><small>S{i + 1}</small></span>)}</div></div></> : <><div className="bnp-sample-table"><div><strong>Venta</strong><strong>Medio</strong><strong>Total</strong></div><div><span>#0012 · Local</span><span>Efectivo</span><span>$45.000</span></div><div><span>#0013 · Web</span><span>Mercado Pago</span><span>$32.000</span></div><div><span>#0014 · Local</span><span>Transferencia</span><span>$51.000</span></div></div><div className="bnp-sample-cash"><IconCheck /><div><strong>Todo en su lugar</strong><span>Ventas registradas en el historial</span></div></div></>}
    </div>
  </div>
}

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
      <div className="bnp-preview-visual"><div className="bnp-preview-browser"><span aria-hidden="true"><i /><i /><i /></span><small>Vista ilustrativa · Casa Norte</small></div>{index === 0 ? <StoreExample /> : <AdminExample inventory={index === 2} />}<p className="bnp-preview-disclaimer">Ejemplo con datos ficticios. No es una demo operativa.</p></div>
      <div className="bnp-preview-copy"><span className="bnp-eyebrow">{active.eyebrow}</span><h3>{active.title}</h3><p>{active.text}</p><ul>{active.bullets.map((bullet) => <li key={bullet}><IconCheck />{bullet}</li>)}</ul><a className="bnp-text-link" href="#planes">Ver qué incluye cada plan <IconArrow /></a></div>
    </div>)}
  </section>
}
