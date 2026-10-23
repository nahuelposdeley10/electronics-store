import { useEffect, useRef, useState } from 'react'
import { botDemoScenarios } from '../../../../content.js'
import './styles.css'

function ConversationMessage({ message, index, isVisible }) {
  const isAgent = message.side === 'agent'
  return <div
    className={`bnp-bot-message-row bnp-bot-message-row-${message.side}${isVisible ? ' is-visible' : ''}`}
    style={{ '--message-delay': `${index * 120}ms` }}
  >
    <div className="bnp-bot-message-meta">
      <span className="bnp-bot-message-avatar" aria-hidden="true">{isAgent ? 'IA' : 'C'}</span>
      <span>{isAgent ? 'Vendedor IA' : 'Cliente'}</span>
      <time dateTime={`2026-01-01T${message.time}:00`}>{message.time}</time>
    </div>
    <p className={`bnp-bot-message bnp-bot-message-${message.side}`}>
      {isAgent && <span className="bnp-bot-typing" aria-hidden="true"><i /><i /><i /></span>}
      {message.text}
    </p>
    {isAgent && <span className="bnp-bot-message-status">{message.status} · ✓✓</span>}
  </div>
}

export default function ConversationDemo() {
  const chatRef = useRef(null)
  const [activeScenarioId, setActiveScenarioId] = useState(botDemoScenarios[0].id)
  const [isVisible, setIsVisible] = useState(false)
  const [actionFeedback, setActionFeedback] = useState('')
  const activeScenario = botDemoScenarios.find((scenario) => scenario.id === activeScenarioId) || botDemoScenarios[0]

  useEffect(() => {
    const element = chatRef.current
    if (!element) return undefined
    if (!('IntersectionObserver' in window)) {
      const timeoutId = window.setTimeout(() => setIsVisible(true), 0)
      return () => window.clearTimeout(timeoutId)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true)
        observer.disconnect()
      }
    }, { threshold: 0.22 })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const selectScenario = (scenarioId) => {
    setActiveScenarioId(scenarioId)
    setActionFeedback('')
  }

  return <div className="bnp-bot-chat" ref={chatRef} aria-label="Demo interactiva de conversación">
    <div className="bnp-bot-chat-heading">
      <div>
        <small>Ejemplo de atención</small>
        <strong>{activeScenario.eyebrow}</strong>
      </div>
      <span className="bnp-bot-live"><i /> En vivo</span>
    </div>
    <div className="bnp-bot-scenarios" role="tablist" aria-label="Situaciones de ejemplo">
      {botDemoScenarios.map((scenario) => <button
        className={`bnp-bot-scenario${scenario.id === activeScenarioId ? ' is-active' : ''}`}
        type="button"
        role="tab"
        aria-selected={scenario.id === activeScenarioId}
        aria-controls={`bnp-bot-conversation-${scenario.id}`}
        key={scenario.id}
        onClick={() => selectScenario(scenario.id)}
      >{scenario.label}</button>)}
    </div>
    <div className={`bnp-bot-conversation${isVisible ? ' is-visible' : ''}`} id={`bnp-bot-conversation-${activeScenario.id}`} role="tabpanel" aria-live="polite">
      {activeScenario.messages.map((message, index) => <ConversationMessage key={`${activeScenario.id}-${index}`} message={message} index={index} isVisible={isVisible} />)}
    </div>
    <div className="bnp-bot-demo-actions" aria-label="Acciones del ejemplo">
      <span>¿Qué debería hacer el bot?</span>
      <div>
        {activeScenario.actions.map((action) => <button type="button" className="bnp-bot-demo-action" key={action.id} onClick={() => setActionFeedback(action.feedback)}>{action.label}</button>)}
      </div>
      {actionFeedback && <p className="bnp-bot-action-feedback" role="status">{actionFeedback}</p>}
    </div>
  </div>
}
