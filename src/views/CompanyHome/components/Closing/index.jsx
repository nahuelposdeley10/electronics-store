import { IconArrow, IconPhone } from '@/components/Icons'
import { commercialContact, contactUrl } from '../../content.js'
import './styles.css'

export default function Closing() {
  return <section className="bnp-closing" aria-labelledby="bnp-closing-title"><div className="bnp-wrap bnp-closing-inner"><div><span className="bnp-eyebrow">HAGAMOS LUGAR A LO QUE SIGUE</span><h2 id="bnp-closing-title">Tu negocio ya tiene historia.<br />Dale su próximo espacio.</h2><p>Contanos qué vendés y cómo trabajás. Encontramos el plan para vos.</p></div><div className="bnp-closing-actions"><a className="bnp-button" href={contactUrl} target="_blank" rel="noopener noreferrer">Hablemos por WhatsApp <IconPhone /></a><span>{commercialContact.displayPhone}</span><a className="bnp-text-link" href="#planes">Volver a los planes <IconArrow /></a></div></div></section>
}
