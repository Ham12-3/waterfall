import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useKeyboardControls } from '@react-three/drei'
import { CapsuleCollider, RigidBody, useRapier, type RapierRigidBody } from '@react-three/rapier'
import { Vector3, type Group } from 'three'
import { CONFIG, type Vec3 } from '../config'
import type { Control } from '../input/controls'
import { RESPAWN_POINTS, type BlockData } from '../level/greybox'
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
const PLAIN_GROUND: BlockData = { surface: 'default' }
const AIR_HANDLING = { accel: P.airAccel, brake: P.airAccel }

const forward = new Vector3()
const right = new Vector3()
const wish = new Vector3()

/** Moves `current` towards `target`, using `brake` when slowing or reversing. */
function approach(current: number, target: number, accel: number, brake: number, dt: number) {
  const slowing = Math.abs(target) < Math.abs(current) || target * current < 0
  const maxStep = (slowing ? brake : accel) * dt
  const diff = target - current
  return Math.abs(diff) <= maxStep ? target : current + Math.sign(diff) * maxStep
}

export function Player() {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const { world, rapier } = useRapier()
  const camera = useThree((s) => s.camera)
  const [, getKeys] = useKeyboardControls<Control>()

  // Frame-to-frame movement state.
  const motion = useRef({
    jumpHeld: false,
    retryHeld: false,
    coyote: 0,
    buffer: 0,
    jumping: false,
    wasGrounded: false,
    lastVy: 0,
    squash: 0,
    runId: useGameStore.getState().runId,
  })

  useEffect(() => {
    playerState.body = body.current
    return () => {
      playerState.body = null
    }
  }, [])

  /** Returns what the player is standing on, or null when airborne. */
  const probeGround = (rb: RapierRigidBody): BlockData | null => {
    const p = rb.translation()
    for (const [ox, oz] of RAY_OFFSETS) {
      const ray = new rapier.Ray({ x: p.x + ox, y: p.y, z: p.z + oz }, DOWN)
      const hit = world.castRay(ray, FOOT_OFFSET + P.groundProbe, true, undefined, undefined, undefined, rb)
      if (hit) return (hit.collider.parent()?.userData as BlockData | undefined) ?? PLAIN_GROUND
    }
    return null
  }

  const teleport = (rb: RapierRigidBody, point: Vec3) => {
    rb.setTranslation({ x: point[0], y: point[1], z: point[2] }, true)
    rb.setLinvel({ x: 0, y: 0, z: 0 }, true)
    const m = motion.current
    m.coyote = m.buffer = m.lastVy = 0
    m.jumping = false
    m.wasGrounded = false
  }

  useFrame((_, rawDt) => {
    const rb = body.current
    if (!rb) return
    const dt = Math.min(rawDt, 1 / 30)
    const m = motion.current
    const game = useGameStore.getState()
    const keys = getKeys()

    // Retry: R key, or the retry button (which bumps runId).
    if (keys.retry && !m.retryHeld) game.retry()
    m.retryHeld = keys.retry
    const runId = useGameStore.getState().runId
    if (runId !== m.runId) {
      m.runId = runId
      teleport(rb, RESPAWN_POINTS[0])
      return
    }

    const vel = rb.linvel()
    const ground = vel.y < 0.5 ? probeGround(rb) : null
    const grounded = ground !== null

    // Landing: squash the capsule and shake the camera after big drops.
    if (grounded && !m.wasGrounded) {
      const impact = Math.max(0, -m.lastVy)
      m.squash = Math.min(P.squashMax, impact * P.squashPerSpeed)
      const over = impact - CONFIG.camera.shakeThreshold
      if (over > 0) playerState.shake = Math.min(CONFIG.camera.shakeMax, over * 0.05)
      m.jumping = false
    }

    if (ground) {
      if (ground.checkpoint !== undefined) game.reachCheckpoint(ground.checkpoint)
      if (ground.finish) game.finishRun()
    }

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
    if (wish.lengthSq() > 0) game.startRun()
    wish.multiplyScalar(keys.sprint ? P.sprintSpeed : P.runSpeed)

    // Slippery surfaces brake slowly, so the player slides.
    const handling = ground ? CONFIG.surfaces[ground.surface] : AIR_HANDLING
    const vx = approach(vel.x, wish.x, handling.accel, handling.brake, dt)
    const vz = approach(vel.z, wish.z, handling.accel, handling.brake, dt)
    let vy = vel.y

    // Coyote time and jump buffering.
    m.coyote = grounded ? P.coyoteTime : Math.max(0, m.coyote - dt)
    m.buffer = keys.jump && !m.jumpHeld ? P.jumpBuffer : Math.max(0, m.buffer - dt)
    if (m.buffer > 0 && m.coyote > 0) {
      vy = P.jumpSpeed
      m.buffer = m.coyote = 0
      m.jumping = true
      game.startRun()
    }
    // Releasing Space early cuts the jump short.
    if (m.jumping && !keys.jump && vy > 0) {
      vy *= P.jumpCutMultiplier
      m.jumping = false
    }
    m.jumpHeld = keys.jump

    rb.setLinvel({ x: vx, y: vy, z: vz }, true)
    m.wasGrounded = grounded
    m.lastVy = vy

    // Falling into the pool: splash, then back to the last checkpoint.
    const pos = rb.translation()
    const inPool = pos.y - FOOT_OFFSET < CONFIG.level.waterY - CONFIG.level.sinkDepth
    if (inPool || pos.y < CONFIG.level.killY) {
      playerState.splash.position.set(pos.x, CONFIG.level.waterY, pos.z)
      playerState.splash.id += 1
      teleport(rb, RESPAWN_POINTS[game.checkpoint] ?? RESPAWN_POINTS[0])
      game.countRespawn()
      return
    }

    if (visual.current) {
      // Face the direction of travel.
      if (vx * vx + vz * vz > 0.5) {
        const targetYaw = Math.atan2(vx, vz)
        let delta = targetYaw - visual.current.rotation.y
        delta = Math.atan2(Math.sin(delta), Math.cos(delta))
        visual.current.rotation.y += delta * Math.min(1, P.turnSpeed * dt)
      }
      // Squash recovers exponentially; feet stay planted while squashed.
      m.squash *= Math.exp(-P.squashRecovery * dt)
      visual.current.scale.set(1 + m.squash * 0.5, 1 - m.squash, 1 + m.squash * 0.5)
      visual.current.position.y = -FOOT_OFFSET * m.squash
    }

    playerState.position.set(pos.x, pos.y, pos.z)
    playerState.velocity.set(vx, vy, vz)
    playerState.grounded = grounded
    if (ground) playerState.surface = ground.surface
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
      {/* Min combine rule keeps contact friction at zero, so only our own
          surface handling decides how slippery the ground is. */}
      <CapsuleCollider
        args={[P.halfHeight, P.radius]}
        friction={0}
        frictionCombineRule={rapier.CoefficientCombineRule.Min}
        restitution={0}
      />
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
