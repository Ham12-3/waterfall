import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, MeshBasicMaterial } from 'three'
import { CONFIG } from '../config'
import { playerState } from '../state/playerState'

const E = CONFIG.effects

/** Placeholder pool splash: an expanding ring. Phase 3 replaces it with spray particles. */
export function Splash() {
  const ring = useRef<Mesh>(null)
  const state = useRef({ seenId: playerState.splash.id, age: Infinity })

  useFrame((_, dt) => {
    const mesh = ring.current
    if (!mesh) return
    const s = state.current
    if (playerState.splash.id !== s.seenId) {
      s.seenId = playerState.splash.id
      s.age = 0
      mesh.position.copy(playerState.splash.position)
      mesh.position.y += 0.03
    }
    s.age += dt
    const t = s.age / E.splashDuration
    mesh.visible = t < 1
    if (!mesh.visible) return
    const eased = 1 - (1 - t) * (1 - t)
    mesh.scale.setScalar(0.3 + eased * E.splashRadius)
    ;(mesh.material as MeshBasicMaterial).opacity = 1 - t
  })

  return (
    <mesh ref={ring} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.7, 1, 32]} />
      <meshBasicMaterial color="#ffffff" transparent depthWrite={false} />
    </mesh>
  )
}
