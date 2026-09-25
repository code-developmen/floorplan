export function hexToRgb(hex) {
  const value = hex.replace('#', '').trim()
  const expanded =
    value.length === 3 ? value.split('').map((channel) => channel + channel).join('') : value
  return [
    Number.parseInt(expanded.slice(0, 2), 16),
    Number.parseInt(expanded.slice(2, 4), 16),
    Number.parseInt(expanded.slice(4, 6), 16),
  ]
}

/** @returns {[number, number, number]} h, s, l each in 0..1 */
export function rgbToHsl(r, g, b) {
  const red = r / 255
  const green = g / 255
  const blue = b / 255
  const max = Math.max(red, green, blue)
  const min = Math.min(red, green, blue)
  const lightness = (max + min) / 2
  if (max === min) return [0, 0, lightness]

  const delta = max - min
  const saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
  let hue
  if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0)
  else if (max === green) hue = (blue - red) / delta + 2
  else hue = (red - green) / delta + 4
  return [hue / 6, saturation, lightness]
}

function hueToChannel(p, q, t) {
  let hue = t
  if (hue < 0) hue += 1
  if (hue > 1) hue -= 1
  if (hue < 1 / 6) return p + (q - p) * 6 * hue
  if (hue < 1 / 2) return q
  if (hue < 2 / 3) return p + (q - p) * (2 / 3 - hue) * 6
  return p
}

function toByte(channel) {
  return Math.max(0, Math.min(255, Math.round(channel * 255)))
}

/** @returns {[number, number, number]} r, g, b in 0..255 */
export function hslToRgb(h, s, l) {
  if (s === 0) {
    const gray = toByte(l)
    return [gray, gray, gray]
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  return [
    toByte(hueToChannel(p, q, h + 1 / 3)),
    toByte(hueToChannel(p, q, h)),
    toByte(hueToChannel(p, q, h - 1 / 3)),
  ]
}

const hueSatCache = new Map()

/** Hue and saturation of a swatch. Lightness is intentionally discarded. */
export function hexToHueSat(hex) {
  const key = hex.toLowerCase()
  const cached = hueSatCache.get(key)
  if (cached) return cached
  const [r, g, b] = hexToRgb(key)
  const [h, s] = rgbToHsl(r, g, b)
  const value = { h, s }
  hueSatCache.set(key, value)
  return value
}

/**
 * Luminosity-preserving recolor — the core of this prototype.
 *
 * A flat fill would overwrite every channel and erase the photo. Instead, for
 * each masked pixel we convert the original RGB to HSL:
 *
 *   L = (max(R, G, B) + min(R, G, B)) / 2
 *   S is 0 for gray pixels, otherwise chroma scaled by how far L is from 0 or 1
 *   H is the position of the dominant channel around the color wheel (0–1)
 *
 * Grain, door seams, highlights, and shadows in the photo are mostly changes
 * in L, not in hue. We keep that L and replace H and S with the swatch's H and
 * S, then convert back to RGB. A bright ridge in the wood stays bright; a
 * dark seam stays dark; both take on the new finish color.
 *
 * `original` is read and never written. The returned buffer is cached per
 * region + swatch so unchanged surfaces are not run through HSL again.
 */
export function recolorPixels(original, indices, targetH, targetS) {
  const src = original.data
  const rgb = new Uint8ClampedArray(indices.length * 3)
  for (let i = 0; i < indices.length; i++) {
    const pixel = indices[i] * 4
    const [, , lightness] = rgbToHsl(src[pixel], src[pixel + 1], src[pixel + 2])
    const [r, g, b] = hslToRgb(targetH, targetS, lightness)
    const channel = i * 3
    rgb[channel] = r
    rgb[channel + 1] = g
    rgb[channel + 2] = b
  }
  return { indices, rgb }
}

export function writeRecoloredPixels(imageData, recolored) {
  const dst = imageData.data
  const { indices, rgb } = recolored
  for (let i = 0; i < indices.length; i++) {
    const pixel = indices[i] * 4
    const channel = i * 3
    dst[pixel] = rgb[channel]
    dst[pixel + 1] = rgb[channel + 1]
    dst[pixel + 2] = rgb[channel + 2]
  }
}
