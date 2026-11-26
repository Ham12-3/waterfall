import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial, useTexture } from '@react-three/drei'
import { useControls } from 'leva'
import { RepeatWrapping, SRGBColorSpace, Vector3, type Color } from 'three'
import { ASSETS } from '../../assets'
import { CONFIG } from '../../config'
import { POOL, WATERFALL, WATER_COLUMNS } from '../../level/greybox'
import { levelTime, useLevelModel } from '../../level/useLevelModel'
import { createFallMaterial, createFoamMaterial, createPoolMaterial } from './materials'
import { Mist } from './Mist'
import { Spray } from './Spray'

const F = CONFIG.waterfall
const FOAM_DEPTH = 4.6

/** The real-time waterfall: sheet, columns, base foam, pool, spray and mist. */
export function Waterfall() {
  const controls = useControls(
    'Waterfall',
    {
      speed: { value: F.speed, min: 0, max: 4, step: 0.05 },
      color: F.color,
      deepColor: F.deepColor,
      foam: { value: F.foam, min: 0, max: 1, step: 0.01 },
      opacity: { value: F.opacity, min: 0, max: 1, step: 0.01 },
      wobble: { value: F.wobble, min: 0, max: 0.5, step: 0.01 },
      reflections: { value: false, label: 'pool reflections' },
    },
    { collapsed: true },
  )

  const foamMask = useTexture(ASSETS.foamMask)
  foamMask.wrapS = foamMask.wrapT = RepeatWrapping
  const sky = useTexture(ASSETS.sky)
  sky.colorSpace = SRGBColorSpace

  // The curved sheet mesh is modelled in Blender, with UVs running top to bottom.
  const { sheetGeometry, colliders } = useLevelModel()
  // Rocks standing in the pool, as (x, z, radius), for ripples and foam collars.
  const poolRocks = useMemo(
    () =>
      colliders
        .filter((c) => c.name.startsWith('Stone_') || c.name.startsWith('PoolRock_'))
        .map((c) => new Vector3(c.position.x, c.position.z, Math.max(c.halfExtents[0], c.halfExtents[2]) * 1.25)),
    [colliders],
  )
  const materials = useMemo(
    () => ({
      sheet: createFallMaterial([30, 5], 0.07),
      // A second, thinner layer in front: its different pattern sliding over
      // the main sheet gives the fall depth.
      veil: createFallMaterial([19, 3.6], 0.1, 37.0, 0.42),
      column: createFallMaterial([7, 2.2], 0.16, 11.0),
      foam: createFoamMaterial(foamMask),
      pool: createPoolMaterial(sky, WATERFALL.z + F.lean, POOL.center[2] + POOL.size[1] / 2, POOL.size[0] / 2, poolRocks),
    }),
    [foamMask, sky, poolRocks],
  )

  useEffect(() => () => Object.values(materials).forEach((m) => m.dispose()), [materials])

  // Push leva values into the shader uniforms.
  useEffect(() => {
    for (const fall of [materials.sheet, materials.veil, materials.column]) {
      const u = fall.uniforms
      u.uSpeed.value = controls.speed
      ;(u.uColor.value as Color).set(controls.color)
      ;(u.uDeepColor.value as Color).set(controls.deepColor)
      u.uFoam.value = controls.foam
      u.uOpacity.value = controls.opacity
      u.uWobble.value = controls.wobble
    }
    materials.foam.uniforms.uSpeed.value = controls.speed
    materials.foam.uniforms.uFoam.value = controls.foam
  }, [controls, materials])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    materials.sheet.uniforms.uTime.value = t
    materials.veil.uniforms.uTime.value = t * 1.12
    materials.column.uniforms.uTime.value = t
    materials.foam.uniforms.uTime.value = t
    materials.pool.uniforms.uTime.value = t
    levelTime.value = t
  })

  const radius = CONFIG.waterColumn.radius
  const foamZ = WATERFALL.z + F.lean + FOAM_DEPTH / 2 - 0.5

  return (
    <group name="Waterfall">
      <mesh name="Pool_Water" position={POOL.center} rotation-x={-Math.PI / 2} renderOrder={1}>
        <planeGeometry args={POOL.size} />
        {controls.reflections ? (
          <MeshReflectorMaterial
            color={CONFIG.pool.shallowColor}
            mirror={0.6}
            resolution={512}
            blur={[200, 60]}
            mixBlur={1}
            mixStrength={1.2}
            roughness={0.25}
            metalness={0.2}
          />
        ) : (
          <primitive object={materials.pool} attach="material" />
        )}
      </mesh>

      <mesh
        name="Waterfall_Foam"
        position={[0, WATERFALL.bottomY + 0.03, foamZ]}
        rotation-x={-Math.PI / 2}
        material={materials.foam}
        renderOrder={2}
      >
        <planeGeometry args={[WATERFALL.width + 2, FOAM_DEPTH]} />
      </mesh>

      <mesh
        name="Waterfall_Sheet"
        geometry={sheetGeometry}
        material={materials.sheet}
        renderOrder={3}
      />
      <mesh
        name="Waterfall_Veil"
        geometry={sheetGeometry}
        material={materials.veil}
        position={[0, 0, 0.22]}
        renderOrder={4}
      />

      {WATER_COLUMNS.map((column, i) => {
        const height = column.topY - column.bottomY
        return (
          <mesh
            key={i}
            name={`Water_Column_${i + 1}`}
            position={[column.x, column.bottomY + height / 2, column.z]}
            material={materials.column}
            renderOrder={4}
          >
            <cylinderGeometry args={[radius * 0.85, radius * 1.1, height, 14, 12, true]} />
          </mesh>
        )
      })}

      <Mist />
      <Spray />
    </group>
  )
}
