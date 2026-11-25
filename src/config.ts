/** Every tunable number in the game lives here. */
export type Vec3 = [number, number, number]
export type SurfaceType = 'default' | 'wet' | 'moss'

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
    airAccel: 18,
    jumpSpeed: 9.5,
    /** Upward speed is multiplied by this when Space is released early. */
    jumpCutMultiplier: 0.45,
    /** Seconds after leaving a ledge during which a jump still works. */
    coyoteTime: 0.12,
    /** Seconds a jump press is remembered before landing. */
    jumpBuffer: 0.12,
    /** Extra ray length below the feet that still counts as grounded. */
    groundProbe: 0.12,
    turnSpeed: 14,
    spawn: [0, 1.2, 9] as Vec3,
    /** Landing squash: amount per m/s of impact, cap, and recovery rate. */
    squashPerSpeed: 0.022,
    squashMax: 0.38,
    squashRecovery: 9,
  },
  /**
   * Ground handling per surface, in m/s². `accel` is speeding up, `brake` is
   * slowing down or reversing. A low brake makes the surface slippery.
   */
  surfaces: {
    default: { accel: 60, brake: 60 },
    wet: { accel: 22, brake: 12 },
    moss: { accel: 90, brake: 90 },
  } satisfies Record<SurfaceType, { accel: number; brake: number }>,
  level: {
    /** Height of the plunge pool surface. */
    waterY: -0.5,
    /** How far below the surface the player sinks before respawning. */
    sinkDepth: 0.35,
    /** Safety net if the player somehow leaves the level. */
    killY: -15,
  },
  camera: {
    fov: 55,
    /** Height above the capsule centre that the camera looks at. */
    targetHeight: 1.0,
    distance: 10,
    minDistance: 3.5,
    maxDistance: 16,
    startPitch: 0.32,
    minPitch: -0.5,
    maxPitch: 1.35,
    /** Radians of orbit per pixel of mouse drag. */
    orbitSensitivity: 0.005,
    zoomSensitivity: 0.008,
    /** Follow spring stiffness; damping is critical. */
    springStiffness: 90,
    /** Gap kept between the camera and any wall behind it. */
    wallMargin: 0.35,
    /** How fast the camera eases back out after a wall, per second. */
    zoomOutRate: 4,
    /** Landing faster than this (m/s) shakes the camera. */
    shakeThreshold: 15,
    shakeMax: 0.45,
    shakeDecay: 6,
  },
  effects: {
    splashDuration: 0.7,
    splashRadius: 2.6,
  },
} as const
