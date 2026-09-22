import { useContext } from 'react'
import { ConfirmContext } from './confirm-context.js'

export function useConfirm() {
  const value = useContext(ConfirmContext)
  if (!value) throw new Error('useConfirm requiere un ConfirmProvider arriba')
  return value
}