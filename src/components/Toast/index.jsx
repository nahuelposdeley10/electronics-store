import { useToast } from '@/context/useToast'
import { IconCheck, IconCross, IconWarning } from '@/components/Icons'

import './styles.css'

const ICONS = {
  success: IconCheck,
  error: IconCross,
  warn: IconWarning,
}

export default function Toast() {
  const { toast } = useToast()
  if (!toast) return null
  const Icon = ICONS[toast.type] || IconCheck
  return (
    <div
      className={`toast toast-${toast.type}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <Icon />
      <span>{toast.message}</span>
    </div>
  )
}