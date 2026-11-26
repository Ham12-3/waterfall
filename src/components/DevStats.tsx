import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

/** Renderer counters for one whole frame (every pass: shadows, scene, post). */
export const frameStats = { calls: 0, triangles: 0, geometries: 0, textures: 0, programs: 0 }

/**
 * Dev-only performance probe. The renderer normally resets its counters on
 * every render call, which hides all but the last post-processing pass, so
 * this takes over the reset and totals a full frame instead.
 * Read it in the console as `__cascade.frameStats`.
 */
export function DevStats() {
  const gl = useThree((s) => s.gl)

  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])

  // Priority 2 runs after the effect composer (priority 1) has drawn the frame.
  useFrame(() => {
    frameStats.calls = gl.info.render.calls
    frameStats.triangles = gl.info.render.triangles
    frameStats.geometries = gl.info.memory.geometries
    frameStats.textures = gl.info.memory.textures
    frameStats.programs = gl.info.programs?.length ?? 0
    gl.info.reset()
  }, 2)

  return null
}
