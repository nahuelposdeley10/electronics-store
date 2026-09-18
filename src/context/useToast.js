import { useContext } from 'react'
import { ToastContext } from './toast-context.js'

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast requiere un ToastProvider arriba')
  return value
}