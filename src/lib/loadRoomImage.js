import { regions } from '../data/regions'
import { pointInPolygon, polygonBounds } from './geometry'

export const PLACEHOLDER_WIDTH = 1600
export const PLACEHOLDER_HEIGHT = 1000

const REGION_COLOR = {
  'upper-cabinets-left': [176, 132, 86],
  'upper-cabinets-right': [176, 132, 86],
  'lower-cabinets': [150, 108, 68],
  island: [124, 86, 52],
  countertop: [168, 164, 156],
}

export function loadRoomImage() {
  return new Promise((resolve) => {
    const image = new Image()
    image.onload = () => {
      if (image.naturalWidth > 0) {
        resolve({
          source: image,
          width: image.naturalWidth,
          height: image.naturalHeight,
          placeholder: false,
        })
        return
      }
      resolve(createPlaceholder())
    }
    image.onerror = () => resolve(createPlaceholder())
    image.src = '/assets/room-base.jpg'
  })
}

function createPlaceholder() {
  const canvas = document.createElement('canvas')
  canvas.width = PLACEHOLDER_WIDTH
  canvas.height = PLACEHOLDER_HEIGHT
  const ctx = canvas.getContext('2d')

  const wall = ctx.createLinearGradient(0, 0, 0, 700)
  wall.addColorStop(0, '#f7f4ef')
  wall.addColorStop(1, '#e4ddd3')
  ctx.fillStyle = wall
  ctx.fillRect(0, 0, PLACEHOLDER_WIDTH, PLACEHOLDER_HEIGHT)

  ctx.fillStyle = '#d5e4ee'
  ctx.fillRect(660, 90, 280, 150)
  ctx.strokeStyle = '#f7f4ef'
  ctx.lineWidth = 10
  ctx.strokeRect(665, 95, 270, 140)
  ctx.beginPath()
  ctx.moveTo(800, 95)
  ctx.lineTo(800, 235)
  ctx.moveTo(665, 165)
  ctx.lineTo(935, 165)
  ctx.stroke()

  for (let y = 650; y < PLACEHOLDER_HEIGHT; y += 36) {
    ctx.fillStyle = ((y / 36) | 0) % 2 === 0 ? '#8b7d70' : '#7d7064'
    ctx.fillRect(0, y, PLACEHOLDER_WIDTH, 34)
  }

  for (const region of regions) {
    const color = REGION_COLOR[region.id] || [150, 130, 110]
    const kind = region.categoryId === 'countertop' ? 'stone' : 'cabinet'
    fillPolygonTexture(ctx, region.points, color, kind)
  }

  const shadow = ctx.createLinearGradient(0, 248, 0, 310)
  shadow.addColorStop(0, 'rgba(40, 30, 20, 0.28)')
  shadow.addColorStop(1, 'rgba(40, 30, 20, 0)')
  ctx.fillStyle = shadow
  ctx.fillRect(60, 248, 1480, 62)

  ctx.save()
  tracePolygon(ctx, regions.find((region) => region.id === 'countertop').points)
  ctx.clip()
  const sheen = ctx.createLinearGradient(0, 260, 0, 330)
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.42)')
  sheen.addColorStop(0.45, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = sheen
  ctx.fillRect(60, 260, 1480, 70)
  ctx.restore()

  return {
    source: canvas,
    width: PLACEHOLDER_WIDTH,
    height: PLACEHOLDER_HEIGHT,
    placeholder: true,
  }
}

function fillPolygonTexture(ctx, points, color, kind) {
  const bounds = polygonBounds(points)
  const minX = Math.max(0, Math.floor(bounds.minX))
  const minY = Math.max(0, Math.floor(bounds.minY))
  const maxX = Math.min(ctx.canvas.width - 1, Math.ceil(bounds.maxX))
  const maxY = Math.min(ctx.canvas.height - 1, Math.ceil(bounds.maxY))
  const width = maxX - minX + 1
  const height = maxY - minY + 1
  if (width <= 0 || height <= 0) return

  const scratch = document.createElement('canvas')
  scratch.width = width
  scratch.height = height
  const scratchCtx = scratch.getContext('2d')
  const image = scratchCtx.createImageData(width, height)
  const data = image.data

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const px = x + minX
      const py = y + minY
      if (!pointInPolygon(px + 0.5, py + 0.5, points)) continue
      const shade = shadeFactor(px, py, minX, minY, width, height, kind)
      const offset = (y * width + x) * 4
      data[offset] = clampByte(color[0] * shade)
      data[offset + 1] = clampByte(color[1] * shade)
      data[offset + 2] = clampByte(color[2] * shade)
      data[offset + 3] = 255
    }
  }

  scratchCtx.putImageData(image, 0, 0)
  ctx.drawImage(scratch, minX, minY)
}

function shadeFactor(px, py, minX, minY, width, height, kind) {
  const down = yNorm(py, minY, height)
  let shade = 0.72 + 0.34 * (1 - down)
  shade += Math.sin(py * 0.5 + Math.sin(px * 0.02) * 2.5) * 0.07
  shade += (hash(px, py) - 0.5) * 0.1
  if (kind === 'cabinet') {
    if ((px - minX) % 140 < 3) shade -= 0.16
    if (py - minY < 10 || height - (py - minY) < 8) shade -= 0.08
  } else if (hash(px, py) > 0.93) {
    shade -= 0.12
  }
  if (kind === 'stone' && Math.sin(px * 0.01 + py * 0.05) > 0.72) shade += 0.2
  return Math.max(0.35, Math.min(1.25, shade))
}

function yNorm(py, minY, height) {
  if (height <= 1) return 0
  return (py - minY) / (height - 1)
}

function hash(x, y) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263)
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295
}

function clampByte(value) {
  return Math.max(0, Math.min(255, Math.round(value)))
}

function tracePolygon(ctx, points) {
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  ctx.closePath()
}
