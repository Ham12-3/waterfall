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
    splashDuration: 0.9,
    /** Width and height of the splash flipbook quad, in metres. */
    splashSize: [4.6, 2.3] as [number, number],
  },
  /** Light haze; the colour matches the horizon of the sky panorama. */
  fog: { color: '#d8cbc6', near: 45, far: 160 },
  /** Directional light position; the pool glint uses the same direction. */
  sunPosition: [12, 30, 14] as Vec3,
  /** Starting values for the waterfall shader; live-tunable in leva (dev only). */
  waterfall: {
    speed: 1.3,
    color: '#8fd0e6',
    deepColor: '#2f7fa6',
    foam: 0.55,
    opacity: 0.8,
    /** Vertex ripple depth in metres. */
    wobble: 0.14,
    /** How far the middle of the sheet bulges out from the cliff. */
    bulge: 0.35,
    /** How far the bottom of the sheet has drifted out from the top. */
    lean: 0.7,
  },
  /** Heavy columns of water that shove the player around. */
  waterColumn: {
    radius: 0.55,
    /** Downward acceleration while inside, m/s². */
    push: 22,
    /** Speed the column carries the player away from the cliff, m/s. */
    drift: 2.5,
    /** Jump speed is multiplied by this while inside. */
    jumpMultiplier: 0.75,
  },
  pool: {
    shallowColor: '#4f9db8',
    deepColor: '#1d5673',
    skyColor: '#cfe2ec',
    rippleStrength: 0.16,
  },
  mist: {
    count: 36,
    color: '#eef6f9',
    /** Low, because blending happens in linear light under the post-processing composer. */
    opacity: 0.045,
    minSize: 4,
    maxSize: 9,
  },
  post: {
    bloomIntensity: 0.2,
    /** Only pixels brighter than this bloom (the white water and sky). */
    bloomThreshold: 0.92,
    depthOfField: true,
    bokehScale: 2.2,
    /** Depth of the in-focus band around the player, in metres. */
    focusRange: 26,
    vignetteDarkness: 0.55,
    multisampling: 4,
  },
  audio: {
    masterVolume: 0.8,
    pausedVolume: 0.2,
    /** Waterfall roar level and low-pass cutoff (Hz), far from and next to the falls. */
    roarFarGain: 0.12,
    roarNearGain: 0.75,
    roarFarCutoff: 500,
    roarNearCutoff: 4200,
    /** Distance in metres at which the roar is halfway to its far level. */
    roarFalloff: 5,
    splashGain: 0.9,
    landGain: 0.5,
  },
  spray: {
    /** Size of the shared particle pool. */
    count: 280,
    /** Particles per second per metre along the base of the fall. */
    baseRate: 9,
    /** Particles per second at the foot of each water column. */
    columnRate: 22,
    gravity: -12,
    size: 0.07,
    /** Particles thrown up when landing on wet stone / falling in the pool. */
    landingBurst: 14,
    poolBurst: 40,
  },
} as const
