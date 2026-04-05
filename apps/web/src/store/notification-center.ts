import { create } from 'zustand'
import type { AppNotification } from '@nexora/types'

interface NotificationCenterStore {
  notifications: AppNotification[]
  unreadCount: number
  // channelId → unread mention count
  mentionedChannels: Record<string, number>

  setNotifications: (items: AppNotification[], unreadCount: number) => void
  addNotification: (item: AppNotification) => void
  markRead: (id: string) => void
  markAllRead: () => void
  removeNotification: (id: string) => void
  clearAll: () => void
  addMention: (channelId: string) => void
  clearMention: (channelId: string) => void
}

export const useNotificationCenter = create<NotificationCenterStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  mentionedChannels: {},

  setNotifications: (notifications, unreadCount) => set({ notifications, unreadCount }),

  addNotification: (item) =>
    set((s) => ({
      notifications: [item, ...s.notifications].slice(0, 60),
      unreadCount: s.unreadCount + (item.read ? 0 : 1),
    })),

  markRead: (id) =>
    set((s) => {
      const notif = s.notifications.find((n) => n.id === id)
      if (!notif || notif.read) { return s }
      return {
        notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
        unreadCount: Math.max(0, s.unreadCount - 1),
      }
    }),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((s) => {
      const notif = s.notifications.find((n) => n.id === id)
      return {
        notifications: s.notifications.filter((n) => n.id !== id),
        unreadCount: notif && !notif.read ? Math.max(0, s.unreadCount - 1) : s.unreadCount,
      }
    }),

  clearAll: () => set({ notifications: [], unreadCount: 0 }),

  addMention: (channelId) =>
    set((s) => ({
      mentionedChannels: {
        ...s.mentionedChannels,
        [channelId]: (s.mentionedChannels[channelId] ?? 0) + 1,
      },
    })),

  clearMention: (channelId) =>
    set((s) => {
      const next = { ...s.mentionedChannels }
      delete next[channelId]
      return { mentionedChannels: next }
    }),
}))
