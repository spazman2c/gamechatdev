import { create } from 'zustand'

interface MentionState {
  pendingMention: string | null
  setPendingMention: (username: string) => void
  clearMention: () => void
}

export const useMentionStore = create<MentionState>((set) => ({
  pendingMention: null,
  setPendingMention: (username) => set({ pendingMention: username }),
  clearMention: () => set({ pendingMention: null }),
}))

/** Imperative helpers */
export function setPendingMention(username: string) {
  useMentionStore.getState().setPendingMention(username)
}

export function clearMention() {
  useMentionStore.getState().clearMention()
}
