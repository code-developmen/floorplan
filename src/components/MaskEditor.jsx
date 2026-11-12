import { useEffect, useRef, useState } from 'react'
import { useCatalog } from '../hooks/useCatalog'
import {
  areaToDraft,
  createAreaDraft,
  createOptionDraft,
  createVariantDraft,
  toAreaPayload,
} from '../lib/areaModel'
import { clientToImagePoint } from '../lib/geometry'

const NO_DRAFTS = []

export default function MaskEditor({ image, customAreas, configured, onSave, onDelete, onReload }) {
  const { drafts, setDrafts } = useCatalog()
  const scrollRef = useRef(null)
  const canvasRef = useRef(null)
  const readoutRef = useRef(null)
  const draftRef = useRef([])
  const polygonsRef = useRef([])
  const cursorRef = useRef(null)
  const paintRef = useRef(() => {})
  const commitRef = useRef(() => {})
  const redrawRef = useRef(null)
  const selectedRef = useRef(null)
  const zoomModeRef = useRef('fit')

  const [draft, setDraft] = useState([])
  const [zoom, setZoom] = useState(1)
  const [selectedId, setSelectedId] = useState(null)
  const [redrawId, setRedrawId] = useState(null)
  const [pendingFocusId, setPendingFocusId] = useState(null)
  const [savingId, setSavingId] = useState(null)
  const [status, setStatus] = useState(null)
  const polygons = drafts || NO_DRAFTS
  const editorReady = drafts !== null

  useEffect(() => {
    if (!editorReady) return undefined
    const stage = scrollRef.current
    if (!stage) return undefined
    const fitZoom = () => {
      if (zoomModeRef.current !== 'fit') return
      const fit = Math.min(stage.clientWidth / image.width, stage.clientHeight / image.height)
      if (fit > 0 && Number.isFinite(fit)) setZoom(Math.min(1, fit))
    }
    fitZoom()
    const observer = new ResizeObserver(fitZoom)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [image, editorReady])

  useEffect(() => {
    draftRef.current = draft
    polygonsRef.current = polygons
    redrawRef.current = redrawId
    selectedRef.current = selectedId
    commitRef.current = (points) => {
      if (!points || points.length < 3) return
      const snapshot = points.map((point) => ({ x: point.x, y: point.y }))
      const redrawing = redrawRef.current
      if (redrawing) {
        setDrafts((current) =>
          current.map((polygon) =>
            polygon.id === redrawing ? { ...polygon, points: snapshot, dirty: true } : polygon,
          ),
        )
        setRedrawId(null)
        setSelectedId(redrawing)
      } else {
        const area = createAreaDraft(snapshot, polygonsRef.current.length + 1)
        setDrafts((current) => [...current, area])
        setSelectedId(area.id)
        setPendingFocusId(area.id)
      }
      draftRef.current = []
      setDraft([])
    }
    paintRef.current = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      ctx.drawImage(image.source, 0, 0, image.width, image.height)
      const rect = canvas.getBoundingClientRect()
      const scale = rect.width > 0 ? canvas.width / rect.width : 1
      const activeId = selectedRef.current
      const hiddenId = redrawRef.current

      for (const polygon of polygonsRef.current) {
        if (polygon.id === hiddenId) continue
        const selected = polygon.id === activeId
        drawPolygon(
          ctx,
          polygon.points,
          selected ? 'rgba(29, 78, 216, 0.28)' : 'rgba(37, 99, 235, 0.22)',
          selected ? '#1d4ed8' : '#2563eb',
          (selected ? 3 : 2) * scale,
          true,
        )
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
  }, [draft, polygons, image, zoom, selectedId, redrawId, setDrafts])

  useEffect(() => {
    function onKeyDown(event) {
      const tag = event.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
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
        setRedrawId(null)
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

  function updateArea(id, recipe) {
    setDrafts((current) =>
      current.map((polygon) => (polygon.id === id ? { ...recipe(polygon), dirty: true } : polygon)),
    )
  }

  async function savePolygon(polygon) {
    const payload = toAreaPayload(polygon)
    if (payload.error) {
      setStatus({ type: 'error', text: payload.error })
      return
    }
    setSavingId(polygon.id)
    try {
      const saved = await onSave(payload.value)
      setDrafts((current) => current.map((item) => (item.id === polygon.id ? areaToDraft(saved) : item)))
      setStatus({ type: 'ok', text: `Saved "${saved.label}". It can be selected in the configurator.` })
    } catch (error) {
      setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Could not save the area.' })
    } finally {
      setSavingId(null)
    }
  }

  async function deletePolygon(polygon) {
    if (polygon.persisted) {
      const confirmed = window.confirm(
        `Delete "${polygon.name}"? It will disappear from the configurator.`,
      )
      if (!confirmed) return
      setSavingId(polygon.id)
      try {
        await onDelete(polygon.id)
      } catch (error) {
        setStatus({ type: 'error', text: error instanceof Error ? error.message : 'Could not delete the area.' })
        setSavingId(null)
        return
      }
      setSavingId(null)
    }
    setDrafts((current) => current.filter((item) => item.id !== polygon.id))
    if (selectedId === polygon.id) setSelectedId(null)
    if (redrawId === polygon.id) {
      setRedrawId(null)
      draftRef.current = []
      setDraft([])
    }
    setStatus({ type: 'ok', text: `Deleted "${polygon.name}".` })
  }

  function revertLocal() {
    setDrafts(customAreas.map(areaToDraft))
    draftRef.current = []
    setDraft([])
    setRedrawId(null)
    setSelectedId(null)
    setStatus({ type: 'ok', text: 'Reverted to the last saved areas.' })
  }

  async function reloadSaved() {
    const dirty = draft.length > 0 || redrawId || polygons.some((polygon) => !polygon.persisted || polygon.dirty)
    if (dirty) {
      setStatus({ type: 'error', text: 'Save or revert local changes before reloading.' })
      return
    }
    const areas = await onReload()
    if (!areas) return
    setDrafts(areas.map(areaToDraft))
    setSelectedId(null)
    setStatus({ type: 'ok', text: 'Reloaded saved areas.' })
  }

  const selected = polygons.find((polygon) => polygon.id === selectedId) || null
  const displayWidth = Math.round(image.width * zoom)
  const displayHeight = Math.round(image.height * zoom)

  if (!drafts) {
    return <p className="loading">Loading saved areas…</p>
  }

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
            Click the photo to outline an area. Double-click or press Enter to close it. Name the
            area, then add variants and the options people can choose. Saving stores it in Supabase
            and adds it to the configurator beside the built-in surfaces.
          </p>
          <p className="readout" ref={readoutRef}>
            Move over the photo
          </p>
          <p className="draft-count">
            {redrawId
              ? 'Redrawing the outline. Double-click to finish, or press Escape to cancel.'
              : draft.length === 0
                ? 'No outline in progress.'
                : `${draft.length} point${draft.length === 1 ? '' : 's'} in progress.`}
          </p>
        </div>

        {!configured ? (
          <div className="setup-note">
            <p>Saving needs a Supabase project. Copy <code>.env.example</code> to <code>.env</code> and set:</p>
            <ul>
              <li>
                <code>VITE_SUPABASE_URL</code>
              </li>
              <li>
                <code>VITE_SUPABASE_ANON_KEY</code>
              </li>
            </ul>
            <p>
              Run <code>supabase/schema.sql</code> in the Supabase SQL editor, then restart the dev
              server.
            </p>
          </div>
        ) : null}

        <div className="editor-toolbar">
          <label>
            Zoom
            <input
              type="range"
              min="0.05"
              max="3"
              step="0.05"
              value={zoom}
              onChange={(event) => {
                zoomModeRef.current = 'manual'
                setZoom(Number(event.target.value))
              }}
            />
          </label>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={() => {
              zoomModeRef.current = 'manual'
              setZoom(1)
            }}
          >
            100%
          </button>
          <button type="button" onClick={() => commitRef.current(draftRef.current)} disabled={draft.length < 3}>
            Finish outline
          </button>
        </div>

        <div className="polygon-list">
          {polygons.length === 0 ? <p>No areas yet. Outline one on the photo.</p> : null}
          {polygons.map((polygon) => {
            const saved = polygon.persisted && !polygon.dirty
            return (
              <div key={polygon.id} className={polygon.id === selectedId ? 'polygon-row selected' : 'polygon-row'}>
                <button type="button" className="polygon-select" onClick={() => setSelectedId(polygon.id)}>
                  <span className="polygon-name">{polygon.name}</span>
                  <span className={saved ? 'polygon-meta saved' : 'polygon-meta unsaved'}>
                    {saved ? 'Saved' : 'Unsaved'}
                  </span>
                </button>
                <span>{polygon.points.length} pts</span>
                <button type="button" onClick={() => deletePolygon(polygon)} disabled={savingId === polygon.id}>
                  Delete
                </button>
              </div>
            )
          })}
        </div>

        {selected ? (
          <AreaForm
            key={selected.id}
            area={selected}
            saving={savingId === selected.id}
            configured={configured}
            redrawing={redrawId === selected.id}
            autoFocusName={selected.id === pendingFocusId}
            onChange={(next) => updateArea(selected.id, () => next)}
            onSave={() => savePolygon(selected)}
            onRedraw={() => {
              draftRef.current = []
              setDraft([])
              setRedrawId(selected.id)
              setStatus({ type: 'ok', text: `Redrawing "${selected.name}". The previous outline is hidden until you finish.` })
            }}
            onCancelRedraw={() => {
              draftRef.current = []
              setDraft([])
              setRedrawId(null)
            }}
          />
        ) : null}

        <div className="editor-actions">
          <button type="button" onClick={reloadSaved} disabled={!configured}>
            Reload saved
          </button>
          <button type="button" onClick={revertLocal}>
            Revert
          </button>
        </div>
        {status ? (
          <p className={status.type === 'error' ? 'status error' : 'status ok'} role="status">
            {status.text}
          </p>
        ) : null}
      </aside>
    </div>
  )
}

function AreaForm({
  area,
  saving,
  configured,
  redrawing,
  autoFocusName,
  onChange,
  onSave,
  onRedraw,
  onCancelRedraw,
}) {
  function updateVariant(variantId, recipe) {
    onChange({
      ...area,
      variants: area.variants.map((variant) => (variant.id === variantId ? recipe(variant) : variant)),
    })
  }

  return (
    <div className="area-form">
      <label className="field">
        <span>Area name</span>
        <input
          value={area.name}
          aria-label="Area name"
          autoFocus={autoFocusName}
          onChange={(event) => onChange({ ...area, name: event.target.value })}
        />
      </label>
      <p className="hint">Variants group the choices. Each option is a finish people can apply to this area.</p>
      {area.variants.map((variant, variantIndex) => (
        <section key={variant.id} className="variant-card">
          <div className="variant-head">
            <label className="field">
              <span>Variant</span>
              <input
                value={variant.name}
                aria-label={`Variant ${variantIndex + 1} name`}
                onChange={(event) =>
                  updateVariant(variant.id, (current) => ({ ...current, name: event.target.value }))
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                onChange({ ...area, variants: area.variants.filter((item) => item.id !== variant.id) })
              }
            >
              Remove
            </button>
          </div>
          {variant.options.map((option, optionIndex) => (
            <div key={option.id} className="option-row">
              <input
                type="color"
                value={option.hex.toLowerCase()}
                aria-label={`${option.name || 'Option'} color`}
                onChange={(event) =>
                  updateVariant(variant.id, (current) => ({
                    ...current,
                    options: current.options.map((item) =>
                      item.id === option.id ? { ...item, hex: event.target.value } : item,
                    ),
                  }))
                }
              />
              <input
                value={option.name}
                aria-label={`Option ${optionIndex + 1} name`}
                onChange={(event) =>
                  updateVariant(variant.id, (current) => ({
                    ...current,
                    options: current.options.map((item) =>
                      item.id === option.id ? { ...item, name: event.target.value } : item,
                    ),
                  }))
                }
              />
              <button
                type="button"
                onClick={() =>
                  updateVariant(variant.id, (current) => ({
                    ...current,
                    options: current.options.filter((item) => item.id !== option.id),
                  }))
                }
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              updateVariant(variant.id, (current) => ({
                ...current,
                options: [...current.options, createOptionDraft(current.options.length + 1)],
              }))
            }
          >
            Add option
          </button>
        </section>
      ))}
      <div className="area-form-actions">
        <button type="button" onClick={() => onChange({ ...area, variants: [...area.variants, createVariantDraft(area.variants.length + 1)] })}>
          Add variant
        </button>
        <button type="button" onClick={redrawing ? onCancelRedraw : onRedraw} disabled={!redrawing && saving}>
          {redrawing ? 'Cancel redraw' : 'Redraw outline'}
        </button>
        <button type="button" className="button-primary" onClick={onSave} disabled={!configured || saving || redrawing}>
          {saving ? 'Saving…' : area.persisted ? 'Update area' : 'Save area'}
        </button>
      </div>
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
