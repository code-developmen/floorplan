import { useEffect, useRef, useState } from 'react'
import { hexToHueSat, shadeImage } from '../lib/color'
import { clientToImagePoint, featherAlpha, hitTestRegions, rasterizePolygon, strokePolygon } from '../lib/geometry'

export default function RoomCanvas({
  image,
  regions,
  selections,
  activeRegionId,
  onSelectRegion,
  materialsById,
}) {
  const paneRef = useRef(null)
  const canvasRef = useRef(null)
  const compositeRef = useRef(null)
  const baseRef = useRef(null)
  const masksRef = useRef(new Map())
  const hoverRef = useRef(null)
  const selectionsRef = useRef(selections)
  const paintRef = useRef(() => {})
  const [hoverId, setHoverId] = useState(null)
  const [displaySize, setDisplaySize] = useState(null)

  const selectionKey = regions
    .map((region) => `${region.id}:${selections[region.id] || ''}`)
    .join('|')

  useEffect(() => {
    const pane = paneRef.current
    if (!pane) return undefined
    const widthFit = window.matchMedia('(max-width: 900px) and (min-height: 501px)')
    const measure = () => {
      const styles = getComputedStyle(pane)
      const padX = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight)
      const padY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom)
      const readout = pane.querySelector('.hover-readout')
      const readoutHeight = readout ? readout.offsetHeight + 8 : 24
      const maxW = Math.max(1, pane.clientWidth - padX - 4)
      const maxH = widthFit.matches
        ? Math.max(1, Math.round(window.innerHeight * 0.72) - readoutHeight)
        : Math.max(1, pane.clientHeight - padY - readoutHeight - 4)
      const scale = Math.min(maxW / image.width, maxH / image.height)
      const width = Math.max(1, Math.round(image.width * scale))
      const height = Math.max(1, Math.round(image.height * scale))
      setDisplaySize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(pane)
    window.addEventListener('resize', measure)
    widthFit.addEventListener('change', measure)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', measure)
      widthFit.removeEventListener('change', measure)
    }
  }, [image])

  useEffect(() => {
    const composite = document.createElement('canvas')
    composite.width = image.width
    composite.height = image.height
    const ctx = composite.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(image.source, 0, 0, image.width, image.height)
    baseRef.current = ctx.getImageData(0, 0, image.width, image.height)
    compositeRef.current = composite

    const masks = new Map()
    for (const region of regions) {
      const indices = rasterizePolygon(image.width, image.height, region.points)
      masks.set(region.id, featherAlpha(image.width, image.height, indices, 12))
    }
    masksRef.current = masks
  }, [image, regions])

  // Hover only repaints the outline. Recolor runs when selectionKey changes,
  // and a region+swatch pair already in the cache is copied, not recomputed.
  useEffect(() => {
    selectionsRef.current = selections
    paintRef.current = () => {
      const canvas = canvasRef.current
      const composite = compositeRef.current
      if (!canvas || !composite) return
      const ctx = canvas.getContext('2d')
      ctx.drawImage(composite, 0, 0)
      const rect = canvas.getBoundingClientRect()
      const scale = rect.width > 0 ? canvas.width / rect.width : 1
      for (const region of regions) {
        const hovered = region.id === hoverRef.current
        const active = region.id === activeRegionId
        if (hovered) strokePolygon(ctx, region.points, '#2563eb', 2.5 * scale)
        else if (active) strokePolygon(ctx, region.points, 'rgba(29, 78, 216, 0.85)', 2 * scale)
      }
    }
  }, [selections, activeRegionId, regions])

  useEffect(() => {
    const base = baseRef.current
    const composite = compositeRef.current
    if (!base || !composite) return
    const output = new ImageData(new Uint8ClampedArray(base.data), base.width, base.height)
    const currentSelections = selectionsRef.current
    for (const region of regions) {
      const materialId = currentSelections[region.id]
      if (!materialId) continue
      const material = materialsById.get(materialId)
      const alpha = masksRef.current.get(region.id)
      if (!material || !alpha) continue
      const { h, s } = hexToHueSat(material.hex)
      shadeImage(output, alpha, h, s)
    }
    composite.getContext('2d').putImageData(output, 0, 0)
    paintRef.current()
  }, [selectionKey, image, regions, materialsById])

  useEffect(() => {
    paintRef.current()
  }, [hoverId, activeRegionId, displaySize])

  function updateHover(nextId) {
    if (nextId === hoverRef.current) return
    hoverRef.current = nextId
    setHoverId(nextId)
  }

  function handleMouseMove(event) {
    const point = clientToImagePoint(event.clientX, event.clientY, canvasRef.current)
    if (!point) return
    const hit = hitTestRegions(point.x, point.y, regions)
    updateHover(hit ? hit.id : null)
  }

  function handleMouseLeave() {
    updateHover(null)
  }

  function handleClick(event) {
    const point = clientToImagePoint(event.clientX, event.clientY, canvasRef.current)
    if (!point) return
    const hit = hitTestRegions(point.x, point.y, regions)
    if (hit) onSelectRegion(hit.id)
  }

  const hoverRegion = regions.find((region) => region.id === hoverId)

  return (
    <div className="canvas-pane" ref={paneRef}>
      <canvas
        ref={canvasRef}
        width={image.width}
        height={image.height}
        aria-label="Room photo. Tap or click a surface to choose a finish."
        style={{
          width: displaySize ? `${displaySize.width}px` : '100%',
          height: displaySize ? `${displaySize.height}px` : 'auto',
          cursor: hoverId ? 'pointer' : 'default',
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      />
      <p className="hover-readout">{hoverRegion ? hoverRegion.label : 'Select a surface'}</p>
    </div>
  )
}
