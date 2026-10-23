import * as THREE from 'three'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { createRobot } from './model.js'
import { getGazeTarget } from './gaze.js'

let robotIntroductionPlayed = false

function ease(value) {
  const progress = THREE.MathUtils.clamp(value, 0, 1)
  return progress * progress * (3 - 2 * progress)
}

function createContactShadowTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')
  const gradient = context.createRadialGradient(128, 64, 8, 128, 64, 112)
  gradient.addColorStop(0, 'rgba(20, 36, 62, .32)')
  gradient.addColorStop(.42, 'rgba(20, 36, 62, .16)')
  gradient.addColorStop(1, 'rgba(20, 36, 62, 0)')
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export function mountRobotScene(mount) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setClearColor(0x000000, 0)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap

  const scene = new THREE.Scene()
  const environment = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environmentMap = pmrem.fromScene(environment, 0.04)
  scene.environment = environmentMap.texture
  scene.environmentIntensity = 0.8
  environment.dispose()
  pmrem.dispose()
  scene.add(new THREE.HemisphereLight(0xecf5ff, 0x68809c, 1.2))
  const key = new THREE.DirectionalLight(0xffffff, 3)
  key.position.set(-3, 6, 5)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  Object.assign(key.shadow.camera, { left: -3, right: 3, top: 3, bottom: -3, near: 0.1, far: 20 })
  key.shadow.normalBias = 0.03
  key.shadow.bias = -0.0001
  key.shadow.radius = 4
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x8babff, 2)
  rim.position.set(3, 2, -3)
  scene.add(rim)
  const logoTexture = new THREE.TextureLoader().load('/images/brand/tienda-bnp-icon.png', () => draw())
  logoTexture.colorSpace = THREE.SRGBColorSpace
  logoTexture.anisotropy = 4
  const { robot, head, eyes, arms, core, light, smile, chestLogo } = createRobot({ logoTexture })
  scene.add(robot)
  // Only the contact shadow is drawn: there is no floor color or backdrop.
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.ShadowMaterial({ opacity: 0.045 }))
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.7
  floor.receiveShadow = true
  scene.add(floor)
  const contactShadowTexture = createContactShadowTexture()
  const contactShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(2.15, 0.82),
    new THREE.MeshBasicMaterial({ map: contactShadowTexture, transparent: true, depthWrite: false, opacity: 0.74 }),
  )
  contactShadow.rotation.x = -Math.PI / 2
  contactShadow.position.set(0, -1.692, 0.08)
  contactShadow.renderOrder = 1
  scene.add(contactShadow)
  const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30)
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const target = { x: 0, y: 0, scroll: 0, attention: 0, proximity: 0 }
  const pointer = { x: 0, y: 0, scroll: 0, attention: 0, proximity: 0 }
  const eyePointer = { x: 0, y: 0, attention: 0 }
  const bodyPointer = { x: 0, y: 0 }
  const cursor = { x: 0, y: 0, active: false }
  const headScreenPosition = new THREE.Vector3()
  let visible = false
  let lost = false
  let disposed = false
  let frame = 0
  let previousTime = 0
  let elapsed = 0
  let introductionStart = -1

  function pose(time, animate, delta) {
    const headFactor = animate ? 1 - Math.exp(-9 * delta) : 1
    const eyeFactor = animate ? 1 - Math.exp(-17 * delta) : 1
    const bodyFactor = animate ? 1 - Math.exp(-2.6 * delta) : 1
    for (const axis of ['x', 'y', 'scroll', 'attention', 'proximity']) pointer[axis] += ((animate ? target[axis] : 0) - pointer[axis]) * headFactor
    for (const axis of ['x', 'y', 'attention']) eyePointer[axis] += ((animate ? target[axis] : 0) - eyePointer[axis]) * eyeFactor
    for (const axis of ['x', 'y']) bodyPointer[axis] += ((animate ? target[axis] : 0) - bodyPointer[axis]) * bodyFactor
    const introductionTime = introductionStart >= 0 ? time - introductionStart : Number.POSITIVE_INFINITY
    const introductionActive = animate && introductionTime >= 0 && introductionTime < 2.25
    const greetingRise = introductionActive
      ? ease(introductionTime / 0.45) * (1 - ease((introductionTime - 1.78) / 0.42))
      : 0
    const waveRise = introductionActive
      ? ease((introductionTime - 0.28) / 0.44) * (1 - ease((introductionTime - 1.62) / 0.5))
      : 0
    const wave = waveRise * Math.sin(Math.max(0, introductionTime - 0.58) * 10.5) * 0.13
    robot.rotation.y = 0.22 + bodyPointer.x * 0.18 + pointer.scroll * 0.1
    robot.rotation.x = bodyPointer.y * 0.035
    // Aim the head in screen space, compensating for the body's resting angle.
    head.rotation.y = pointer.x * 0.85 - robot.rotation.y * pointer.attention
    head.rotation.x = pointer.y * 0.55 - greetingRise * 0.09
    head.rotation.z = animate ? Math.sin(time * 0.7) * 0.025 * (1 - pointer.attention) : 0
    head.position.y = head.userData.restY + greetingRise * 0.085
    arms[0].rotation.z = -0.13 - (animate ? Math.sin(time * 1.1) * 0.035 : 0)
    arms[1].rotation.z = 0.2 + (animate ? Math.sin(time * 1.1 + 1) * 0.05 : 0) + waveRise * 1.42 + wave
    arms[1].rotation.x = waveRise * 0.18
    const greetingBlink = introductionActive && ((introductionTime > 0.2 && introductionTime < 0.31) || (introductionTime > 0.55 && introductionTime < 0.66))
    const ambientBlink = animate && time % 6 > 5.7 && time % 6 < 5.84
    const blink = greetingBlink || ambientBlink ? 0.15 : 1
    light.emissiveIntensity = 1.7 + pointer.proximity * 1.25
    core.material.emissiveIntensity = 0.06 + pointer.proximity * 0.42
    core.scale.setScalar(1 + pointer.proximity * 0.055)
    chestLogo.scale.setScalar(1 + pointer.proximity * 0.055)
    smile.scale.y = 1 + pointer.proximity * 0.28
    eyes.forEach((eye) => {
      eye.position.x = eye.userData.gazeBaseX + eyePointer.x * 0.045
      eye.position.y = eye.userData.gazeBaseY - eyePointer.y * 0.035
      eye.scale.x = 1 + eyePointer.attention * 0.08
      eye.scale.y = blink
    })
  }
  function draw(delta = 1 / 60) {
    if (disposed || lost) return
    pose(elapsed, !reducedMotion.matches, delta)
    renderer.render(scene, camera)
  }
  function tick(time) {
    frame = 0
    if (!visible || document.hidden || lost || disposed) return
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 1 / 60
    elapsed += delta
    previousTime = time
    draw(delta)
    if (!reducedMotion.matches) frame = requestAnimationFrame(tick)
  }
  function syncAnimation() {
    cancelAnimationFrame(frame)
    frame = 0
    previousTime = 0
    if (document.hidden || reducedMotion.matches) onPointerLeave()
    if (!visible || document.hidden || lost || disposed) return
    draw()
    if (!reducedMotion.matches) frame = requestAnimationFrame(tick)
  }
  function updateGazeTarget() {
    if (!cursor.active || !visible || reducedMotion.matches) return
    const rect = mount.getBoundingClientRect()
    head.getWorldPosition(headScreenPosition).project(camera)
    const origin = {
      x: rect.left + (headScreenPosition.x + 1) * rect.width / 2,
      y: rect.top + (1 - headScreenPosition.y) * rect.height / 2,
    }
    const gaze = getGazeTarget(cursor, origin, { width: window.innerWidth, height: window.innerHeight })
    const distance = Math.hypot(cursor.x - origin.x, cursor.y - origin.y)
    target.x = gaze.x
    target.y = gaze.y
    target.attention = 1
    target.proximity = THREE.MathUtils.clamp(1 - distance / 320, 0, 1)
  }
  function onScroll() {
    if (!visible || reducedMotion.matches) return
    const rect = mount.getBoundingClientRect()
    target.scroll = THREE.MathUtils.clamp((window.innerHeight / 2 - rect.top - rect.height / 2) / window.innerHeight, -1, 1)
    updateGazeTarget()
  }
  function resize() {
    const width = Math.max(1, mount.clientWidth)
    const height = Math.max(1, mount.clientHeight)
    camera.aspect = width / height
    // Fit the complete silhouette, including hands and feet, at every aspect ratio.
    const distance = Math.max(3.8, 2.55 / camera.aspect) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))
    camera.position.set(0, 0.4, distance)
    camera.lookAt(0, -0.1, 0)
    camera.updateProjectionMatrix()
    renderer.setSize(width, height, false)
    draw()
    onScroll()
  }
  function onPointerMove(event) {
    if (reducedMotion.matches || event.pointerType === 'touch') {
      onPointerLeave()
      return
    }
    cursor.x = event.clientX
    cursor.y = event.clientY
    cursor.active = true
    updateGazeTarget()
  }
  function onPointerLeave() {
    cursor.active = false
    target.x = 0
    target.y = 0
    target.attention = 0
    target.proximity = 0
  }
  function onPointerOut(event) {
    if (!event.relatedTarget) onPointerLeave()
  }
  function onContextLost(event) {
    event.preventDefault()
    lost = true
    cancelAnimationFrame(frame)
    mount.classList.remove('has-three-canvas', 'is-loading')
    mount.classList.add('is-fallback')
  }
  function onContextRestored() {
    lost = false
    mount.classList.remove('is-fallback')
    mount.classList.add('has-three-canvas')
    syncAnimation()
  }
  const observer = new ResizeObserver(resize)
  mount.appendChild(renderer.domElement)
  resize()
  mount.classList.remove('is-loading', 'is-fallback')
  mount.classList.add('has-three-canvas')
  observer.observe(mount)
  window.addEventListener('pointermove', onPointerMove, { passive: true, capture: true })
  window.addEventListener('pointerout', onPointerOut)
  window.addEventListener('blur', onPointerLeave)
  window.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', syncAnimation)
  reducedMotion.addEventListener('change', syncAnimation)
  renderer.domElement.addEventListener('webglcontextlost', onContextLost)
  renderer.domElement.addEventListener('webglcontextrestored', onContextRestored)

  return {
    setVisible(next) {
      visible = next
      if (visible && !reducedMotion.matches && !robotIntroductionPlayed) {
        robotIntroductionPlayed = true
        introductionStart = elapsed
      }
      onScroll()
      syncAnimation()
    },
    dispose() {
      disposed = true
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('pointermove', onPointerMove, true)
      window.removeEventListener('pointerout', onPointerOut)
      window.removeEventListener('blur', onPointerLeave)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', syncAnimation)
      reducedMotion.removeEventListener('change', syncAnimation)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      renderer.domElement.removeEventListener('webglcontextrestored', onContextRestored)
      const geometries = new Set()
      const materials = new Set()
      scene.traverse((part) => {
        if (part.geometry) geometries.add(part.geometry)
        if (part.material) materials.add(part.material)
      })
      geometries.forEach((geometry) => geometry.dispose())
      materials.forEach((material) => material.dispose())
      logoTexture.dispose()
      contactShadowTexture.dispose()
      environmentMap.dispose()
      key.shadow.dispose()
      renderer.dispose()
      renderer.domElement.remove()
      mount.classList.remove('has-three-canvas', 'is-loading', 'is-fallback')
    },
  }
}
