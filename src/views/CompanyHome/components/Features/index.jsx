import './styles.css'

import { features } from './data.js'

export default function Features() {
  return <section className="bnp-features" id="funciones" aria-labelledby="bnp-features-title"><div className="bnp-wrap bnp-section">
    <div className="bnp-features-heading"><div className="bnp-section-intro"><span className="bnp-eyebrow">HERRAMIENTAS PARA EL TRABAJO REAL</span><h2 id="bnp-features-title">Todo lo que pasa en tu negocio.<br />En un mismo lugar.</h2></div><p>Elegí el plan con las herramientas que necesitás hoy. Tenés lugar para sumar más cuando tu negocio lo pida.</p></div>
    <div className="bnp-features-grid">{features.map(({ Icon, title, text, tag }) => <article key={tag}><Icon /><span>{tag}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    <p className="bnp-features-footnote">La disponibilidad de cada módulo depende del plan comercial elegido. <a href="#planes">Comparar planes</a></p>
  </div></section>
}
