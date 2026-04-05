import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface HubUIState {
  // Per-user preference: userId → members panel open
  membersPanelByUser: Record<string, boolean>
  toggleMembers: (userId: string) => void
  setShowMembers: (userId: string, open: boolean) => void
}

export const useHubUI = create<HubUIState>()(
  persist(
    (set) => ({
      membersPanelByUser: {},

      toggleMembers: (userId) =>
        set((s) => ({
          membersPanelByUser: {
            ...s.membersPanelByUser,
            [userId]: !s.membersPanelByUser[userId],
          },
        })),

      setShowMembers: (userId, open) =>
        set((s) => ({
          membersPanelByUser: {
            ...s.membersPanelByUser,
            [userId]: open,
          },
        })),
    }),
    {
      name: 'nexora-hub-ui',
    },
  ),
)
