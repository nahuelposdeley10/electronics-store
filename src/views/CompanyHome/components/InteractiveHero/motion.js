export function setupHeroDepth(surface, layer) {
  const allowed = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
  let frame = 0
  let targetX = 0
  let targetY = 0
  let x = 0
  let y = 0
  let previousTime = 0
  const paint = () => {
    layer.style.transform = `perspective(1000px) rotateX(${-y * 4}deg) rotateY(${x * 6}deg) translate3d(${x * 8}px, ${y * 5}px, 0)`
    surface.style.setProperty('--bnp-depth-x', `${x * 16}px`)
    surface.style.setProperty('--bnp-depth-y', `${y * 12}px`)
    surface.style.setProperty('--bnp-light-x', `${x * 42}px`)
    surface.style.setProperty('--bnp-light-y', `${y * 32}px`)
  }
  const tick = (time) => {
    const delta = previousTime ? Math.min(time - previousTime, 50) : 16.67
    previousTime = time
    const ease = 1 - Math.pow(0.82, delta / 16.67)
    x += (targetX - x) * ease
    y += (targetY - y) * ease
    if (Math.abs(targetX - x) + Math.abs(targetY - y) < 0.001) {
      x = targetX
      y = targetY
      frame = 0
      previousTime = 0
    } else frame = window.requestAnimationFrame(tick)
    paint()
  }
  const queue = () => { if (!frame) frame = window.requestAnimationFrame(tick) }
  const reset = () => {
    targetX = 0
    targetY = 0
    surface.classList.remove('bnp-depth-active')
    if (allowed.matches) queue()
    else {
      window.cancelAnimationFrame(frame)
      frame = 0
      previousTime = 0
      x = 0
      y = 0
      paint()
    }
  }
  const move = (event) => {
    if (!allowed.matches || event.pointerType === 'touch') return
    const rect = surface.getBoundingClientRect()
    targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1))
    targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1))
    surface.classList.add('bnp-depth-active')
    queue()
  }
  const onVisibility = () => { if (document.hidden) reset() }
  surface.addEventListener('pointermove', move, { passive: true })
  surface.addEventListener('pointerleave', reset)
  surface.addEventListener('pointercancel', reset)
  allowed.addEventListener('change', reset)
  window.addEventListener('blur', reset)
  document.addEventListener('visibilitychange', onVisibility)
  return () => {
    window.cancelAnimationFrame(frame)
    surface.removeEventListener('pointermove', move)
    surface.removeEventListener('pointerleave', reset)
    surface.removeEventListener('pointercancel', reset)
    allowed.removeEventListener('change', reset)
    window.removeEventListener('blur', reset)
    document.removeEventListener('visibilitychange', onVisibility)
    surface.classList.remove('bnp-depth-active')
    layer.style.removeProperty('transform')
    for (const property of ['--bnp-depth-x', '--bnp-depth-y', '--bnp-light-x', '--bnp-light-y']) surface.style.removeProperty(property)
  }
}
