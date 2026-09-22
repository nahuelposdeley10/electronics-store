import { useEffect, useRef } from 'react'
import { useConfirm } from '@/context/useConfirm'
import { IconWarning } from '@/components/Icons'

import './styles.css'

export default function ConfirmDialog() {
  const { state, dismiss, settle } = useConfirm()
  const cancelRef = useRef(null)

  useEffect(() => {
    if (state) cancelRef.current?.focus()
  }, [state])

  useEffect(() => {
    if (!state) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [state, dismiss])

  if (!state) return null

  const {
    title = '¿Estás seguro?',
    message,
    confirmLabel = 'Eliminar',
    cancelLabel = 'Cancelar',
    icon,
  } = state

  const cancel = () => settle(false)
  const act = () => settle(true)

  return (
    <div className="confirm-overlay" onMouseDown={cancel}>
      <div
        className="confirm-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {icon ? (
          <span className="confirm-icon">{icon}</span>
        ) : (
          <span className="confirm-icon confirm-icon-warn">
            <IconWarning />
          </span>
        )}
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-message" className="confirm-message">
          {message}
        </p>
        <div className="confirm-actions">
          <button type="button" className="ghost-btn" ref={cancelRef} onClick={cancel}>
            {cancelLabel}
          </button>
          <button type="button" className="primary-btn" onClick={act}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}