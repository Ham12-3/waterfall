import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Object3D, type InstancedMesh } from 'three'
import { CONFIG } from '../../config'
import { WATERFALL, WATER_COLUMNS } from '../../level/greybox'
import { sprayBursts } from '../../state/effects'

const S = CONFIG.spray
const F = CONFIG.waterfall
const rand = (min: number, max: number) => min + Math.random() * (max - min)

/**
 * One instanced mesh for every spray droplet: the constant churn along the
 * foot of the fall and under each column, plus gameplay bursts.
 */
export function Spray() {
  const mesh = useRef<InstancedMesh>(null)
  const dummy = useMemo(() => new Object3D(), [])
  const sim = useMemo(
    () => ({
      pos: new Float32Array(S.count * 3),
      vel: new Float32Array(S.count * 3),
      life: new Float32Array(S.count),
      maxLife: new Float32Array(S.count).fill(1),
      next: 0,
      baseDebt: 0,
      columnDebt: 0,
    }),
    [],
  )

  const spawn = (x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number) => {
    const i = sim.next
    sim.next = (i + 1) % S.count
    sim.pos.set([x, y, z], i * 3)
    sim.vel.set([vx, vy, vz], i * 3)
    sim.life[i] = sim.maxLife[i] = life
  }

  useFrame((_, rawDt) => {
    const inst = mesh.current
    if (!inst) return
    const dt = Math.min(rawDt, 1 / 30)

    // Constant spray along the foot of the main fall.
    sim.baseDebt += S.baseRate * WATERFALL.width * dt
    while (sim.baseDebt >= 1) {
      sim.baseDebt -= 1
      const u = rand(-1, 1)
      const z = WATERFALL.z + F.lean + F.bulge * (1 - u * u)
      spawn((u * WATERFALL.width) / 2, WATERFALL.bottomY, z, rand(-0.8, 0.8), rand(1.5, 4.5), rand(0.3, 2.4), rand(0.5, 1))
    }

    // Splatter where each column hits its ledge.
    sim.columnDebt += S.columnRate * dt
    while (sim.columnDebt >= 1) {
      sim.columnDebt -= 1
      for (const c of WATER_COLUMNS) {
        const angle = rand(0, Math.PI * 2)
        const out = rand(0.8, 2.2)
        spawn(c.x, c.bottomY + 0.05, c.z, Math.cos(angle) * out, rand(1.2, 3), Math.sin(angle) * out, rand(0.35, 0.7))
      }
    }

    // Gameplay bursts (landings, pool splashes).
    for (const b of sprayBursts.splice(0)) {
      for (let k = 0; k < b.count; k++) {
        const angle = rand(0, Math.PI * 2)
        const out = rand(0.3, 1) * b.speed
        spawn(b.x, b.y, b.z, Math.cos(angle) * out, rand(0.6, 1.2) * b.speed, Math.sin(angle) * out, rand(0.4, 0.8))
      }
    }

    for (let i = 0; i < S.count; i++) {
      const j = i * 3
      if (sim.life[i] > 0) {
        sim.life[i] -= dt
        sim.vel[j + 1] += S.gravity * dt
        sim.pos[j] += sim.vel[j] * dt
        sim.pos[j + 1] += sim.vel[j + 1] * dt
        sim.pos[j + 2] += sim.vel[j + 2] * dt
      }
      const alive = sim.life[i] > 0
      dummy.position.set(sim.pos[j], sim.pos[j + 1], sim.pos[j + 2])
      // Droplets shrink as they age; dead ones collapse to nothing.
      dummy.scale.setScalar(alive ? S.size * (0.4 + 0.6 * (sim.life[i] / sim.maxLife[i])) : 0)
      dummy.updateMatrix()
      inst.setMatrixAt(i, dummy.matrix)
    }
    inst.instanceMatrix.needsUpdate = true
  })

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, S.count]} frustumCulled={false} renderOrder={6}>
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} />
    </instancedMesh>
  )
}
