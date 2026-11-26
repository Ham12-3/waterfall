import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { Group, Mesh, Quaternion, Vector3, type BufferGeometry, type Object3D } from 'three'
import { ASSETS, DRACO_PATH } from '../assets'
import type { BlockData } from './greybox'

export interface BoxCollider extends BlockData {
  name: string
  position: Vector3
  quaternion: Quaternion
  halfExtents: [number, number, number]
}

export interface LevelModel {
  /** Everything that is simply drawn: cliff, rocks, shore, pool floor. */
  visuals: Group
  /** Boxes authored in Blender as `<Name>_COL` unit cubes. */
  colliders: BoxCollider[]
  /** The curved waterfall mesh; the game puts its own shader on it. */
  sheetGeometry: BufferGeometry
  /** Log props by name (`Log_A`, `Log_B`), each centred on its own origin. */
  logs: Record<string, { object: Object3D; length: number; radius: number }>
}

/**
 * Splits level.glb (built in Blender, see assets-src/blender) into the parts
 * the game treats differently. Naming rules: `*_COL` are colliders,
 * `Waterfall_Sheet` is the water, `Log_*` are moving props.
 */
export function useLevelModel(): LevelModel {
  const { scene } = useGLTF(ASSETS.level, DRACO_PATH)

  return useMemo(() => {
    const visuals = new Group()
    visuals.name = 'Level_Visuals'
    const colliders: BoxCollider[] = []
    const logs: LevelModel['logs'] = {}
    let sheetGeometry: BufferGeometry | null = null

    for (const node of [...scene.children]) {
      if (node.name.endsWith('_COL')) {
        if (node.name.startsWith('Log_')) continue // logs get moving colliders in code
        const data = node.userData as Partial<BlockData>
        colliders.push({
          name: node.name.replace(/_COL$/, ''),
          position: node.position.clone(),
          quaternion: node.quaternion.clone(),
          halfExtents: [Math.abs(node.scale.x) / 2, Math.abs(node.scale.y) / 2, Math.abs(node.scale.z) / 2],
          surface: data.surface ?? 'default',
          checkpoint: data.checkpoint,
          finish: Boolean(data.finish),
        })
      } else if (node.name === 'Waterfall_Sheet') {
        sheetGeometry = (node as Mesh).geometry
      } else if (node.name.startsWith('Log_')) {
        const object = node.clone()
        object.position.set(0, 0, 0)
        object.quaternion.identity()
        logs[node.name] = { object, length: node.userData.length ?? 3, radius: node.userData.radius ?? 0.35 }
      } else {
        const copy = node.clone()
        copy.traverse((child) => {
          if ((child as Mesh).isMesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        visuals.add(copy)
      }
    }

    if (!sheetGeometry) throw new Error('level.glb is missing Waterfall_Sheet')
    return { visuals, colliders, sheetGeometry, logs }
  }, [scene])
}

useGLTF.preload(ASSETS.level, DRACO_PATH)
