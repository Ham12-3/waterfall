import { useTexture } from '@react-three/drei'
import { BackSide, SRGBColorSpace } from 'three'
import { ASSETS } from '../assets'

/**
 * Painted sky and distant hills on a big inward-facing sphere. Rotated so the
 * panorama's wrap seam sits behind the default camera and its sun is on the
 * same side as the scene's directional light.
 */
export function Sky() {
  const map = useTexture(ASSETS.sky)
  map.colorSpace = SRGBColorSpace
  return (
    <mesh name="Sky" rotation-y={Math.PI / 2} renderOrder={-1}>
      <sphereGeometry args={[220, 48, 24]} />
      <meshBasicMaterial map={map} side={BackSide} fog={false} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
