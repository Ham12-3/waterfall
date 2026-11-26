import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, type PerspectiveCamera } from 'three'
import { CONFIG } from '../../config'
import { GREYBOX_BLOCKS, WATERFALL, WATER_COLUMNS } from '../../level/greybox'
import { sprayBursts } from '../../state/effects'
import { createSpriteMaterial } from './materials'

const S = CONFIG.spray
const F = CONFIG.waterfall
const rand = (min: number, max: number) => min + Math.random() * (max - min)
/** Ledges the falling sheet lands on: the water bursts into spray along their backs. */
const LEDGES = GREYBOX_BLOCKS.filter((b) => b.name.startsWith('Ledge_'))

/**
 * Every spray droplet in one draw call of soft point sprites: the constant
 * churn along the foot of the fall and under each column, plus gameplay
 * bursts. Droplets start small and bright and swell into faint mist as they age.
 */
export function Spray() {
  const material = useMemo(() => createSpriteMaterial('#ffffff', S.opacity), [])
  const { geometry, sim } = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(S.count * 3), 3))
    geometry.setAttribute('aSize', new BufferAttribute(new Float32Array(S.count), 1))
    geometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(S.count), 1))
    const sim = {
      vel: new Float32Array(S.count * 3),
      life: new Float32Array(S.count),
      maxLife: new Float32Array(S.count).fill(1),
      size: new Float32Array(S.count),
      next: 0,
      baseDebt: 0,
      columnDebt: 0,
      ledgeDebt: 0,
    }
    return { geometry, sim }
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const spawn = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number) => {
    const i = sim.next
    sim.next = (i + 1) % S.count
    ;(geometry.attributes.position as BufferAttribute).setXYZ(i, x, y, z)
    sim.vel.set([vx, vy, vz], i * 3)
    sim.life[i] = sim.maxLife[i] = life
    sim.size[i] = size
  }

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const position = geometry.attributes.position as BufferAttribute
    const size = geometry.attributes.aSize as BufferAttribute
    const alpha = geometry.attributes.aAlpha as BufferAttribute

    // Constant spray along the foot of the main fall.
    sim.baseDebt += S.baseRate * WATERFALL.width * dt
    while (sim.baseDebt >= 1) {
      sim.baseDebt -= 1
      const u = rand(-1, 1)
      const z = WATERFALL.z + F.lean + F.bulge * (1 - u * u)
      spawn((u * WATERFALL.width) / 2, WATERFALL.bottomY, z, rand(-0.9, 0.9), rand(1.2, 4.8), rand(0.2, 2.6), rand(0.6, 1.3), rand(S.minSize, S.maxSize))
    }

    // Splatter where each column hits its ledge.
    sim.columnDebt += S.columnRate * dt
    while (sim.columnDebt >= 1) {
      sim.columnDebt -= 1
      for (const c of WATER_COLUMNS) {
        const angle = rand(0, Math.PI * 2)
        const out = rand(0.8, 2.2)
        spawn(c.x, c.bottomY + 0.05, c.z, Math.cos(angle) * out, rand(1.2, 3), Math.sin(angle) * out, rand(0.4, 0.8), rand(S.minSize, S.maxSize) * 0.8)
      }
    }

    // The sheet breaking over the back of each ledge.
    sim.ledgeDebt += S.ledgeRate * LEDGES.length * dt
    while (sim.ledgeDebt >= 1) {
      sim.ledgeDebt -= 1
      const ledge = LEDGES[Math.floor(Math.random() * LEDGES.length)]
      const [lx, ly, lz] = ledge.position
      const x = lx + rand(-0.5, 0.5) * ledge.size[0]
      const z = Math.max(lz - ledge.size[2] / 2, WATERFALL.z) + 0.25
      spawn(x, ly + ledge.size[1] / 2 + 0.05, z, rand(-0.6, 0.6), rand(0.8, 2.4), rand(0.4, 1.8), rand(0.4, 0.8), rand(S.minSize, S.maxSize) * 0.8)
    }

    // Gameplay bursts (landings, pool splashes).
    for (const b of sprayBursts.splice(0)) {
      for (let k = 0; k < b.count; k++) {
        const angle = rand(0, Math.PI * 2)
        const out = rand(0.3, 1) * b.speed
        spawn(b.x, b.y, b.z, Math.cos(angle) * out, rand(0.6, 1.2) * b.speed, Math.sin(angle) * out, rand(0.45, 0.9), rand(S.minSize, S.maxSize))
      }
    }

    const drag = Math.exp(-S.drag * dt)
    for (let i = 0; i < S.count; i++) {
      if (sim.life[i] <= 0) {
        alpha.setX(i, 0)
        continue
      }
      sim.life[i] -= dt
      const j = i * 3
      // Air drag slows droplets quickly, so they hang as mist instead of arcing like pebbles.
      sim.vel[j] *= drag
      sim.vel[j + 2] *= drag
      sim.vel[j + 1] = sim.vel[j + 1] * drag + S.gravity * dt
      position.setXYZ(i, position.getX(i) + sim.vel[j] * dt, position.getY(i) + sim.vel[j + 1] * dt, position.getZ(i) + sim.vel[j + 2] * dt)
      const age = 1 - Math.max(0, sim.life[i]) / sim.maxLife[i]
      size.setX(i, sim.size[i] * (1 + age * S.growth))
      alpha.setX(i, Math.min(1, age * 8) * (1 - age) ** 1.5)
    }
    position.needsUpdate = true
    size.needsUpdate = true
    alpha.needsUpdate = true

    const camera = state.camera as PerspectiveCamera
    material.uniforms.uPixelScale.value = (state.size.height * state.viewport.dpr) / (2 * Math.tan((camera.fov * Math.PI) / 360))
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={6} />
}
