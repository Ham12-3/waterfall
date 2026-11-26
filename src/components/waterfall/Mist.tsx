import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferAttribute, BufferGeometry, type PerspectiveCamera } from 'three'
import { CONFIG } from '../../config'
import { WATERFALL } from '../../level/greybox'
import { createSpriteMaterial } from './materials'

const M = CONFIG.mist
const rand = (min: number, max: number) => min + Math.random() * (max - min)
const BASE_Z = WATERFALL.z + CONFIG.waterfall.lean

/** Soft sprites that rise and drift off the base of the fall, fading in and out. */
export function Mist() {
  const material = useMemo(() => createSpriteMaterial(M.color, M.opacity), [])
  const { geometry, puffs } = useMemo(() => {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(M.count * 3), 3))
    geometry.setAttribute('aSize', new BufferAttribute(new Float32Array(M.count), 1))
    geometry.setAttribute('aAlpha', new BufferAttribute(new Float32Array(M.count), 1))
    const puffs = Array.from({ length: M.count }, () => ({ age: 0, life: 1, rise: 0, drift: 0 }))
    return { geometry, puffs }
  }, [])

  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const respawn = (i: number, startAge: number) => {
    const position = geometry.attributes.position as BufferAttribute
    // Most mist hugs the pool; some hangs higher up the face.
    const high = Math.random() < 0.25
    position.setXYZ(
      i,
      rand(-WATERFALL.width / 2 + 0.5, WATERFALL.width / 2 - 0.5),
      high ? rand(WATERFALL.bottomY + 3, WATERFALL.topY - 2) : rand(WATERFALL.bottomY, WATERFALL.bottomY + 2.5),
      high ? rand(BASE_Z - 0.4, BASE_Z + 0.8) : rand(BASE_Z, BASE_Z + 3.5),
    )
    ;(geometry.attributes.aSize as BufferAttribute).setX(i, rand(M.minSize, M.maxSize) * (high ? 0.7 : 1))
    const puff = puffs[i]
    puff.life = rand(6, 12)
    puff.age = startAge * puff.life
    puff.rise = rand(0.2, 0.55)
    puff.drift = rand(0.05, 0.3)
  }

  useEffect(() => {
    // Start mid-life at random so the mist is already there on the first frame.
    for (let i = 0; i < M.count; i++) respawn(i, Math.random())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 30)
    const position = geometry.attributes.position as BufferAttribute
    const alpha = geometry.attributes.aAlpha as BufferAttribute
    for (let i = 0; i < M.count; i++) {
      const puff = puffs[i]
      puff.age += dt
      if (puff.age >= puff.life) respawn(i, 0)
      position.setY(i, position.getY(i) + puff.rise * dt)
      position.setZ(i, position.getZ(i) + puff.drift * dt)
      alpha.setX(i, Math.sin((Math.PI * puff.age) / puff.life))
    }
    position.needsUpdate = true
    alpha.needsUpdate = true
    geometry.attributes.aSize.needsUpdate = true

    const camera = state.camera as PerspectiveCamera
    const pixels = state.size.height * state.viewport.dpr
    material.uniforms.uPixelScale.value = pixels / (2 * Math.tan((camera.fov * Math.PI) / 360))
  })

  return <points geometry={geometry} material={material} frustumCulled={false} renderOrder={5} />
}
