import { create } from 'zustand'

interface InviteModalState {
  hubId: string | null
  hubName: string | null
  open: (hubId: string, hubName: string) => void
  close: () => void
}

export const useInviteModal = create<InviteModalState>((set) => ({
  hubId: null,
  hubName: null,
  open: (hubId, hubName) => set({ hubId, hubName }),
  close: () => set({ hubId: null, hubName: null }),
}))

export function openInviteModal(hubId: string, hubName: string) {
  useInviteModal.getState().open(hubId, hubName)
}
