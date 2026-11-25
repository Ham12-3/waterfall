import { RigidBody } from '@react-three/rapier'
import { GREYBOX_BLOCKS, type Block, type BlockData } from '../level/greybox'
import { useGameStore } from '../state/gameStore'

function CheckpointFlag({ block }: { block: Block }) {
  const reached = useGameStore((s) => s.checkpoint >= (block.checkpoint ?? 0))
  const top = block.size[1] / 2
  return (
    <group position={[block.size[0] / 2 - 0.25, top, -block.size[2] / 2 + 0.3]}>
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.04, 0.04, 1.2, 8]} />
        <meshStandardMaterial color="#2b2f36" />
      </mesh>
      <mesh position={[-0.22, 1, 0]}>
        <boxGeometry args={[0.44, 0.3, 0.03]} />
        <meshStandardMaterial
          color={reached ? '#5fe08a' : '#d9dde2'}
          emissive={reached ? '#2fbf62' : '#000000'}
          emissiveIntensity={reached ? 0.8 : 0}
        />
      </mesh>
    </group>
  )
}

/** Grey box test level. Replaced by the Blender level in Phase 5. */
export function Level() {
  return (
    <group name="Level">
      {GREYBOX_BLOCKS.map((block) => {
        const data: BlockData = { surface: block.surface, checkpoint: block.checkpoint, finish: block.finish }
        return (
          <RigidBody key={block.name} type="fixed" colliders="cuboid" position={block.position} userData={data}>
            <mesh name={block.name} castShadow receiveShadow>
              <boxGeometry args={block.size} />
              <meshStandardMaterial color={block.color} roughness={block.surface === 'wet' ? 0.25 : 0.9} />
            </mesh>
            {block.checkpoint !== undefined && <CheckpointFlag block={block} />}
          </RigidBody>
        )
      })}
    </group>
  )
}
