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
  /**
   * Low morning sun, on the same side as the sun in the sky panorama. The pool
   * glitter and the waterfall highlights use the same direction and colour.
   */
  sunPosition: [20, 22, 13] as Vec3,
  sunColor: '#ffe3c2',
  sunIntensity: 2.8,
  /** How strongly the sky panorama lights the scene (image-based lighting). */
  environmentIntensity: 1.25,
  /** Turns the HDRI so its sun sits on the same side as the scene's sun. */
  environmentYaw: 0,
  /** Starting values for the waterfall shader; live-tunable in leva (dev only). */
  waterfall: {
    speed: 1.15,
    /** Tint of thin, unaerated water; thick water is always white. */
    color: '#b9dedd',
    deepColor: '#4a8f96',
    foam: 0.55,
    opacity: 0.8,
    /** Vertex ripple depth in metres. */
    wobble: 0.14,
    /** How far the middle of the sheet bulges out from the cliff. */
    bulge: 0.35,
    /** How far the bottom of the sheet has drifted out from the top. */
    lean: 0.7,
  },
  /** The animated player model and how its clips are blended. */
  character: {
    /** Fits the 1.75 m model to the 1.7 m physics capsule. */
    scale: 0.97,
    /** Cross-fade between clips, in seconds. */
    blendTime: 0.14,
    /** Ground speed (m/s) at which the run clip plays at normal speed. */
    runCycleSpeed: 6,
    /** Seconds into the jump clip to start from, skipping its wind-up crouch. */
    jumpStart: 0.85,
    /** Landings harder than this (m/s) play the recovery clip. */
    landImpact: 7,
    landStart: 0.25,
    landSpeed: 1.7,
    /** Seconds the landing clip holds before run / idle take over. */
    landHold: 0.28,
  },
  /**
   * How each level material (matched by a word in its Blender name) responds to
   * light: roughness, strength of sky reflections, depth of the generated normal
   * map, and a colour multiplied over the texture. Order matters: the first match wins.
   */
  surfaceLook: {
    WetTop: { roughness: 0.3, reflect: 1.6, relief: 2.2, tint: '#a9b2b5' },
    Wet: { roughness: 0.28, reflect: 1.3, relief: 2.6, tint: '#c3cace' },
    DryTop: { roughness: 0.9, reflect: 0.7, relief: 2.6, tint: '#c4c0b8' },
    Dry: { roughness: 0.9, reflect: 0.6, relief: 2.8, tint: '#7d7a74' },
    Moss: { roughness: 1.0, reflect: 0.35, relief: 3.2, tint: '#dfe6d2' },
    PoolFloor: { roughness: 0.6, reflect: 0.8, relief: 3.0, tint: '#c9c2b6' },
    Bark: { roughness: 0.75, reflect: 0.6, relief: 3.4, tint: '#e6dccf' },
    Cliff: { roughness: 0.7, reflect: 0.9, relief: 0, tint: '#d2d8d3' },
    Rock_Side: { roughness: 0.75, reflect: 0.8, relief: 0, tint: '#ccd2cd' },
    boulder: { roughness: 0.8, reflect: 0.8, relief: 0, tint: '#e9ecec' },
    rock_face: { roughness: 0.85, reflect: 0.7, relief: 0, tint: '#dfe2de' },
    Tree: { roughness: 0.9, reflect: 0.3, relief: 0, tint: '#e8eee0', glow: 0.5 },
    fern: { roughness: 0.7, reflect: 0.5, relief: 0, tint: '#ffffff' },
    anthurium: { roughness: 0.45, reflect: 0.9, relief: 0, tint: '#ffffff' },
  },
  /** Logs drifting down the face of the falls. */
  logs: {
    count: 3,
    /** Metres per second downward. */
    speed: 1.5,
    /** X position of each log in turn; they fall just in front of the ledges. */
    laneX: [0, -0.5, 0.5],
    laneZ: -0.05,
    rollSpeed: 0.5,
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
    shallowColor: '#3f8f86',
    deepColor: '#0f3d45',
    /** What the water mirrors where the reflection runs into the cliff. */
    cliffReflection: '#2b3236',
    rippleStrength: 0.11,
    /** Brightness of the moving light pattern on the pool bed. */
    caustics: 0.55,
  },
  mist: {
    count: 44,
    color: '#eef6f9',
    /** Low, because blending happens in linear light under the post-processing composer. */
    opacity: 0.03,
    minSize: 5,
    maxSize: 11,
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
    /** Size of the shared droplet pool. */
    count: 560,
    /** Droplets per second per metre along the base of the fall. */
    baseRate: 14,
    /** Droplets per second at the foot of each water column. */
    columnRate: 26,
    /** Droplets per second where the fall breaks over each ledge. */
    ledgeRate: 5,
    gravity: -7,
    /** Air drag per second; high, so spray hangs instead of arcing. */
    drag: 1.6,
    /** Droplet sprite size in metres when launched. */
    minSize: 0.18,
    maxSize: 0.45,
    /** How many times larger a droplet has swollen by the end of its life. */
    growth: 2.4,
    opacity: 0.2,
    /** Droplets thrown up when landing on wet stone / falling in the pool. */
    landingBurst: 14,
    poolBurst: 40,
  },

} as const
