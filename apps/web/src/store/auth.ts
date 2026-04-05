import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { PublicUser } from '@nexora/types'

interface AuthState {
  accessToken: string | null
  user: PublicUser | null
  isAuthenticated: boolean
  setAuth: (token: string, user: PublicUser) => void
  updateUser: (partial: Partial<PublicUser>) => void
  clearAuth: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      isAuthenticated: false,

      setAuth: (accessToken, user) => {
        set({ accessToken, user, isAuthenticated: true })
      },

      updateUser: (partial) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...partial } : null,
        })),

      clearAuth: () => {
        set({ accessToken: null, user: null, isAuthenticated: false })
      },
    }),
    {
      name: 'nexora-auth',
      partialize: (state) => ({
        // Don't persist the access token — re-fetch on load
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
)
