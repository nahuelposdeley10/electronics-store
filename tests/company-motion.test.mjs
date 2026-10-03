import test from 'node:test'
import assert from 'node:assert/strict'
import { setupHeroDepth } from '../src/views/CompanyHome/components/InteractiveHero/motion.js'

class Target {
  listeners = new Map()
  addEventListener(name, handler) { this.listeners.set(name, handler) }
  removeEventListener(name) { this.listeners.delete(name) }
  emit(name, event = {}) { this.listeners.get(name)?.(event) }
}

test('hero depth is bounded, settles, resets and cleans up', () => {
  const savedWindow = globalThis.window
  const savedDocument = globalThis.document
  const media = Object.assign(new Target(), { matches: true })
  const frames = new Map()
  const properties = new Map()
  const classes = new Set()
  let sequence = 0
  let time = 0
  const layer = { style: { removeProperty(name) { delete this[name] } } }
  const surface = Object.assign(new Target(), {
    style: { setProperty: (key, value) => properties.set(key, value), removeProperty: (key) => properties.delete(key) },
    classList: { add: (key) => classes.add(key), remove: (key) => classes.delete(key) },
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }),
  })
  globalThis.window = Object.assign(new Target(), {
    matchMedia: () => media,
    requestAnimationFrame: (callback) => { frames.set(++sequence, callback); return sequence },
    cancelAnimationFrame: (id) => frames.delete(id),
  })
  globalThis.document = Object.assign(new Target(), { hidden: false })
  const settle = () => {
    let count = 0
    while (frames.size && count++ < 200) {
      time += 16.67
      const pending = [...frames]
      frames.clear()
      for (const [, callback] of pending) callback(time)
    }
    assert.equal(frames.size, 0, 'animation must stop, not run forever')
  }
  let cleanup
  try {
    cleanup = setupHeroDepth(surface, layer)
    surface.emit('pointermove', { pointerType: 'mouse', clientX: 200, clientY: 200 })
    settle()
    assert.match(layer.style.transform, /rotateX\(-4deg\) rotateY\(6deg\)/)
    assert.equal(properties.get('--bnp-light-x'), '42px')
    surface.emit('pointerleave')
    settle()
    assert.match(layer.style.transform, /rotateX\(0deg\) rotateY\(0deg\)/)
    assert.equal(classes.size, 0)
    surface.emit('pointermove', { pointerType: 'touch', clientX: 100, clientY: 100 })
    assert.equal(frames.size, 0)
    surface.emit('pointermove', { pointerType: 'mouse', clientX: 100, clientY: 100 })
    media.matches = false
    media.emit('change')
    assert.equal(frames.size, 0, 'reduced motion cancels pending frames immediately')
    assert.match(layer.style.transform, /rotateX\(0deg\) rotateY\(0deg\)/)
    cleanup()
    assert.equal(surface.listeners.size, 0)
    assert.equal(media.listeners.size, 0)
    assert.equal(properties.size, 0)
    assert.equal(layer.style.transform, undefined)
  } finally {
    cleanup?.()
    globalThis.window = savedWindow
    globalThis.document = savedDocument
  }
})
