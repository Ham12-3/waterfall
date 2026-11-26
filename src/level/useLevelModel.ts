import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import {
  DoubleSide,
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
const isFoliage = (material: Material) => /fern|anthurium|Tree/i.test(material.name)

/** Animation clock for level shader effects; Waterfall advances it every frame. */
export const levelTime = { value: 0 }

/**
 * Underwater treatment for the pool bed: a darker, greener tint below the
 * surface and moving caustics, the bright wavy lines sunlight makes when it is
 * focused by ripples. Above the water line the material is left alone.
 */
function addCaustics(material: MeshStandardMaterial) {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCausticTime = levelTime
    shader.uniforms.uWaterY = { value: CONFIG.level.waterY }
    shader.uniforms.uCausticStrength = { value: CONFIG.pool.caustics }
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCausticWorld;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCausticWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;')
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vCausticWorld;
        uniform float uCausticTime;
        uniform float uWaterY;
        uniform float uCausticStrength;
        float causticLines(vec2 q, float t) {
          float a = 1.0 - abs(sin(q.x * 2.1 + sin(q.y * 1.7 + t * 0.9) * 1.3 + t * 0.6));
          float b = 1.0 - abs(sin(q.y * 2.4 + sin(q.x * 1.9 - t * 0.7) * 1.4 - t * 0.5));
          float c = 1.0 - abs(sin((q.x + q.y) * 1.6 + sin(q.x * 1.3 + t * 0.8) * 1.2));
          return pow(a, 7.0) + pow(b, 7.0) + pow(c, 9.0) * 0.6;
        }`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        float underwater = smoothstep(uWaterY + 0.05, uWaterY - 0.35, vCausticWorld.y);
        diffuseColor.rgb *= mix(vec3(1.0), vec3(0.55, 0.78, 0.72), underwater);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * causticLines(vCausticWorld.xz * 0.85, uCausticTime) * uCausticStrength * underwater;`,
      )
  }
  material.customProgramCacheKey = () => 'pool-floor-caustics'
}

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
    if ('glow' in look && material.map) {
      // Pre-lit cards (the tree renders) keep some of their own brightness in shade.
      material.emissiveMap = material.map
      material.emissive.set('#ffffff')
      material.emissiveIntensity = look.glow
    }
    if (material.name.includes('PoolFloor')) addCaustics(material)
    if (isFoliage(material)) {
      // Leaves are cut out by alpha and seen from both sides.
      material.transparent = false
      material.alphaTest = 0.5
      material.side = DoubleSide
    }
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
      // Plants skip the shadow pass: 40,000 thin triangles for little visible gain.
      mesh.castShadow = !isFoliage(material)
      mesh.receiveShadow = true
      visuals.add(mesh)
    }

    if (!sheetGeometry) throw new Error('level.glb is missing Waterfall_Sheet')
    return { visuals, colliders, sheetGeometry, logs }
  }, [scene])
}

useGLTF.preload(ASSETS.level, DRACO_PATH)
