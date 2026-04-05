import { create } from 'zustand'
import { nanoid } from 'nanoid'

export type NotifType = 'success' | 'error' | 'warning' | 'info'

export interface Notification {
  id: string
  type: NotifType
  title: string
  message?: string
  duration?: number // ms, 0 = persistent
  createdAt: number
}

interface NotifStore {
  notifications: Notification[]
  unreadMentions: number
  push: (n: Omit<Notification, 'id' | 'createdAt'>) => void
  dismiss: (id: string) => void
  clearAll: () => void
  incrementMentions: () => void
  clearMentions: () => void
}

export const useNotifStore = create<NotifStore>((set) => ({
  notifications: [],
  unreadMentions: 0,

  push: (n) => {
    const id = nanoid(8)
    const notif: Notification = { ...n, id, createdAt: Date.now() }
    set((state) => ({ notifications: [...state.notifications, notif] }))

    const duration = n.duration ?? 4000
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          notifications: state.notifications.filter((x) => x.id !== id),
        }))
      }, duration)
    }
  },

  dismiss: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    })),

  clearAll: () => set({ notifications: [] }),
  incrementMentions: () => set((s) => ({ unreadMentions: s.unreadMentions + 1 })),
  clearMentions: () => set({ unreadMentions: 0 }),
}))

// Convenience helpers
export const notify = {
  success: (title: string, message?: string) =>
    useNotifStore.getState().push({ type: 'success', title, ...(message !== undefined && { message }) }),
  error: (title: string, message?: string) =>
    useNotifStore.getState().push({ type: 'error', title, duration: 6000, ...(message !== undefined && { message }) }),
  warning: (title: string, message?: string) =>
    useNotifStore.getState().push({ type: 'warning', title, ...(message !== undefined && { message }) }),
  info: (title: string, message?: string) =>
    useNotifStore.getState().push({ type: 'info', title, ...(message !== undefined && { message }) }),
}
