import './styles.css'

import { steps } from './data.js'
export default function GettingStarted() {
  return <section className="bnp-start" id="como-funciona" aria-labelledby="bnp-start-title"><div className="bnp-wrap bnp-section">
    <div className="bnp-section-intro"><span className="bnp-eyebrow">CÓMO FUNCIONA</span><h2 id="bnp-start-title">Un próximo paso claro.<br />Desde el primer día.</h2><p>Coordinamos la configuración según tu negocio. El alcance y los tiempos se acuerdan antes de comenzar.</p></div>
    <ol className="bnp-start-steps">{steps.map(([title, text], i) => <li key={title}><span aria-hidden="true">0{i + 1}</span><h3>{title}</h3><p>{text}</p></li>)}</ol>
  </div></section>
}
