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

/** How much of the swatch shows through. The rest stays the original photo. */
export const SHADE_STRENGTH = 0.34

/**
 * Glaze a swatch over the photo. Lightness from the picture is kept, then the
 * tint is mixed back with the original pixel so doors, highlights, and the
 * object itself stay visible. `alpha` is a feathered mask, 0 outside.
 */
export function shadeImage(imageData, alpha, targetH, targetS) {
  const dst = imageData.data
  for (let i = 0; i < alpha.length; i++) {
    const cover = alpha[i]
    if (cover < 0.03) continue
    const pixel = i * 4
    const red = dst[pixel]
    const green = dst[pixel + 1]
    const blue = dst[pixel + 2]
    const [, , lightness] = rgbToHsl(red, green, blue)
    const [tintR, tintG, tintB] = hslToRgb(targetH, targetS * 0.72, lightness)
    const amount = cover * SHADE_STRENGTH
    dst[pixel] = mix(red, tintR, amount)
    dst[pixel + 1] = mix(green, tintG, amount)
    dst[pixel + 2] = mix(blue, tintB, amount)
  }
}

function mix(from, to, amount) {
  return Math.round(from + (to - from) * amount)
}
