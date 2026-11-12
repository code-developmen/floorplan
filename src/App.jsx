import { useEffect, useMemo, useState } from 'react'
import MaterialPanel from './components/MaterialPanel'
import MaskEditor from './components/MaskEditor'
import RoomCanvas from './components/RoomCanvas'
import { useCatalog } from './hooks/useCatalog'
import { useRegionSelection } from './hooks/useRegionSelection'
import { buildMaterialMap, categoryForRegion, regionsWithCustom } from './lib/areaModel'
import { loadRoomImage } from './lib/loadRoomImage'
import './App.css'

export default function App() {
  const [mode, setMode] = useState('configurator')
  const [image, setImage] = useState(null)
  const { selections, activeRegionId, selectRegion, applyMaterial, clearRegion, resetAll } =
    useRegionSelection()
  const {
    customAreas,
    ready,
    configured,
    error,
    load,
    ensureDrafts,
    saveCustomArea,
    removeCustomArea,
  } = useCatalog()

  useEffect(() => {
    let cancelled = false
    loadRoomImage().then((loaded) => {
      if (!cancelled) setImage(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (ready) ensureDrafts(customAreas)
  }, [ready, customAreas, ensureDrafts])

  const regions = useMemo(() => regionsWithCustom(customAreas), [customAreas])
  const materialsById = useMemo(() => buildMaterialMap(customAreas), [customAreas])
  const activeRegion = regions.find((region) => region.id === activeRegionId) || null
  const activeCategory = categoryForRegion(activeRegion, customAreas)
  const appliedId = activeRegion ? selections[activeRegion.id] : null
  const applied = appliedId ? materialsById.get(appliedId) || null : null

  async function handleDeleteArea(id) {
    await removeCustomArea(id)
    clearRegion(id)
  }

  return (
    <div className="app">
      <header className="topbar">
        <h1>Material Configurator</h1>
        <div className="topbar-spacer" />
        <button type="button" onClick={resetAll}>
          Reset All
        </button>
        <div className="mode-toggle" role="group" aria-label="View">
          <button
            type="button"
            aria-pressed={mode === 'configurator'}
            onClick={() => setMode('configurator')}
          >
            Configurator
          </button>
          <button type="button" aria-pressed={mode === 'editor'} onClick={() => setMode('editor')}>
            Mask Editor
          </button>
        </div>
      </header>
      {image?.placeholder ? (
        <p className="banner">
          Showing a generated stand-in. Add your photo at <code>public/assets/room-base.jpg</code> and
          reload.
        </p>
      ) : null}
      {error ? <p className="banner">{error}</p> : null}
      {!image ? (
        <p className="loading">Loading photo…</p>
      ) : mode === 'configurator' ? (
        <div className="workspace">
          <RoomCanvas
            image={image}
            regions={regions}
            selections={selections}
            activeRegionId={activeRegionId}
            onSelectRegion={selectRegion}
            materialsById={materialsById}
          />
          <MaterialPanel
            region={activeRegion}
            category={activeCategory}
            applied={applied}
            onApply={applyMaterial}
          />
        </div>
      ) : (
        <MaskEditor
          image={image}
          customAreas={customAreas}
          configured={configured}
          onSave={saveCustomArea}
          onDelete={handleDeleteArea}
          onReload={load}
        />
      )}
    </div>
  )
}
