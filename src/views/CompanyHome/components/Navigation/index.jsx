import { useEffect, useRef, useState } from 'react'
import { IconArrow, IconClose } from '@/components/Icons'
import './styles.css'

import { links } from './data.js'

export default function Navigation() {
  const [open, setOpen] = useState(false)
  const toggle = useRef(null)
  const header = useRef(null)
  useEffect(() => {
    if (!open) return
    const closeOutside = (event) => { if (!header.current?.contains(event.target)) setOpen(false) }
    const escape = (event) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus() }
    }
    const desktop = window.matchMedia('(min-width: 1000px)')
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false) }
    document.addEventListener('pointerdown', closeOutside)
    document.addEventListener('keydown', escape)
    desktop.addEventListener('change', closeOnDesktop)
    return () => {
      document.removeEventListener('pointerdown', closeOutside)
      document.removeEventListener('keydown', escape)
      desktop.removeEventListener('change', closeOnDesktop)
    }
  }, [open])
  return (
    <header className="bnp-header" ref={header}>
      <div className="bnp-nav bnp-wrap">
        <a className="bnp-brand" href="/home" aria-label="Tienda BNP, inicio">tienda<span>bnp.</span></a>
        <button ref={toggle} type="button" className="bnp-menu-toggle" aria-expanded={open} aria-controls="bnp-navigation" aria-label={open ? 'Cerrar menú' : 'Abrir menú'} onClick={() => setOpen(!open)}>
          {open ? <IconClose /> : <span className="bnp-menu-lines" aria-hidden="true" />}
        </button>
        <nav id="bnp-navigation" aria-label="Navegación principal" className={`bnp-nav-links${open ? ' is-open' : ''}`} onClick={(event) => { if (event.target.closest('a')) setOpen(false) }}>
          {links.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
          <a href="/admin" className="bnp-nav-login">Entrar al panel <IconArrow /></a>
        </nav>
      </div>
    </header>
  )
}
