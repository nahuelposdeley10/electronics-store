import { IconArrow, IconMail, IconPhone } from '@/components/Icons'
import { commercialContact, contactUrl, emailUrl } from '../../content.js'
import './styles.css'

export default function Closing() {
  return <section className="bnp-closing" aria-labelledby="bnp-closing-title"><div className="bnp-wrap bnp-closing-inner"><div><span className="bnp-eyebrow">HAGAMOS LUGAR A LO QUE SIGUE</span><h2 id="bnp-closing-title">Tu negocio ya tiene historia.<br />Dale su próximo espacio.</h2><p>Contanos qué vendés y cómo trabajás. Encontramos el plan para vos.</p></div><div className="bnp-closing-actions"><div className="bnp-contact-options" aria-label="Canales de contacto"><a className="bnp-button bnp-contact-whatsapp" href={contactUrl} target="_blank" rel="noopener noreferrer">Hablemos por WhatsApp <IconPhone /></a><a className="bnp-button bnp-contact-email" href={emailUrl}>Escribinos por Gmail <IconMail /></a></div><div className="bnp-contact-details"><span>{commercialContact.displayPhone}</span><span>{commercialContact.email}</span></div><a className="bnp-text-link" href="#planes">Volver a los planes <IconArrow /></a></div></div></section>
}
