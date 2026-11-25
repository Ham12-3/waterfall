/** One-off spray bursts requested by gameplay; the Spray component drains this queue. */
export interface SprayBurst {
  x: number
  y: number
  z: number
  count: number
  /** Launch speed in m/s. */
  speed: number
}

export const sprayBursts: SprayBurst[] = []

export function emitSpray(x: number, y: number, z: number, count: number, speed: number) {
  sprayBursts.push({ x, y, z, count, speed })
}
