import { useEffect, useState } from 'react'
import MaterialPanel from './components/MaterialPanel'
import MaskEditor from './components/MaskEditor'
import RoomCanvas from './components/RoomCanvas'
import { regions } from './data/regions'
import { useRegionSelection } from './hooks/useRegionSelection'
import { loadRoomImage } from './lib/loadRoomImage'
import './App.css'

export default function App() {
  const [mode, setMode] = useState('configurator')
  const [image, setImage] = useState(null)
  const { selections, activeRegionId, selectRegion, applyMaterial, resetAll } = useRegionSelection()

  useEffect(() => {
    let cancelled = false
    loadRoomImage().then((loaded) => {
      if (!cancelled) setImage(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const activeRegion = regions.find((region) => region.id === activeRegionId) || null

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
          />
          <MaterialPanel
            region={activeRegion}
            selectionId={activeRegion ? selections[activeRegion.id] : null}
            onApply={applyMaterial}
          />
        </div>
      ) : (
        <MaskEditor image={image} />
      )}
    </div>
  )
}
