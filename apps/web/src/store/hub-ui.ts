import { create } from 'zustand'

interface HubUIState {
  showMembers: boolean
  toggleMembers: () => void
  closeMembers: () => void
}

export const useHubUI = create<HubUIState>((set) => ({
  showMembers: false,
  toggleMembers: () => set((s) => ({ showMembers: !s.showMembers })),
  closeMembers: () => set({ showMembers: false }),
}))
