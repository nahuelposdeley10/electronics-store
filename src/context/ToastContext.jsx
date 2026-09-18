import { useCallback, useState } from 'react'
import { ToastContext } from './toast-context.js'

let timer = null

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)

  const dismiss = useCallback(() => setToast(null), [])

  const showToast = useCallback(
    (message, type = 'success') => {
      clearTimeout(timer)
      setToast({ message, type })
      timer = setTimeout(dismiss, 3500)
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
    </ToastContext.Provider>
  )
}