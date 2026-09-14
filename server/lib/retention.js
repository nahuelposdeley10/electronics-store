import { env } from '../config/env.js'

const DAY_MS = 24 * 60 * 60 * 1000

export function movementsRetentionDays() {
  return Math.max(1, env.movementRetentionDays)
}

export function movementsExpireAt() {
  return new Date(Date.now() + movementsRetentionDays() * DAY_MS)
}