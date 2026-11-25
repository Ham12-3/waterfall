import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshReflectorMaterial } from '@react-three/drei'
import { useControls } from 'leva'
import { PlaneGeometry, type Color } from 'three'
import { CONFIG } from '../../config'
import { POOL, WATERFALL, WATER_COLUMNS } from '../../level/greybox'
import { createFallMaterial, createFoamMaterial, createPoolMaterial } from './materials'
import { Mist } from './Mist'
import { Spray } from './Spray'

const F = CONFIG.waterfall
const HEIGHT = WATERFALL.topY - WATERFALL.bottomY
const FOAM_DEPTH = 3.4

/**
 * The falling sheet: a plane curved out from the cliff in the middle and
 * leaning outward towards the bottom. UVs run cleanly top to bottom.
 */
function buildSheetGeometry() {
  const geometry = new PlaneGeometry(WATERFALL.width, HEIGHT, 40, 48)
  const position = geometry.attributes.position
  for (let i = 0; i < position.count; i++) {
    const u = position.getX(i) / (WATERFALL.width / 2)
    const fromTop = 0.5 - position.getY(i) / HEIGHT
    position.setZ(i, F.bulge * (1 - u * u) + F.lean * fromTop * fromTop)
  }
  geometry.computeVertexNormals()
  return geometry
}

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

  const sheetGeometry = useMemo(buildSheetGeometry, [])
  const materials = useMemo(
    () => ({
      sheet: createFallMaterial([30, 5], 0.06),
      column: createFallMaterial([7, 2.2], 0.16),
      foam: createFoamMaterial(),
      pool: createPoolMaterial(),
    }),
    [],
  )

  useEffect(
    () => () => {
      sheetGeometry.dispose()
      Object.values(materials).forEach((m) => m.dispose())
    },
    [sheetGeometry, materials],
  )

  // Push leva values into the shader uniforms.
  useEffect(() => {
    for (const fall of [materials.sheet, materials.column]) {
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
    materials.column.uniforms.uTime.value = t
    materials.foam.uniforms.uTime.value = t
    materials.pool.uniforms.uTime.value = t
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
        position={[0, WATERFALL.bottomY + HEIGHT / 2, WATERFALL.z]}
        renderOrder={3}
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
