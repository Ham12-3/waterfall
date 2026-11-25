import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useRapier } from '@react-three/rapier'
import { MathUtils, Vector3 } from 'three'
import { CONFIG } from '../config'
import { playerState } from '../state/playerState'

const C = CONFIG.camera
const DAMPING = 2 * Math.sqrt(C.springStiffness)

const target = new Vector3()
const dir = new Vector3()

/**
 * Third-person camera. The look-at point follows the player on a critically
 * damped spring; mouse drag orbits, the wheel zooms, and walls push it closer.
 */
export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const dom = useThree((s) => s.gl.domElement)
  const { world, rapier } = useRapier()

  const orbit = useRef({ yaw: 0, pitch: C.startPitch as number, distance: C.distance as number })
  const rig = useRef({
    focus: new Vector3(...CONFIG.player.spawn).setY(CONFIG.player.spawn[1] + C.targetHeight),
    velocity: new Vector3(),
    currentDistance: C.distance as number,
  })

  useEffect(() => {
    const o = orbit.current
    let dragging = false
    let lastX = 0
    let lastY = 0
    const onDown = (e: PointerEvent) => {
      dragging = true
      lastX = e.clientX
      lastY = e.clientY
      dom.setPointerCapture(e.pointerId)
    }
    const onUp = (e: PointerEvent) => {
      dragging = false
      if (dom.hasPointerCapture(e.pointerId)) dom.releasePointerCapture(e.pointerId)
    }
    const onMove = (e: PointerEvent) => {
      if (!dragging) return
      o.yaw -= (e.clientX - lastX) * C.orbitSensitivity
      o.pitch = MathUtils.clamp(o.pitch + (e.clientY - lastY) * C.orbitSensitivity, C.minPitch, C.maxPitch)
      lastX = e.clientX
      lastY = e.clientY
    }
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      o.distance = MathUtils.clamp(o.distance + e.deltaY * C.zoomSensitivity, C.minDistance, C.maxDistance)
    }
    dom.addEventListener('pointerdown', onDown)
    dom.addEventListener('pointerup', onUp)
    dom.addEventListener('pointercancel', onUp)
    dom.addEventListener('pointermove', onMove)
    dom.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      dom.removeEventListener('pointerdown', onDown)
      dom.removeEventListener('pointerup', onUp)
      dom.removeEventListener('pointercancel', onUp)
      dom.removeEventListener('pointermove', onMove)
      dom.removeEventListener('wheel', onWheel)
    }
  }, [dom])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const o = orbit.current
    const r = rig.current

    // Spring the focus point towards the player.
    target.copy(playerState.position)
    target.y += C.targetHeight
    r.velocity.x += ((target.x - r.focus.x) * C.springStiffness - r.velocity.x * DAMPING) * dt
    r.velocity.y += ((target.y - r.focus.y) * C.springStiffness - r.velocity.y * DAMPING) * dt
    r.velocity.z += ((target.z - r.focus.z) * C.springStiffness - r.velocity.z * DAMPING) * dt
    r.focus.addScaledVector(r.velocity, dt)

    // Direction from the focus point out to the camera.
    const cosPitch = Math.cos(o.pitch)
    dir.set(Math.sin(o.yaw) * cosPitch, Math.sin(o.pitch), Math.cos(o.yaw) * cosPitch)

    // Pull in instantly if a wall is in the way, ease back out afterwards.
    let allowed: number = o.distance
    const hit = world.castRay(
      new rapier.Ray(r.focus, dir),
      o.distance,
      true,
      undefined,
      undefined,
      undefined,
      playerState.body ?? undefined,
    )
    if (hit) allowed = Math.max(0.6, hit.timeOfImpact - C.wallMargin)
    r.currentDistance =
      allowed < r.currentDistance ? allowed : MathUtils.damp(r.currentDistance, allowed, C.zoomOutRate, dt)

    camera.position.copy(r.focus).addScaledVector(dir, r.currentDistance)
    if (playerState.shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * playerState.shake
      camera.position.y += (Math.random() - 0.5) * playerState.shake
      playerState.shake *= Math.exp(-C.shakeDecay * dt)
    }
    camera.lookAt(r.focus)
  })

  return null
}
