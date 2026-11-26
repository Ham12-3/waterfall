import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useAnimations, useGLTF } from '@react-three/drei'
import { DoubleSide, LoopOnce, LoopRepeat, type Group, type Mesh, type MeshStandardMaterial } from 'three'
import { ASSETS, DRACO_PATH } from '../assets'
import { CONFIG } from '../config'
import { playerState } from '../state/playerState'

const C = CONFIG.character
const P = CONFIG.player
const FOOT_OFFSET = P.halfHeight + P.radius

type Clip = 'Idle' | 'Run' | 'Jump' | 'Fall' | 'Land'

/**
 * The animated player model (a Mixamo character, reduced and exported from
 * Blender). It only reads playerState: physics decides where the player is,
 * and this picks and blends the matching clip.
 */
export function Character() {
  const root = useRef<Group>(null)
  const { scene, animations } = useGLTF(ASSETS.character, DRACO_PATH)
  const { actions } = useAnimations(animations, root)
  const state = useRef({ clip: null as Clip | null, landing: playerState.landing.id, landUntil: 0 })

  useEffect(() => {
    scene.traverse((child) => {
      const mesh = child as Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      // Skinned bounds follow the bind pose, so never cull by them.
      mesh.frustumCulled = false
      const material = mesh.material as MeshStandardMaterial
      if (material.name.toLowerCase().includes('hair')) {
        // Hair cards: cut out by alpha instead of blending, so they sort correctly.
        material.transparent = false
        material.alphaTest = 0.45
        material.side = DoubleSide
        material.depthWrite = true
      }
    })
  }, [scene])

  const play = (clip: Clip, startAt = 0, timeScale = 1) => {
    const s = state.current
    if (s.clip === clip) return
    const next = actions[clip]
    if (!next) return
    const previous = s.clip ? actions[s.clip] : null
    const once = clip === 'Jump' || clip === 'Land'
    next.reset()
    next.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity)
    next.clampWhenFinished = once
    next.time = startAt
    next.timeScale = timeScale
    next.fadeIn(C.blendTime).play()
    previous?.fadeOut(C.blendTime)
    s.clip = clip
  }

  useFrame(({ clock }) => {
    const s = state.current
    const now = clock.elapsedTime
    const speed = Math.hypot(playerState.velocity.x, playerState.velocity.z)

    // A hard enough touchdown plays the landing recovery before anything else.
    if (playerState.landing.id !== s.landing) {
      s.landing = playerState.landing.id
      if (playerState.landing.impact > C.landImpact) {
        s.clip = null // allow Land to restart even if it was the last clip
        play('Land', C.landStart, C.landSpeed)
        s.landUntil = now + C.landHold
      }
    }

    if (!playerState.grounded) {
      // Rising plays the jump from just after its crouch; falling loops Fall.
      if (playerState.velocity.y > 0.5) play('Jump', C.jumpStart)
      else play('Fall')
    } else if (now >= s.landUntil) {
      if (speed > 0.6) play('Run')
      else play('Idle')
    }

    // Match the run cycle to how fast the player is actually moving.
    const run = actions.Run
    if (run && s.clip === 'Run') run.timeScale = Math.max(0.6, speed / C.runCycleSpeed)
  })

  return (
    <group ref={root} position={[0, -FOOT_OFFSET, 0]} scale={C.scale}>
      <primitive object={scene} />
    </group>
  )
}

useGLTF.preload(ASSETS.character, DRACO_PATH)
