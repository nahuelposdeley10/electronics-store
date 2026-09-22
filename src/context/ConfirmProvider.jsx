import { useCallback, useRef, useState } from 'react'
import { ConfirmContext } from './confirm-context.js'

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((options) => {
    setState(typeof options === 'string' ? { message: options } : options)
    return new Promise((resolve) => {
      resolveRef.current = resolve
    })
  }, [])

  const settle = useCallback((result) => {
    setState(null)
    if (resolveRef.current) {
      resolveRef.current(result)
      resolveRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => settle(false), [settle])

  return (
    <ConfirmContext.Provider value={{ state, confirm, settle, dismiss }}>
      {children}
    </ConfirmContext.Provider>
  )
}