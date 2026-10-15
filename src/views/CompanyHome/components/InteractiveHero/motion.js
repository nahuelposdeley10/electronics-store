export function setupHeroDepth(surface, layer) {
  const pointerAllowed = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)')
  const motionAllowed = window.matchMedia('(prefers-reduced-motion: no-preference)')
  let frame = 0
  let targetX = 0
  let targetY = 0
  let targetScrollY = 0
  let x = 0
  let y = 0
  let scrollY = 0
  let previousTime = 0
  const paint = () => {
    layer.style.transform = `perspective(1000px) rotateX(${-y * 4}deg) rotateY(${x * 6}deg) translate3d(${x * 8}px, ${y * 5 + scrollY}px, 0)`
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
    scrollY += (targetScrollY - scrollY) * ease
    if (Math.abs(targetX - x) + Math.abs(targetY - y) + Math.abs(targetScrollY - scrollY) < 0.01) {
      x = targetX
      y = targetY
      scrollY = targetScrollY
      frame = 0
      previousTime = 0
    } else frame = window.requestAnimationFrame(tick)
    paint()
  }
  const queue = () => { if (!frame) frame = window.requestAnimationFrame(tick) }
  const resetPointer = () => {
    targetX = 0
    targetY = 0
    surface.classList.remove('bnp-depth-active')
    queue()
  }
  const updateScroll = () => {
    if (!motionAllowed.matches) {
      targetScrollY = 0
      queue()
      return
    }
    const rect = surface.getBoundingClientRect()
    const viewportCenter = window.innerHeight * .5
    const sceneCenter = rect.top + rect.height * .5
    const range = Math.max(window.innerHeight, rect.height)
    const progress = Math.max(-1, Math.min(1, (viewportCenter - sceneCenter) / range))
    targetScrollY = progress * 22
    queue()
  }
  const resetMotion = () => {
    targetX = 0
    targetY = 0
    targetScrollY = 0
    surface.classList.remove('bnp-depth-active')
    if (motionAllowed.matches) queue()
    else {
      window.cancelAnimationFrame(frame)
      frame = 0
      previousTime = 0
      x = 0
      y = 0
      scrollY = 0
      paint()
    }
  }
  const move = (event) => {
    if (!pointerAllowed.matches || event.pointerType === 'touch') return
    const rect = surface.getBoundingClientRect()
    targetX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1))
    targetY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1))
    surface.classList.add('bnp-depth-active')
    queue()
  }
  const onVisibility = () => { if (document.hidden) resetMotion(); else updateScroll() }
  surface.addEventListener('pointermove', move, { passive: true })
  surface.addEventListener('pointerleave', resetPointer)
  surface.addEventListener('pointercancel', resetPointer)
  pointerAllowed.addEventListener('change', resetPointer)
  motionAllowed.addEventListener('change', resetMotion)
  window.addEventListener('scroll', updateScroll, { passive: true })
  window.addEventListener('resize', updateScroll, { passive: true })
  window.addEventListener('blur', resetPointer)
  document.addEventListener('visibilitychange', onVisibility)
  updateScroll()
  return () => {
    window.cancelAnimationFrame(frame)
    surface.removeEventListener('pointermove', move)
    surface.removeEventListener('pointerleave', resetPointer)
    surface.removeEventListener('pointercancel', resetPointer)
    pointerAllowed.removeEventListener('change', resetPointer)
    motionAllowed.removeEventListener('change', resetMotion)
    window.removeEventListener('scroll', updateScroll)
    window.removeEventListener('resize', updateScroll)
    window.removeEventListener('blur', resetPointer)
    document.removeEventListener('visibilitychange', onVisibility)
    surface.classList.remove('bnp-depth-active')
    layer.style.removeProperty('transform')
    for (const property of ['--bnp-depth-x', '--bnp-depth-y', '--bnp-light-x', '--bnp-light-y']) surface.style.removeProperty(property)
  }
}
