import { Vector3 } from 'three'
import { CONFIG } from '../config'

/**
 * Per-frame player data shared between components without React re-renders.
 * Player writes it; CameraRig and HUD read it.
 */
export const playerState = {
  position: new Vector3(...CONFIG.player.spawn),
  velocity: new Vector3(),
  grounded: false,
}
