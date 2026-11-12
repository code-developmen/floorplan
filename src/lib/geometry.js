/** Ray-casting point-in-polygon test. `x` and `y` are in the same space as `points`. */
export function pointInPolygon(x, y, points) {
  let inside = false
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const yi = points[i].y
    const yj = points[j].y
    const intersect =
      yi > y !== yj > y &&
      x < ((points[j].x - points[i].x) * (y - yi)) / (yj - yi) + points[i].x
    if (intersect) inside = !inside
  }
  return inside
}

export function polygonArea(points) {
  let sum = 0
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    sum += points[j].x * points[i].y - points[i].x * points[j].y
  }
  return Math.abs(sum) / 2
}

export function polygonBounds(points) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }
  return { minX, minY, maxX, maxY }
}

/**
 * Pixel indices (y * width + x) whose centers fall inside the polygon.
 * Built once per region so later recolors do not repeat the point-in-polygon test.
 */
export function rasterizePolygon(width, height, points) {
  const indices = []
  if (points.length < 3) return indices
  const bounds = polygonBounds(points)
  const startX = Math.max(0, Math.floor(bounds.minX))
  const startY = Math.max(0, Math.floor(bounds.minY))
  const endX = Math.min(width - 1, Math.ceil(bounds.maxX))
  const endY = Math.min(height - 1, Math.ceil(bounds.maxY))
  for (let y = startY; y <= endY; y++) {
    for (let x = startX; x <= endX; x++) {
      if (pointInPolygon(x + 0.5, y + 0.5, points)) {
        indices.push(y * width + x)
      }
    }
  }
  return indices
}

/**
 * Soft mask for a polygon. Interior pixels stay fully covered and the edge
 * falls off, so a finish does not end in a hard rectangle.
 */
export function featherAlpha(width, height, indices, radius) {
  const alpha = new Float32Array(width * height)
  if (indices.length === 0) return alpha
  let minX = width
  let minY = height
  let maxX = 0
  let maxY = 0
  for (const index of indices) {
    alpha[index] = 1
    const x = index % width
    const y = (index / width) | 0
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
  }
  if (radius <= 0) return alpha
  const pad = radius * 3
  const x0 = Math.max(0, minX - pad)
  const y0 = Math.max(0, minY - pad)
  const x1 = Math.min(width - 1, maxX + pad)
  const y1 = Math.min(height - 1, maxY + pad)
  const tmp = new Float32Array(alpha.length)
  boxBlurHorizontal(alpha, tmp, width, x0, x1, y0, y1, radius)
  boxBlurVertical(tmp, alpha, width, x0, x1, y0, y1, radius)
  boxBlurHorizontal(alpha, tmp, width, x0, x1, y0, y1, radius)
  boxBlurVertical(tmp, alpha, width, x0, x1, y0, y1, radius)
  return alpha
}

function boxBlurHorizontal(src, dst, width, x0, x1, y0, y1, radius) {
  const windowSize = radius * 2 + 1
  for (let y = y0; y <= y1; y++) {
    const row = y * width
    let sum = 0
    for (let x = x0 - radius; x <= x0 + radius; x++) {
      sum += src[row + clamp(x, 0, width - 1)]
    }
    for (let x = x0; x <= x1; x++) {
      dst[row + x] = sum / windowSize
      sum -= src[row + clamp(x - radius, 0, width - 1)]
      sum += src[row + clamp(x + radius + 1, 0, width - 1)]
    }
  }
}

function boxBlurVertical(src, dst, width, x0, x1, y0, y1, radius) {
  const windowSize = radius * 2 + 1
  const height = dst.length / width
  for (let x = x0; x <= x1; x++) {
    let sum = 0
    for (let y = y0 - radius; y <= y0 + radius; y++) {
      sum += src[clamp(y, 0, height - 1) * width + x]
    }
    for (let y = y0; y <= y1; y++) {
      dst[y * width + x] = sum / windowSize
      sum -= src[clamp(y - radius, 0, height - 1) * width + x]
      sum += src[clamp(y + radius + 1, 0, height - 1) * width + x]
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

/** Smallest containing polygon wins so a counter edge can sit inside a larger cabinet. */
export function hitTestRegions(x, y, regions) {
  let best = null
  let bestArea = Infinity
  for (const region of regions) {
    if (region.points.length < 3) continue
    if (!pointInPolygon(x, y, region.points)) continue
    const area = polygonArea(region.points)
    if (area < bestArea) {
      best = region
      bestArea = area
    }
  }
  return best
}

/** Map a mouse event from screen space into the canvas bitmap, which is image pixel space. */
export function clientToImagePoint(clientX, clientY, canvas) {
  const rect = canvas.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) return null
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height),
  }
}

export function strokePolygon(ctx, points, color, lineWidth) {
  if (points.length < 2) return
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.closePath()
  ctx.strokeStyle = color
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.restore()
}
