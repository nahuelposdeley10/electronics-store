const revealGroups = [
  '.bnp-section-intro',
  '.bnp-features-grid article',
  '.bnp-payments-copy, .bnp-payment-paths',
  '.bnp-start-steps li',
  '.bnp-plan',
  '.bnp-setup',
  '.bnp-faq-list',
  '.bnp-closing-inner',
]

// Content stays visible without JS. Only animate elements as they enter view;
// never hide a focused link or keep a section waiting for an observer callback.
export function setupCompanyMotion(root) {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
  const seen = new WeakSet()
  const running = new Map()
  let observer
  let scrollFrame = 0

  const stopAnimations = () => {
    for (const animation of running.values()) animation.cancel()
    running.clear()
  }
  const observe = () => {
    observer?.disconnect()
    stopAnimations()
    if (reduced.matches || !window.IntersectionObserver || !Element.prototype.animate) return
    observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting)
      visible.forEach(({ target }, index) => {
        observer.unobserve(target)
        if (seen.has(target)) return
        seen.add(target)
        if (target.contains(document.activeElement)) return
        const animation = target.animate(
          [{ opacity: 0, transform: 'translate3d(0, 26px, 0)' }, { opacity: 1, transform: 'translate3d(0, 0, 0)' }],
          { duration: 680, delay: Math.min(index, 3) * 75, easing: 'cubic-bezier(.2,.7,.2,1)', fill: 'backwards' },
        )
        running.set(target, animation)
        animation.onfinish = () => { running.delete(target); animation.cancel() }
      })
    }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' })
    root.querySelectorAll(revealGroups.join(',')).forEach((element) => observer.observe(element))
  }
  const onFocus = (event) => {
    for (const [element, animation] of running) {
      if (element.contains(event.target)) { animation.cancel(); running.delete(element) }
    }
  }
  const updateProgress = () => {
    scrollFrame = 0
    const distance = document.documentElement.scrollHeight - window.innerHeight
    const progress = distance > 0 ? Math.max(0, Math.min(1, window.scrollY / distance)) : 0
    root.style.setProperty('--bnp-reading-progress', String(progress))
    root.classList.toggle('bnp-is-scrolled', window.scrollY > 24)
  }
  const queueProgress = () => {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateProgress)
  }
  const resize = new ResizeObserver(queueProgress)
  resize.observe(root)
  observe()
  updateProgress()
  reduced.addEventListener('change', observe)
  root.addEventListener('focusin', onFocus)
  window.addEventListener('scroll', queueProgress, { passive: true })
  window.addEventListener('resize', queueProgress, { passive: true })
  return () => {
    observer?.disconnect()
    resize.disconnect()
    stopAnimations()
    window.cancelAnimationFrame(scrollFrame)
    reduced.removeEventListener('change', observe)
    root.removeEventListener('focusin', onFocus)
    window.removeEventListener('scroll', queueProgress)
    window.removeEventListener('resize', queueProgress)
    root.style.removeProperty('--bnp-reading-progress')
    root.classList.remove('bnp-is-scrolled')
  }
}
