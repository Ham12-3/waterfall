import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { useLevelModel, type BoxCollider } from '../level/useLevelModel'
import { useGameStore } from '../state/gameStore'

function CheckpointFlag({ box }: { box: BoxCollider }) {
  const reached = useGameStore((s) => s.checkpoint >= (box.checkpoint ?? 0))
  const [hx, hy, hz] = box.halfExtents
  return (
    <group position={[hx - 0.3, hy, -hz + 0.35]}>
      <mesh position={[0, 0.6, 0]} castShadow>
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

/** The Blender-built level: drawn meshes plus invisible box colliders. */
export function Level() {
  const { visuals, colliders } = useLevelModel()
  return (
    <group name="Level">
      <primitive object={visuals} />
      {colliders.map((box) => (
        <RigidBody
          key={box.name}
          type="fixed"
          colliders={false}
          position={box.position}
          quaternion={box.quaternion}
          userData={{ surface: box.surface, checkpoint: box.checkpoint, finish: box.finish }}
        >
          <CuboidCollider args={box.halfExtents} />
          {box.checkpoint !== undefined && <CheckpointFlag box={box} />}
        </RigidBody>
      ))}
    </group>
  )
}
