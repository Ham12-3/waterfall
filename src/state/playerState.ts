import type { RapierRigidBody } from '@react-three/rapier'
import { Vector3 } from 'three'
import { CONFIG, type SurfaceType } from '../config'

/**
 * Per-frame player data shared between components without React re-renders.
 * Player writes it; CameraRig, HUD and effects read it.
 */
export const playerState = {
  position: new Vector3(...CONFIG.player.spawn),
  velocity: new Vector3(),
  grounded: false,
  /** True while a heavy water column is pressing on the player. */
  inColumn: false,
  surface: 'default' as SurfaceType,
  /** The player's physics body, so camera rays can ignore it. */
  body: null as RapierRigidBody | null,
  /** Camera shake strength in metres; CameraRig decays it. */
  shake: 0,
  /** Latest landing, for audio. `id` increases on every touchdown. */
  landing: { id: 0, impact: 0, wet: false },
  /** Latest pool splash. `id` increases each time so effects can spot a new one. */
  splash: { id: 0, position: new Vector3() },
}
