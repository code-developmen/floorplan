import { create } from 'zustand'
import { areaToDraft } from '../lib/areaModel'
import { deleteArea, fetchAreas, saveArea } from '../lib/areasApi'
import { isSupabaseConfigured } from '../lib/supabaseClient'

const useCatalogStore = create((set) => ({
  customAreas: [],
  drafts: null,
  ready: false,
  configured: isSupabaseConfigured(),
  error: null,
  ensureDrafts: (areas) =>
    set((state) => (state.drafts ? state : { drafts: areas.map(areaToDraft) })),
  setDrafts: (updater) =>
    set((state) => ({
      drafts: typeof updater === 'function' ? updater(state.drafts || []) : updater,
    })),
  load: async () => {
    if (!isSupabaseConfigured()) {
      set({ customAreas: [], ready: true, configured: false, error: null })
      return []
    }
    set({ configured: true, error: null })
    try {
      const customAreas = await fetchAreas()
      set({ customAreas, ready: true, error: null })
      return customAreas
    } catch (error) {
      set({
        ready: true,
        error: error instanceof Error ? error.message : 'Could not load areas.',
      })
      return null
    }
  },
  saveCustomArea: async (area) => {
    const saved = await saveArea(area)
    set((state) => {
      const exists = state.customAreas.some((item) => item.id === saved.id)
      const customAreas = exists
        ? state.customAreas.map((item) => (item.id === saved.id ? saved : item))
        : [...state.customAreas, saved]
      return { customAreas, error: null }
    })
    return saved
  },
  removeCustomArea: async (id) => {
    await deleteArea(id)
    set((state) => ({
      customAreas: state.customAreas.filter((item) => item.id !== id),
    }))
  },
}))

export function useCatalog() {
  const customAreas = useCatalogStore((state) => state.customAreas)
  const drafts = useCatalogStore((state) => state.drafts)
  const ready = useCatalogStore((state) => state.ready)
  const configured = useCatalogStore((state) => state.configured)
  const error = useCatalogStore((state) => state.error)
  const load = useCatalogStore((state) => state.load)
  const ensureDrafts = useCatalogStore((state) => state.ensureDrafts)
  const setDrafts = useCatalogStore((state) => state.setDrafts)
  const saveCustomArea = useCatalogStore((state) => state.saveCustomArea)
  const removeCustomArea = useCatalogStore((state) => state.removeCustomArea)
  return {
    customAreas,
    drafts,
    ready,
    configured,
    error,
    load,
    ensureDrafts,
    setDrafts,
    saveCustomArea,
    removeCustomArea,
  }
}
