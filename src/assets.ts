/** Paths of game-ready assets in /public/assets. Sources are logged in assets-src/manifest.json. */
export const ASSETS = {
  sky: '/assets/textures/sky_panorama.webp',
  foamMask: '/assets/textures/foam.webp',
  splashFlipbook: '/assets/textures/splash_flipbook.webp',
  basalt: '/assets/textures/basalt.webp',
  moss: '/assets/textures/moss.webp',
  poolFloor: '/assets/textures/pool_floor.webp',
  bark: '/assets/textures/bark.webp',
  conceptArt: '/assets/images/concept_01.webp',
  distantWaterfallLoop: '/assets/video/waterfall_distant_loop.mp4',
  level: '/assets/models/level.glb',
  character: '/assets/models/character.glb',
} as const

/** Draco decoder files, served locally so the game needs no CDN. */
export const DRACO_PATH = '/draco/'
