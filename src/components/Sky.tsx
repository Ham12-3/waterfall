import { useMemo } from 'react'
import { Environment, useTexture } from '@react-three/drei'
import { BackSide, EquirectangularReflectionMapping, SRGBColorSpace } from 'three'
import { ASSETS } from '../assets'
import { CONFIG } from '../config'

/**
 * Painted sky and distant hills on a big inward-facing sphere. Rotated so the
 * panorama's wrap seam sits behind the default camera and its sun is on the
 * same side as the scene's directional light.
 */
export function Sky() {
  const map = useTexture(ASSETS.sky)
  map.colorSpace = SRGBColorSpace
  // The same painting lights the scene, so rocks, water and the character pick
  // up the sky's colours and wet surfaces have something to reflect.
  const environment = useMemo(() => {
    const texture = map.clone()
    texture.mapping = EquirectangularReflectionMapping
    texture.needsUpdate = true
    return texture
  }, [map])
  return (
    <>
      <mesh name="Sky" rotation-y={Math.PI / 2} renderOrder={-1}>
        <sphereGeometry args={[220, 48, 24]} />
        <meshBasicMaterial map={map} side={BackSide} fog={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <Environment map={environment} environmentIntensity={CONFIG.environmentIntensity} environmentRotation={[0, Math.PI / 2, 0]} />
    </>
  )
}
