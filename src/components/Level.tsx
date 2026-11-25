import { RigidBody } from '@react-three/rapier'
import { GREYBOX_BLOCKS } from '../level/greybox'

/** Phase 1 grey box test level. Replaced by the Blender level in Phase 5. */
export function Level() {
  return (
    <group name="Level">
      {GREYBOX_BLOCKS.map((block) => (
        <RigidBody key={block.name} type="fixed" colliders="cuboid" position={block.position}>
          <mesh name={block.name} castShadow receiveShadow>
            <boxGeometry args={block.size} />
            <meshStandardMaterial color={block.color} roughness={0.9} />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}
