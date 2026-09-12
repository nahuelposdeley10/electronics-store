const FORCED_KEY = 'techstore-motion-on'

export function isMotionForced() {
  try {
    return localStorage.getItem(FORCED_KEY) === '1'
  } catch {
    return false
  }
}

export function initMotion() {
  const root = document.documentElement
  root.classList.add('anim-js')
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  root.classList.toggle('anim-off', reduce && !isMotionForced())
}

export function setMotionForced(on) {
  try {
    localStorage.setItem(FORCED_KEY, on ? '1' : '0')
  } catch {
    // storage no disponible
  }
  const root = document.documentElement
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  root.classList.toggle('anim-off', reduce && !on)
}