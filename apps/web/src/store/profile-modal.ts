import { create } from 'zustand'

export interface ProfileAnchor {
  x: number
  y: number
}

interface ProfileModalState {
  userId: string | null
  anchor: ProfileAnchor | null | undefined
  openProfile: (userId: string, anchor?: ProfileAnchor) => void
  closeProfile: () => void
}

export const useProfileModal = create<ProfileModalState>((set) => ({
  userId: null,
  anchor: null,
  openProfile: (userId, anchor) => set({ userId, anchor }),
  closeProfile: () => set({ userId: null, anchor: null }),
}))

/** Imperative helper — call from anywhere without a React hook. */
export function openProfile(userId: string, anchor?: ProfileAnchor) {
  useProfileModal.getState().openProfile(userId, anchor)
}
