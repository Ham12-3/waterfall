/** Every tunable number in the game lives here. */
export type Vec3 = [number, number, number]

export const CONFIG = {
  physics: {
    gravity: -25,
  },
  player: {
    radius: 0.35,
    /** Half the length of the capsule's straight section. */
    halfHeight: 0.5,
    runSpeed: 6,
    sprintSpeed: 9.5,
    /** How fast horizontal velocity reaches the target, in m/s². */
    groundAccel: 60,
    airAccel: 18,
    jumpSpeed: 9.5,
    /** Upward speed is multiplied by this when Space is released early. */
    jumpCutMultiplier: 0.45,
    /** Extra ray length below the feet that still counts as grounded. */
    groundProbe: 0.12,
    turnSpeed: 14,
    spawn: [0, 1.5, 8] as Vec3,
    /** Falling below this height sends the player back to spawn. */
    killY: -12,
  },
  camera: {
    fov: 55,
    startOffset: [0, 4, 9] as Vec3,
    /** Height above the capsule centre that the camera looks at. */
    targetHeight: 0.6,
    minDistance: 4,
    maxDistance: 18,
    maxPolarAngle: Math.PI * 0.55,
  },
} as const
