import { create } from 'zustand'

const useSelectionStore = create((set) => ({
  selections: {},
  activeRegionId: null,
  selectRegion: (regionId) => set({ activeRegionId: regionId }),
  applyMaterial: (regionId, materialId) =>
    set((state) => ({
      selections: { ...state.selections, [regionId]: materialId },
    })),
  clearRegion: (regionId) =>
    set((state) => {
      if (!regionId) return state
      const selections = { ...state.selections }
      delete selections[regionId]
      return {
        selections,
        activeRegionId: state.activeRegionId === regionId ? null : state.activeRegionId,
      }
    }),
  resetAll: () => set({ selections: {}, activeRegionId: null }),
}))

export function useRegionSelection() {
  const selections = useSelectionStore((state) => state.selections)
  const activeRegionId = useSelectionStore((state) => state.activeRegionId)
  const selectRegion = useSelectionStore((state) => state.selectRegion)
  const applyMaterial = useSelectionStore((state) => state.applyMaterial)
  const clearRegion = useSelectionStore((state) => state.clearRegion)
  const resetAll = useSelectionStore((state) => state.resetAll)
  return { selections, activeRegionId, selectRegion, applyMaterial, clearRegion, resetAll }
}
