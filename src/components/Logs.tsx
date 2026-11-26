import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { CuboidCollider, RigidBody, type RapierRigidBody } from '@react-three/rapier'
import type { Group, Object3D } from 'three'
import { CONFIG } from '../config'
import type { BlockData } from '../level/greybox'
import { WATERFALL } from '../level/greybox'
import { useLevelModel } from '../level/useLevelModel'
import { useGameStore } from '../state/gameStore'

const C = CONFIG.logs
const TOP = WATERFALL.topY + 1.5
const BOTTOM = CONFIG.level.waterY - 1.2
const TRAVEL = TOP - BOTTOM
const LOG_SURFACE: BlockData = { surface: 'wet' }

interface LogProps {
  model: { object: Object3D; length: number; radius: number }
  /** 0..1 offset along the loop, so the logs are spread out. */
  phase: number
  x: number
}

/** One log drifting down the face of the falls on a loop. It can be ridden. */
function FallingLog({ model, phase, x }: LogProps) {
  const body = useRef<RapierRigidBody>(null)
  const visual = useRef<Group>(null)
  const travelled = useRef(phase * TRAVEL)
  const object = useMemo(() => model.object.clone(), [model])

  useFrame((_, rawDt) => {
    const rb = body.current
    if (!rb) return
    const gamePhase = useGameStore.getState().phase
    if (gamePhase === 'title' || gamePhase === 'paused') return
    const dt = Math.min(rawDt, 1 / 30)
    const before = travelled.current
    travelled.current = (before + C.speed * dt) % TRAVEL
    const next = { x, y: TOP - travelled.current, z: C.laneZ }
    // Wrapping from the pool back to the top is a teleport, not a move.
    if (travelled.current < before) rb.setTranslation(next, true)
    else rb.setNextKinematicTranslation(next)
    if (visual.current) visual.current.rotation.x += C.rollSpeed * dt
  })

  return (
    <RigidBody
      ref={body}
      type="kinematicPosition"
      colliders={false}
      position={[x, TOP - travelled.current, C.laneZ]}
      userData={LOG_SURFACE}
    >
      {/* A box slightly slimmer than the bark, so feet sit on the wood. */}
      <CuboidCollider args={[model.length / 2, model.radius * 0.85, model.radius * 0.85]} />
      <group ref={visual}>
        <primitive object={object} />
      </group>
    </RigidBody>
  )
}

/** Logs carried down the falls. Slippery, rideable, and able to knock you off a ledge. */
export function Logs() {
  const { logs } = useLevelModel()
  const models = [logs.Log_A, logs.Log_B].filter(Boolean)
  if (models.length === 0) return null
  return (
    <group name="Logs">
      {Array.from({ length: C.count }, (_, i) => (
        <FallingLog key={i} model={models[i % models.length]} phase={i / C.count} x={C.laneX[i % C.laneX.length]} />
      ))}
    </group>
  )
}
