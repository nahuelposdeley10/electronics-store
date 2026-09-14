import { IconStar } from '@/components/Icons'

import './styles.css'

export default function Stars({ rating }) {
  const full = Math.round(rating)
  return (
    <span className="stars" aria-label={`${rating.toFixed(1)} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <IconStar key={i} filled={i <= full} className="star" />
      ))}
    </span>
  )
}