import { useEffect, useRef } from 'react'
import './styles.css'

export default function RobotScene() {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    let disposed = false
    let loading = false
    let visible = false
    let scene

    // Load the 3D engine only when the illustration approaches the viewport.
    const observer = new IntersectionObserver(async ([entry]) => {
      visible = entry.isIntersecting
      scene?.setVisible(visible)
      if (!visible || loading) return
      loading = true
      try {
        const { mountRobotScene } = await import('./scene.js')
        if (disposed) return
        scene = mountRobotScene(mount)
        scene.setVisible(visible)
      } catch {
        // Reveal the lightweight illustration only after a real WebGL failure.
        if (!disposed) {
          mount.classList.remove('has-three-canvas', 'is-loading')
          mount.classList.add('is-fallback')
        }
      }
    }, { rootMargin: '100px' })
    observer.observe(mount)

    return () => {
      disposed = true
      observer.disconnect()
      scene?.dispose()
    }
  }, [])

  return <div ref={mountRef} className="bnp-robot-scene is-loading" aria-hidden="true">
    <div className="bnp-robot-fallback">
      <div className="bnp-robot-model">
        <span className="bnp-robot-head"><i className="bnp-robot-eye bnp-robot-eye-left" /><i className="bnp-robot-eye bnp-robot-eye-right" /></span>
        <span className="bnp-robot-body"><i className="bnp-robot-chest" /></span>
        <span className="bnp-robot-arm bnp-robot-arm-left" />
        <span className="bnp-robot-arm bnp-robot-arm-right" />
        <span className="bnp-robot-leg bnp-robot-leg-left" />
        <span className="bnp-robot-leg bnp-robot-leg-right" />
      </div>
    </div>
  </div>
}
