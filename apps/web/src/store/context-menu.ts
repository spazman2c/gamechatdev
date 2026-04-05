import { create } from 'zustand'

export interface ContextMenuTarget {
  userId: string
  username: string
  displayName: string | null
}

export interface ContextMenuAnchor {
  x: number
  y: number
}

interface ContextMenuState {
  target: ContextMenuTarget | null
  anchor: ContextMenuAnchor | null
  channelId: string | null | undefined
  open: (target: ContextMenuTarget, anchor: ContextMenuAnchor, channelId?: string) => void
  close: () => void
}

export const useContextMenu = create<ContextMenuState>((set) => ({
  target: null,
  anchor: null,
  channelId: null,
  open: (target, anchor, channelId) => set({ target, anchor, channelId }),
  close: () => set({ target: null, anchor: null, channelId: null }),
}))

/** Imperative helper — call from anywhere without a React hook. */
export function openContextMenu(
  target: ContextMenuTarget,
  anchor: ContextMenuAnchor,
  channelId?: string,
) {
  useContextMenu.getState().open(target, anchor, channelId)
}
