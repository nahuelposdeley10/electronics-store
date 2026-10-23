import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'

export function createRobot({ logoTexture } = {}) {
  const robot = new THREE.Group()
  const ceramic = new THREE.MeshPhysicalMaterial({ color: 0xf2f4f8, roughness: 0.24, metalness: 0.22, clearcoat: 0.8, clearcoatRoughness: 0.18 })
  const blue = new THREE.MeshPhysicalMaterial({ color: 0x315cf5, metalness: 0.5, roughness: 0.25, clearcoat: 0.7 })
  const alloy = new THREE.MeshStandardMaterial({ color: 0x9faec1, metalness: 0.92, roughness: 0.26 })
  const graphite = new THREE.MeshStandardMaterial({ color: 0x182336, metalness: 0.5, roughness: 0.38 })
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x07131f, metalness: 0.36, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08 })
  const light = new THREE.MeshStandardMaterial({ color: 0x97efff, emissive: 0x48c9ed, emissiveIntensity: 1.7, roughness: 0.3 })
  const badge = new THREE.MeshPhysicalMaterial({ color: 0xf8fbff, emissive: 0x315cf5, emissiveIntensity: 0.06, roughness: 0.2, metalness: 0.12, clearcoat: 0.9 })
  const eyes = []

  function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
    const part = new THREE.Mesh(geometry, material)
    part.position.set(x, y, z)
    part.castShadow = true
    part.receiveShadow = true
    parent.add(part)
    return part
  }
  const box = (parent, w, h, d, radius, material, x, y, z) => mesh(parent, new RoundedBoxGeometry(w, h, d, 4, radius), material, x, y, z)
  const ball = (parent, radius, material, x, y, z) => mesh(parent, new THREE.SphereGeometry(radius, 24, 16), material, x, y, z)

  const head = new THREE.Group()
  head.position.y = 0.94
  head.userData.restY = head.position.y
  robot.add(head)
  box(head, 1.36, 0.99, 0.92, 0.29, ceramic, 0, 0, 0)
  box(head, 1.19, 0.73, 0.28, 0.22, alloy, 0, -0.01, 0.38)
  box(head, 1.13, 0.67, 0.26, 0.2, glass, 0, -0.01, 0.42)
  for (const side of [-1, 1]) {
    const eye = box(head, 0.11, 0.19, 0.045, 0.053, light, side * 0.255, 0.025, 0.561)
    eye.userData.gazeBaseX = eye.position.x
    eye.userData.gazeBaseY = eye.position.y
    eyes.push(eye)
    const ear = mesh(head, new THREE.CylinderGeometry(0.21, 0.21, 0.11, 32), alloy, side * 0.69, -0.01, 0)
    ear.rotation.z = Math.PI / 2
    const earCap = mesh(head, new THREE.CylinderGeometry(0.15, 0.15, 0.12, 32), blue, side * 0.715, -0.01, 0)
    earCap.rotation.z = Math.PI / 2
    ball(head, 0.023, graphite, side * 0.43, 0.345, 0.353)
  }
  const smileCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(-0.13, -0.16, 0.562), new THREE.Vector3(0, -0.26, 0.575), new THREE.Vector3(0.13, -0.16, 0.562))
  const smile = mesh(head, new THREE.TubeGeometry(smileCurve, 20, 0.016, 8, false), light)
  mesh(robot, new THREE.CylinderGeometry(0.16, 0.2, 0.22, 32), alloy, 0, 0.38, 0)

  box(robot, 0.97, 0.94, 0.69, 0.24, ceramic, 0, -0.17, 0)
  box(robot, 0.74, 0.7, 0.64, 0.2, blue, 0, -0.2, -0.09)
  box(robot, 0.79, 0.65, 0.15, 0.18, ceramic, 0, -0.13, 0.31)
  mesh(robot, new THREE.TorusGeometry(0.127, 0.028, 12, 40), alloy, 0, -0.08, 0.4)
  const core = mesh(robot, new THREE.CylinderGeometry(0.105, 0.105, 0.035, 32), badge, 0, -0.08, 0.405)
  core.rotation.x = Math.PI / 2
  let chestLogo = null
  if (logoTexture) {
    const logoMaterial = new THREE.MeshBasicMaterial({ map: logoTexture, transparent: true, alphaTest: 0.04, toneMapped: false })
    chestLogo = mesh(robot, new THREE.PlaneGeometry(0.16, 0.16), logoMaterial, 0, -0.08, 0.431)
    chestLogo.castShadow = false
    chestLogo.receiveShadow = false
    chestLogo.renderOrder = 2
  }
  for (const x of [-0.13, 0, 0.13]) box(robot, 0.07, 0.018, 0.025, 0.008, graphite, x, -0.39, 0.385)
  box(robot, 0.61, 0.16, 0.48, 0.07, graphite, 0, -0.64, 0)

  const arms = []
  for (const side of [-1, 1]) {
    const arm = new THREE.Group()
    arm.position.set(side * 0.59, 0.1, 0)
    arm.rotation.z = side * 0.13
    robot.add(arm)
    ball(arm, 0.17, alloy, 0, 0, 0)
    box(arm, 0.27, 0.43, 0.29, 0.13, ceramic, side * 0.035, -0.22, 0)
    ball(arm, 0.12, graphite, side * 0.04, -0.46, 0)
    box(arm, 0.24, 0.31, 0.27, 0.11, ceramic, side * 0.04, -0.61, 0.025)
    mesh(arm, new THREE.CylinderGeometry(0.095, 0.095, 0.08, 24), alloy, side * 0.04, -0.8, 0.03)
    box(arm, 0.24, 0.21, 0.2, 0.09, graphite, side * 0.04, -0.91, 0.055)
    for (const offset of [-0.06, 0.015, 0.09]) box(arm, 0.04, 0.13, 0.08, 0.019, alloy, side * 0.04 + offset, -0.935, 0.132)
    ball(arm, 0.065, ceramic, -side * 0.075, -0.88, 0.13)
    arms.push(arm)

    ball(robot, 0.14, alloy, side * 0.24, -0.76, 0)
    box(robot, 0.32, 0.42, 0.35, 0.13, ceramic, side * 0.24, -0.98, 0)
    ball(robot, 0.13, graphite, side * 0.24, -1.19, 0.015)
    box(robot, 0.31, 0.29, 0.36, 0.11, ceramic, side * 0.24, -1.37, 0.035)
    box(robot, 0.39, 0.16, 0.57, 0.075, blue, side * 0.24, -1.55, 0.12)
    box(robot, 0.36, 0.1, 0.53, 0.045, graphite, side * 0.24, -1.63, 0.12)
  }
  return { robot, head, eyes, arms, core, light, smile, chestLogo }
}
