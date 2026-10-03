import { IconPlus } from '@/components/Icons'
import { contactUrl, faqs } from '../../content.js'
import './styles.css'

export default function Faq() {
  return <section className="bnp-faq" id="preguntas" aria-labelledby="bnp-faq-title"><div className="bnp-wrap bnp-section bnp-faq-layout">
    <div className="bnp-section-intro"><span className="bnp-eyebrow">ANTES DE DAR EL PASO</span><h2 id="bnp-faq-title">Es lógico<br />tener preguntas.</h2><p>Acá van algunas respuestas.<br />Si te queda otra, <a href={contactUrl} target="_blank" rel="noopener noreferrer">hablemos por WhatsApp</a>.</p></div>
    <div className="bnp-faq-list">{faqs.map(([question, answer]) => <details key={question}><summary>{question}<IconPlus /></summary><p>{answer}</p></details>)}</div>
  </div></section>
}
