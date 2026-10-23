import { useState } from 'react'
import { IconArrow, IconBolt, IconCheck, IconShield, IconUsers } from '@/components/Icons'
import { botContactUrl, botLevels } from '../../content.js'
import ConversationDemo from './components/ConversationDemo'
import RobotScene from './components/RobotScene'
import './styles.css'

export default function WhatsAppBot() {
  const [selectedLevelId, setSelectedLevelId] = useState('profesional')
  const selectedLevel = botLevels.find((level) => level.id === selectedLevelId) || botLevels[1]

  return <section className="bnp-bot bnp-wrap bnp-section" id="bot" aria-labelledby="bnp-bot-title">
    <div className="bnp-bot-copy">
      <span className="bnp-eyebrow">VENDEDOR IA · WHATSAPP</span>
      <h2 id="bnp-bot-title">Que tu catálogo responda por vos.</h2>
      <p>Responde sobre tus productos, precios y disponibilidad. Y cuando hace falta una persona, le pasa la conversación a tu equipo.</p>
      <div className="bnp-bot-actions">
        <a className="bnp-button bnp-button-blue" href={botContactUrl} target="_blank" rel="noopener noreferrer">Cotizar el bot <IconArrow /></a>
        <a className="bnp-text-link" href="/admin">Ver el panel <IconArrow /></a>
      </div>
      <p className="bnp-bot-note"><IconShield /> El WhatsApp común sigue incluido en los planes. El vendedor IA es un adicional: lo configuramos con tu negocio y te acompañamos durante la activación.</p>
    </div>
    <div className="bnp-bot-companion" aria-hidden="true"><RobotScene /></div>
    <div className="bnp-bot-card" aria-label="Ejemplo de atención del vendedor IA">
      <div className="bnp-bot-card-head">
        <span className="bnp-bot-avatar" aria-hidden="true"><IconBolt /></span>
        <div><strong>Vendedor IA</strong><span>Atención automática · WhatsApp</span></div>
        <span className="bnp-bot-status">ADICIONAL</span>
      </div>
      <ConversationDemo />
      <div className="bnp-bot-capabilities">
        <div><IconCheck /><span><strong>Consulta tu catálogo</strong><small>Productos y disponibilidad</small></span></div>
        <div><IconUsers /><span><strong>Deriva a tu equipo</strong><small>Cuando la conversación lo necesita</small></span></div>
        <div><IconShield /><span><strong>Datos separados</strong><small>Cada negocio ve su propia información</small></span></div>
      </div>
    </div>
    <div className="bnp-bot-offer">
      <div className="bnp-bot-offer-heading">
        <span className="bnp-eyebrow">TRES NIVELES DE ATENCIÓN</span>
        <h3>Elegí cuánto querés automatizar.</h3>
        <p>El plan de tu tienda y el nivel del bot son decisiones separadas. Así pagás por la capacidad que realmente usás.</p>
        <div className="bnp-bot-selected-level" aria-live="polite">
          <span>Ahora estás viendo</span>
          <strong>{selectedLevel.name}</strong>
          <small>{selectedLevel.description}</small>
        </div>
      </div>
      <div className="bnp-bot-levels" aria-label="Niveles del vendedor IA">
        {botLevels.map((level) => <article className={`bnp-bot-level${level.featured ? ' is-featured' : ''}${level.id === selectedLevelId ? ' is-selected' : ''}`} key={level.id}>
          {level.featured && <span className="bnp-bot-level-recommended">RECOMENDADO</span>}
          <span className="bnp-bot-level-badge">{level.badge}</span>
          <h4>{level.name}</h4>
          <p>{level.description}</p>
          <ul>
            {level.features.map((feature) => <li key={feature}><IconCheck />{feature}</li>)}
          </ul>
          <span className="bnp-bot-level-price">Adicional mensual · según uso</span>
          <button className="bnp-bot-level-select" type="button" aria-pressed={level.id === selectedLevelId} onClick={() => setSelectedLevelId(level.id)}>{level.id === selectedLevelId ? 'Nivel seleccionado' : 'Ver este nivel'} <IconArrow /></button>
        </article>)}
      </div>
      <div className="bnp-bot-pricing">
        <div>
          <span className="bnp-eyebrow">COSTO TRANSPARENTE</span>
          <strong>Se cotiza aparte del plan de tienda.</strong>
          <p>La propuesta contempla la activación, el nivel elegido y el volumen de conversaciones. Si superás el uso incluido, podés ampliar el nivel o sumar consumo extra.</p>
        </div>
        <a className="bnp-text-link" href={botContactUrl} target="_blank" rel="noopener noreferrer">Pedir una cotización <IconArrow /></a>
      </div>
    </div>
  </section>
}
