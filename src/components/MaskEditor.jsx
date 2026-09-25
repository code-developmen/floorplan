import { useEffect, useRef, useState } from 'react'
import { regions as savedRegions } from '../data/regions'
import { clientToImagePoint } from '../lib/geometry'

export default function MaskEditor({ image }) {
  const scrollRef = useRef(null)
  const canvasRef = useRef(null)
  const textareaRef = useRef(null)
  const readoutRef = useRef(null)
  const draftRef = useRef([])
  const polygonsRef = useRef([])
  const cursorRef = useRef(null)
  const paintRef = useRef(() => {})
  const commitRef = useRef(() => {})

  const [draft, setDraft] = useState([])
  const [polygons, setPolygons] = useState([])
  const [zoom, setZoom] = useState(1)
  const [exportText, setExportText] = useState('')
  const [status, setStatus] = useState('')
  const [pendingFocusId, setPendingFocusId] = useState(null)

  useEffect(() => {
    const stage = scrollRef.current
    if (!stage) return undefined
    const fit = Math.min(stage.clientWidth / image.width, stage.clientHeight / image.height)
    if (fit > 0 && Number.isFinite(fit)) setZoom(Math.min(1, fit))
    return undefined
  }, [image])

  useEffect(() => {
    draftRef.current = draft
    polygonsRef.current = polygons
    commitRef.current = (points) => {
      if (!points || points.length < 3) return
      const id = crypto.randomUUID()
      const snapshot = points.map((point) => ({ x: point.x, y: point.y }))
      setPolygons((current) => [
        ...current,
        { id, name: `region-${current.length + 1}`, points: snapshot },
      ])
      draftRef.current = []
      setDraft([])
      setPendingFocusId(id)
    }
    paintRef.current = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image.source, 0, 0, image.width, image.height)
      const rect = canvas.getBoundingClientRect()
      const scale = rect.width > 0 ? canvas.width / rect.width : 1

      for (const polygon of polygonsRef.current) {
        drawPolygon(ctx, polygon.points, 'rgba(37, 99, 235, 0.22)', '#2563eb', 2 * scale, true)
        const center = centroid(polygon.points)
        ctx.save()
        ctx.font = `${Math.round(14 * scale)}px system-ui, sans-serif`
        ctx.fillStyle = '#1e3a8a'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(polygon.name, center.x, center.y)
        ctx.restore()
      }

      const points = draftRef.current
      if (points.length > 0) {
        drawPolygon(ctx, points, 'rgba(234, 88, 12, 0.16)', '#ea580c', 2 * scale, false)
        const cursor = cursorRef.current
        if (cursor) {
          ctx.save()
          ctx.beginPath()
          ctx.moveTo(points[points.length - 1].x, points[points.length - 1].y)
          ctx.lineTo(cursor.x, cursor.y)
          ctx.strokeStyle = '#ea580c'
          ctx.lineWidth = 1.5 * scale
          ctx.setLineDash([6 * scale, 4 * scale])
          ctx.stroke()
          ctx.restore()
        }
        const radius = 4 * scale
        ctx.fillStyle = '#ea580c'
        for (const point of points) {
          ctx.beginPath()
          ctx.arc(point.x, point.y, radius, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    paintRef.current()
  }, [draft, polygons, image, zoom])

  useEffect(() => {
    if (!exportText) return undefined
    textareaRef.current?.focus()
    textareaRef.current?.select()
    return undefined
  }, [exportText])

  useEffect(() => {
    function onKeyDown(event) {
      const tag = event.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (event.key === 'Enter') {
        event.preventDefault()
        commitRef.current(draftRef.current)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        const next = draftRef.current.slice(0, -1)
        draftRef.current = next
        setDraft(next)
      } else if (event.key === 'Escape') {
        draftRef.current = []
        setDraft([])
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function addPoint(point) {
    const next = [...draftRef.current, point]
    draftRef.current = next
    setDraft(next)
  }

  function handleClick(event) {
    if (event.detail > 1) return
    const point = clientToImagePoint(event.clientX, event.clientY, canvasRef.current)
    if (!point) return
    addPoint(point)
  }

  function handleDoubleClick(event) {
    event.preventDefault()
    commitRef.current(draftRef.current)
  }

  function handleMouseMove(event) {
    const point = clientToImagePoint(event.clientX, event.clientY, canvasRef.current)
    cursorRef.current = point
    if (readoutRef.current && point) {
      readoutRef.current.textContent = `${Math.round(point.x)}, ${Math.round(point.y)} px`
    }
    if (draftRef.current.length > 0) paintRef.current()
  }

  function renamePolygon(id, name) {
    setPolygons((current) =>
      current.map((polygon) => (polygon.id === id ? { ...polygon, name } : polygon)),
    )
  }

  function deletePolygon(id) {
    setPolygons((current) => current.filter((polygon) => polygon.id !== id))
  }

  function loadSavedRegions() {
    setPolygons(
      savedRegions.map((region) => ({
        id: region.id,
        name: region.id,
        points: region.points.map((point) => ({ x: point.x, y: point.y })),
      })),
    )
    draftRef.current = []
    setDraft([])
  }

  function clearPolygons() {
    setPolygons([])
    draftRef.current = []
    setDraft([])
    setExportText('')
    setStatus('')
  }

  async function exportJson() {
    const payload = toExport(polygonsRef.current)
    const json = JSON.stringify(payload, null, 2)
    console.log(payload)
    setExportText(json)
    try {
      await navigator.clipboard.writeText(json)
      setStatus('Copied to the clipboard and printed to the console.')
    } catch {
      setStatus('Printed to the console. Copy the JSON from the box below.')
    }
  }

  const displayWidth = Math.round(image.width * zoom)
  const displayHeight = Math.round(image.height * zoom)

  return (
    <div className="editor">
      <div className="editor-stage" ref={scrollRef}>
        <canvas
          ref={canvasRef}
          width={image.width}
          height={image.height}
          style={{ width: `${displayWidth}px`, height: `${displayHeight}px` }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseMove={handleMouseMove}
        />
      </div>
      <aside className="editor-side">
        <div className="sidebar-block">
          <h2>Mask Editor</h2>
          <p>
            Click to add points. Double-click or press Enter to close the polygon. Backspace
            removes the last point. Coordinates are original image pixels.
          </p>
          <p className="readout" ref={readoutRef}>
            Move over the photo
          </p>
          <p className="draft-count">
            {draft.length === 0 ? 'No polygon in progress.' : `${draft.length} point${draft.length === 1 ? '' : 's'} in progress.`}
          </p>
        </div>

        <div className="editor-toolbar">
          <label>
            Zoom
            <input
              type="range"
              min="0.1"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </label>
          <span>{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom(1)}>
            100%
          </button>
          <button type="button" onClick={() => commitRef.current(draftRef.current)} disabled={draft.length < 3}>
            Finish polygon
          </button>
        </div>

        <div className="polygon-list">
          {polygons.length === 0 ? <p>No finished polygons yet.</p> : null}
          {polygons.map((polygon) => (
            <div key={polygon.id} className="polygon-row">
              <input
                value={polygon.name}
                aria-label="Polygon name"
                autoFocus={polygon.id === pendingFocusId}
                onChange={(event) => renamePolygon(polygon.id, event.target.value)}
              />
              <span>{polygon.points.length} pts</span>
              <button type="button" onClick={() => deletePolygon(polygon.id)}>
                Delete
              </button>
            </div>
          ))}
        </div>

        <div className="editor-actions">
          <button type="button" onClick={loadSavedRegions}>
            Load regions.ts
          </button>
          <button type="button" onClick={clearPolygons}>
            Clear
          </button>
          <button type="button" onClick={exportJson} disabled={polygons.length === 0}>
            Export JSON
          </button>
        </div>
        {status ? <p className="status">{status}</p> : null}
        <p className="hint">
          Paste into <code>src/data/regions.ts</code>. Map <code>name</code> to <code>label</code> and
          add <code>categoryId</code> (<code>kitchen-slab</code>, <code>cabinet-finish</code>,{" "}
          <code>chimney-cover</code>, or <code>drawer-finish</code>).
        </p>
        <textarea
          ref={textareaRef}
          readOnly
          value={exportText}
          placeholder="Export JSON appears here."
          spellCheck="false"
        />
      </aside>
    </div>
  )
}

function drawPolygon(ctx, points, fill, stroke, lineWidth, closed) {
  if (points.length === 0) return
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y)
  if (closed) ctx.closePath()
  if (closed) {
    ctx.fillStyle = fill
    ctx.fill()
  }
  ctx.strokeStyle = stroke
  ctx.lineWidth = lineWidth
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.restore()
}

function centroid(points) {
  let x = 0
  let y = 0
  for (const point of points) {
    x += point.x
    y += point.y
  }
  return { x: x / points.length, y: y / points.length }
}

function toExport(polygons) {
  const used = new Set()
  return polygons.map((polygon, index) => {
    const base = slug(polygon.name) || `region-${index + 1}`
    let id = base
    let suffix = 2
    while (used.has(id)) {
      id = `${base}-${suffix}`
      suffix += 1
    }
    used.add(id)
    return {
      id,
      name: polygon.name,
      points: polygon.points.map((point) => ({
        x: Math.round(point.x),
        y: Math.round(point.y),
      })),
    }
  })
}

function slug(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
