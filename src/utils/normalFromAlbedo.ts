import { CanvasTexture, NoColorSpace, type Texture } from 'three'

/**
 * Builds a tangent-space normal map from a colour texture by treating its
 * brightness as height (a Sobel filter). The Flow textures are colour only,
 * so this gives rock, moss, pebbles and bark some surface relief that reacts
 * to light, without shipping extra image files.
 */
export function normalFromAlbedo(source: Texture, strength = 2): CanvasTexture | null {
  const image = source.image as (CanvasImageSource & { width: number; height: number }) | undefined
  if (!image || !image.width) return null
  const width = image.width
  const height = image.height

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) return null
  ctx.drawImage(image, 0, 0, width, height)
  const pixels = ctx.getImageData(0, 0, width, height)
  const data = pixels.data

  const heightMap = new Float32Array(width * height)
  for (let i = 0; i < heightMap.length; i++) {
    heightMap[i] = (data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114) / 255
  }
  // Wrapping lookups keep the result tileable.
  const at = (x: number, y: number) => heightMap[((y + height) % height) * width + ((x + width) % width)]

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx =
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1)
      const dy =
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1) - at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1)
      const nx = -dx * strength
      const ny = -dy * strength
      const inv = 1 / Math.hypot(nx, ny, 1)
      const i = (y * width + x) * 4
      data[i] = (nx * inv * 0.5 + 0.5) * 255
      data[i + 1] = (ny * inv * 0.5 + 0.5) * 255
      data[i + 2] = (inv * 0.5 + 0.5) * 255
      data[i + 3] = 255
    }
  }
  ctx.putImageData(pixels, 0, 0)

  const normal = new CanvasTexture(canvas)
  normal.colorSpace = NoColorSpace
  normal.wrapS = source.wrapS
  normal.wrapT = source.wrapT
  normal.flipY = source.flipY
  normal.repeat.copy(source.repeat)
  normal.offset.copy(source.offset)
  normal.anisotropy = 4
  return normal
}
