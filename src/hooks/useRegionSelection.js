import { create } from 'zustand'

const useSelectionStore = create((set) => ({
  selections: {},
  activeRegionId: null,
  selectRegion: (regionId) => set({ activeRegionId: regionId }),
  applyMaterial: (regionId, materialId) =>
    set((state) => ({
      selections: { ...state.selections, [regionId]: materialId },
    })),
  resetAll: () => set({ selections: {}, activeRegionId: null }),
}))

export function useRegionSelection() {
  const selections = useSelectionStore((state) => state.selections)
  const activeRegionId = useSelectionStore((state) => state.activeRegionId)
  const selectRegion = useSelectionStore((state) => state.selectRegion)
  const applyMaterial = useSelectionStore((state) => state.applyMaterial)
  const resetAll = useSelectionStore((state) => state.resetAll)
  return { selections, activeRegionId, selectRegion, applyMaterial, resetAll }
}
