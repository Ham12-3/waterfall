import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Vector3, type Group } from 'three'
import { CONFIG } from '../config'
import type { Control } from '../input/controls'
import { useGameStore } from '../state/gameStore'
import { playerState } from '../state/playerState'

const P = CONFIG.player
const FOOT_OFFSET = P.halfHeight + P.radius
/** Ground rays: centre plus four around the capsule so ledge edges still count. */
const RAY_OFFSETS: [number, number][] = [
  [0, 0],
  [P.radius * 0.7, 0],
  [-P.radius * 0.7, 0],
  [0, P.radius * 0.7],
  [0, -P.radius * 0.7],
]
const DOWN = { x: 0, y: -1, z: 0 }

const forward = new Vector3()
const right = new Vector3()
const wish = new Vector3()

function approach(current: number, target: number, maxStep: number) {
  const diff = target - current
  return Math.abs(diff) <= maxStep ? target : current + Math.sign(diff) * maxStep
}

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const jumpWasHeld = useRef(false)
  const [, getKeys] = useKeyboardControls<Control>()
  const { world, rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const countRespawn = useGameStore((s) => s.countRespawn)

  const isGrounded = (rb: RapierRigidBody) => {
    const p = rb.translation()
    for (const [ox, oz] of RAY_OFFSETS) {
      const ray = new rapier.Ray({ x: p.x + ox, y: p.y, z: p.z + oz }, DOWN)
      const hit = world.castRay(ray, FOOT_OFFSET + P.groundProbe, true, undefined, undefined, undefined, rb)
      if (hit) return true
    }
    return false
  }

  useFrame((_, rawDt) => {
    const rb = body.current
    if (!rb) return
    const dt = Math.min(rawDt, 1 / 30)
    const keys = getKeys()
    const vel = rb.linvel()
    const grounded = isGrounded(rb) && vel.y < 0.5

    // Movement direction relative to where the camera is looking.
    camera.getWorldDirection(forward)
    forward.y = 0
    forward.normalize()
    right.crossVectors(forward, camera.up).normalize()
    wish
      .set(0, 0, 0)
      .addScaledVector(forward, Number(keys.forward) - Number(keys.back))
      .addScaledVector(right, Number(keys.right) - Number(keys.left))
    if (wish.lengthSq() > 1) wish.normalize()
    wish.multiplyScalar(keys.sprint ? P.sprintSpeed : P.runSpeed)

    const step = (grounded ? P.groundAccel : P.airAccel) * dt
    let vx = approach(vel.x, wish.x, step)
    let vz = approach(vel.z, wish.z, step)
    let vy = vel.y

    // Jump on press; releasing early cuts the jump short.
    const jumpPressed = keys.jump && !jumpWasHeld.current
    if (jumpPressed && grounded) vy = P.jumpSpeed
    if (!keys.jump && jumpWasHeld.current && vy > 0) vy *= P.jumpCutMultiplier
    jumpWasHeld.current = keys.jump

    rb.setLinvel({ x: vx, y: vy, z: vz }, true)

    if (rb.translation().y < P.killY) {
      rb.setTranslation({ x: P.spawn[0], y: P.spawn[1], z: P.spawn[2] }, true)
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
      vx = vy = vz = 0
      countRespawn()
    }

    // Turn the visual to face the direction of travel.
    if (visual.current && vx * vx + vz * vz > 0.5) {
      const targetYaw = Math.atan2(vx, vz)
      let delta = targetYaw - visual.current.rotation.y
      delta = Math.atan2(Math.sin(delta), Math.cos(delta))
      visual.current.rotation.y += delta * Math.min(1, P.turnSpeed * dt)
    }

    const now = rb.translation()
    playerState.position.set(now.x, now.y, now.z)
    playerState.velocity.set(vx, vy, vz)
    playerState.grounded = grounded
  })

  return (
    <RigidBody
      ref={body}
      name="Player"
      colliders={false}
      position={P.spawn}
      enabledRotations={[false, false, false]}
      canSleep={false}
      ccd
    >
      <CapsuleCollider args={[P.halfHeight, P.radius]} friction={0} restitution={0} />
      <group ref={visual}>
        <mesh castShadow>
          <capsuleGeometry args={[P.radius, P.halfHeight * 2, 6, 16]} />
          <meshStandardMaterial color="#e8703a" roughness={0.6} />
        </mesh>
        {/* Nose marker so facing direction is visible on the capsule. */}
        <mesh position={[0, P.halfHeight * 0.6, P.radius]} castShadow>
          <boxGeometry args={[0.18, 0.18, 0.25]} />
          <meshStandardMaterial color="#2b2f36" />
        </mesh>
      </group>
    </RigidBody>
  )
}
