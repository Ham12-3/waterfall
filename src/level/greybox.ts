import type { Vec3 } from '../config'

export interface Block {
  name: string
  position: Vec3
  size: Vec3
  color: string
}

const GROUND = '#6f7378'
const CLIFF = '#676c73'
const LEDGE = '#9aa0a6'

/** Zig-zag staircase of ledges climbing the cliff face. */
function buildLedges(): Block[] {
  const ledges: Block[] = []
  const count = 14
  for (let i = 0; i < count; i++) {
    const side = i % 4 < 2 ? -1 : 1
    const x = side * (1.6 + (i % 2) * 2.6)
    const y = 1 + i * 1.25
    const z = -1.5 - (i % 3) * 0.9
    const width = 2.6 - (i % 3) * 0.3
    ledges.push({
      name: `Ledge_${String(i + 1).padStart(2, '0')}`,
      position: [x, y, z],
      size: [width, 0.5, 2.2],
      color: LEDGE,
    })
  }
  return ledges
}

const ledges = buildLedges()
const topY = ledges[ledges.length - 1].position[1]

export const GREYBOX_BLOCKS: Block[] = [
  { name: 'Ground', position: [0, -0.5, 4], size: [40, 1, 30], color: GROUND },
  { name: 'Cliff_Main', position: [0, topY / 2, -6], size: [26, topY + 2, 6], color: CLIFF },
  ...ledges,
  { name: 'Summit', position: [0, topY + 1.25, -5], size: [10, 0.5, 5], color: LEDGE },
]

export const SUMMIT_HEIGHT = topY + 1.5
