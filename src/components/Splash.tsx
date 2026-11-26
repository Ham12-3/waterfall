import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { DoubleSide, ShaderMaterial, type Mesh } from 'three'
import { ASSETS } from '../assets'
import { CONFIG } from '../config'
import { playerState } from '../state/playerState'

const E = CONFIG.effects
const GRID = 4
const FRAMES = GRID * GRID

/**
 * Pool splash: a 4x4 flipbook cut from a Veo clip of a crown splash on black.
 * Brightness is used as alpha. The quad stands on the water and turns to face
 * the camera around the vertical axis.
 */
export function Splash() {
  const quad = useRef<Mesh>(null)
  const state = useRef({ seenId: playerState.splash.id, age: Infinity })
  const map = useTexture(ASSETS.splashFlipbook)

  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: { uMap: { value: map }, uFrame: { value: 0 }, uFade: { value: 1 } },
        vertexShader: /* glsl */ `
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap;
          uniform float uFrame;
          uniform float uFade;
          varying vec2 vUv;
          void main() {
            float col = mod(uFrame, ${GRID}.0);
            float row = floor(uFrame / ${GRID}.0);
            vec2 uv = (vec2(col, ${GRID - 1}.0 - row) + vUv) / ${GRID}.0;
            float brightness = texture2D(uMap, uv).r;
            // Soften the cell's edges so the quad never shows as a rectangle.
            float edge = smoothstep(0.0, 0.08, vUv.x) * smoothstep(0.0, 0.08, 1.0 - vUv.x)
                       * smoothstep(0.0, 0.06, vUv.y) * smoothstep(0.0, 0.1, 1.0 - vUv.y);
            gl_FragColor = vec4(vec3(1.0), smoothstep(0.05, 0.7, brightness) * edge * uFade);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      }),
    [map],
  )

  useFrame(({ camera }, dt) => {
    const mesh = quad.current
    if (!mesh) return
    const s = state.current
    if (playerState.splash.id !== s.seenId) {
      s.seenId = playerState.splash.id
      s.age = 0
      mesh.position.copy(playerState.splash.position)
      mesh.position.y += E.splashSize[1] / 2
    }
    s.age += dt
    const t = s.age / E.splashDuration
    mesh.visible = t < 1
    if (!mesh.visible) return
    mesh.rotation.y = Math.atan2(camera.position.x - mesh.position.x, camera.position.z - mesh.position.z)
    material.uniforms.uFrame.value = Math.min(FRAMES - 1, Math.floor(t * FRAMES))
    // The source clip never fully clears, so fade the last third out.
    material.uniforms.uFade.value = Math.min(1, (1 - t) * 3)
  })

  return (
    <mesh ref={quad} material={material} visible={false} renderOrder={7}>
      <planeGeometry args={E.splashSize} />
    </mesh>
  )
}
