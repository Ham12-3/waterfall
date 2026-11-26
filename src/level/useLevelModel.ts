import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import {
  Group,
  Mesh,
  Quaternion,
  Vector2,
  Vector3,
  type BufferGeometry,
  type Material,
  type MeshStandardMaterial,
  type Object3D,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { ASSETS, DRACO_PATH } from '../assets'
import { CONFIG } from '../config'
import { normalFromAlbedo } from '../utils/normalFromAlbedo'
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
 * Gives each level material surface relief (a normal map derived from its own
 * colour texture) and a response to the sky lighting. Wet rock is made glossy
 * so it mirrors the sky; moss and dry rock stay matt.
 */
function enhanceMaterials(scene: Object3D) {
  const done = new Set<Material>()
  scene.traverse((child) => {
    const material = (child as Mesh).material as MeshStandardMaterial | undefined
    if (!material || !material.isMeshStandardMaterial || done.has(material)) return
    done.add(material)
    const look = Object.entries(CONFIG.surfaceLook).find(([key]) => material.name.includes(key))?.[1]
    if (!look) return
    material.roughness = look.roughness
    material.color.set(look.tint)
    material.envMapIntensity = look.reflect
    if (material.map && !material.normalMap) {
      material.map.anisotropy = 8
      const normalMap = normalFromAlbedo(material.map, look.relief)
      if (normalMap) {
        material.normalMap = normalMap
        material.normalScale = new Vector2(1, 1)
      }
    }
    material.needsUpdate = true
  })
}

/**
 * Splits level.glb (built in Blender, see assets-src/blender) into the parts
 * the game treats differently. Naming rules: `*_COL` are colliders,
 * `Waterfall_Sheet` is the water, `Log_*` are moving props.
 */
export function useLevelModel(): LevelModel {
  const { scene } = useGLTF(ASSETS.level, DRACO_PATH)

  return useMemo(() => {
    enhanceMaterials(scene)
    const visuals = new Group()
    visuals.name = 'Level_Visuals'
    // Static geometry is baked into world space and grouped by material, so the
    // whole level draws in one call per material instead of one per rock.
    const byMaterial = new Map<Material, BufferGeometry[]>()
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
        node.updateWorldMatrix(true, true)
        node.traverse((child) => {
          const mesh = child as Mesh
          if (!mesh.isMesh) return
          const baked = mesh.geometry.clone().applyMatrix4(mesh.matrixWorld)
          const material = mesh.material as Material
          const list = byMaterial.get(material)
          if (list) list.push(baked)
          else byMaterial.set(material, [baked])
        })
      }
    }

    for (const [material, geometries] of byMaterial) {
      const merged = mergeGeometries(geometries, false)
      geometries.forEach((g) => g.dispose())
      if (!merged) throw new Error(`Could not merge level geometry for material ${material.name}`)
      const mesh = new Mesh(merged, material)
      mesh.name = `Level_${material.name}`
      mesh.castShadow = true
      mesh.receiveShadow = true
      visuals.add(mesh)
    }

    if (!sheetGeometry) throw new Error('level.glb is missing Waterfall_Sheet')
    return { visuals, colliders, sheetGeometry, logs }
  }, [scene])
}

useGLTF.preload(ASSETS.level, DRACO_PATH)
