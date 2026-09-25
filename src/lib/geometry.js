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
