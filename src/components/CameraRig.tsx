import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { CONFIG } from '../config'
import { playerState } from '../state/playerState'

const C = CONFIG.camera
const target = new Vector3()
const delta = new Vector3()

/** Phase 1: mouse-orbit camera that stays locked onto the player. */
export function CameraRig() {
  const controls = useRef<OrbitControlsImpl>(null)

  useFrame(() => {
    const oc = controls.current
    if (!oc) return
    target.copy(playerState.position)
    target.y += C.targetHeight
    delta.subVectors(target, oc.target)
    oc.object.position.add(delta)
    oc.target.copy(target)
    oc.update()
  })

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      minDistance={C.minDistance}
      maxDistance={C.maxDistance}
      maxPolarAngle={C.maxPolarAngle}
    />
  )
}
