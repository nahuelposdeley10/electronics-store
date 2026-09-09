import { useCart } from '../context/useCart'
import { IconBolt } from './Icons'

export default function Toast() {
  const { toast } = useCart()
  if (!toast) return null
  return (
    <div className="toast" role="status">
      <IconBolt />
      <span>{toast}</span>
    </div>
  )
}