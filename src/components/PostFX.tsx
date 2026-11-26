import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Bloom, DepthOfField, EffectComposer, ToneMapping, Vignette } from '@react-three/postprocessing'
import { useControls } from 'leva'
import { ToneMappingMode, type DepthOfFieldEffect } from 'postprocessing'
import { CONFIG } from '../config'
import { playerState } from '../state/playerState'

const P = CONFIG.post

/** Bloom on the white water, a soft depth of field focused on the player, and a vignette. */
export function PostFX() {
  const dof = useRef<DepthOfFieldEffect>(null)
  const controls = useControls(
    'Post-processing',
    {
      enabled: true,
      bloom: { value: P.bloomIntensity, min: 0, max: 2, step: 0.05 },
      depthOfField: P.depthOfField,
      bokeh: { value: P.bokehScale, min: 0, max: 8, step: 0.1 },
      vignette: { value: P.vignetteDarkness, min: 0, max: 1, step: 0.01 },
    },
    { collapsed: true },
  )

  // Keep the focal plane on the player.
  useFrame(() => {
    if (dof.current) dof.current.target = playerState.position
  })

  if (!controls.enabled) return null

  return (
    <EffectComposer multisampling={P.multisampling}>
      <Bloom intensity={controls.bloom} luminanceThreshold={P.bloomThreshold} luminanceSmoothing={0.2} mipmapBlur />
      {controls.depthOfField ? (
        <DepthOfField ref={dof} worldFocusRange={P.focusRange} bokehScale={controls.bokeh} resolutionScale={0.5} />
      ) : (
        <></>
      )}
      <Vignette offset={0.3} darkness={controls.vignette} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}
