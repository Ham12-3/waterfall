import { CONFIG, type SurfaceType, type Vec3 } from '../config'

/** Data attached to each block's rigid body so the player can read what it stands on. */
export interface BlockData {
  surface: SurfaceType
  /** 1-based checkpoint number; standing here saves progress. */
  checkpoint?: number
  finish?: boolean
}

export interface Block extends BlockData {
  name: string
  position: Vec3
  size: Vec3
  color: string
}

const SHORE = '#7b7f84'
const POOL_FLOOR = '#4f545b'
const CLIFF = '#676c73'
const SURFACE_COLORS: Record<SurfaceType, string> = {
  default: '#9aa0a6',
  wet: '#566979',
  moss: '#7e9a63',
}

const LEDGE_COUNT = 14
/** Ledges (0-based) that act as checkpoints. */
const CHECKPOINT_LEDGES = [3, 7, 11]

/** Zig-zag staircase of ledges climbing the cliff face. */
function buildLedges(): Block[] {
  const ledges: Block[] = []
  for (let i = 0; i < LEDGE_COUNT; i++) {
    const side = i % 4 < 2 ? -1 : 1
    const checkpointIndex = CHECKPOINT_LEDGES.indexOf(i)
    const isCheckpoint = checkpointIndex >= 0
    const surface: SurfaceType = isCheckpoint ? 'moss' : i % 3 === 1 ? 'wet' : i % 3 === 2 ? 'moss' : 'default'
    ledges.push({
      name: `Ledge_${String(i + 1).padStart(2, '0')}`,
      position: [side * (1.6 + (i % 2) * 2.6), 1 + i * 1.25, -1.7 - (i % 3) * 0.3],
      size: [isCheckpoint ? 3 : 2.6 - (i % 3) * 0.3, 0.5, 2.2],
      color: SURFACE_COLORS[surface],
      surface,
      checkpoint: isCheckpoint ? checkpointIndex + 1 : undefined,
    })
  }
  return ledges
}

const ledges = buildLedges()
const topY = ledges[ledges.length - 1].position[1]

export const GREYBOX_BLOCKS: Block[] = [
  { name: 'Shore', position: [0, -0.5, 12], size: [40, 1, 16], color: SHORE, surface: 'default' },
  { name: 'Pool_Floor', position: [0, -2.5, -0.5], size: [40, 1, 9], color: POOL_FLOOR, surface: 'default' },
  { name: 'Cliff_Main', position: [0, topY / 2 - 1, -6], size: [40, topY + 4, 6], color: CLIFF, surface: 'default' },
  // Rock banks that close off the pool on either side of the water.
  { name: 'Bank_L', position: [-16.5, -1.25, 0.5], size: [7, 2.5, 7], color: SHORE, surface: 'default' },
  { name: 'Bank_R', position: [16.5, -1.25, 0.5], size: [7, 2.5, 7], color: SHORE, surface: 'default' },
  { name: 'Stone_01', position: [0.4, -0.1, 2.3], size: [1.7, 0.6, 1.7], color: SURFACE_COLORS.wet, surface: 'wet' },
  { name: 'Stone_02', position: [-0.9, 0.2, 0.2], size: [1.7, 0.6, 1.7], color: SURFACE_COLORS.moss, surface: 'moss' },
  ...ledges,
  {
    name: 'Summit',
    position: [0, topY + 1.25, -5],
    size: [10, 0.5, 5],
    color: SURFACE_COLORS.default,
    surface: 'default',
    finish: true,
  },
]

/** The main falling sheet, hung just in front of the cliff face. */
export const WATERFALL = {
  width: 12,
  topY: topY + 1.6,
  bottomY: CONFIG.level.waterY,
  /** Z of the sheet's top edge, just clear of the summit's front. */
  z: -2.4,
}

export interface WaterColumn {
  x: number
  z: number
  topY: number
  bottomY: number
}

/** A column pours from the underside of the ledge four above onto `lower`. */
function columnOnto(lowerIndex: number): WaterColumn {
  const lower = ledges[lowerIndex]
  const upper = ledges[lowerIndex + 4]
  const outward = Math.sign(lower.position[0])
  return {
    x: lower.position[0] + outward * (lower.size[0] / 2 - CONFIG.waterColumn.radius + 0.1),
    z: lower.position[2] + 0.2,
    topY: upper.position[1] - upper.size[1] / 2,
    bottomY: lower.position[1] + lower.size[1] / 2,
  }
}

export const WATER_COLUMNS: WaterColumn[] = [columnOnto(5), columnOnto(9)]

/** Pool water rectangle, between the shore and the cliff face. */
export const POOL = { center: [0, CONFIG.level.waterY, 0.5] as Vec3, size: [26, 7] as [number, number] }

const standHeight = CONFIG.player.halfHeight + CONFIG.player.radius + 0.3

/** Respawn points. Index 0 is the start; the rest sit on top of checkpoint ledges. */
export const RESPAWN_POINTS: Vec3[] = [
  CONFIG.player.spawn,
  ...ledges
    .filter((l) => l.checkpoint !== undefined)
    .map((l): Vec3 => [l.position[0], l.position[1] + l.size[1] / 2 + standHeight, l.position[2] + 0.2]),
]

export const CHECKPOINT_COUNT = CHECKPOINT_LEDGES.length
export const SUMMIT_HEIGHT = topY + 1.5
