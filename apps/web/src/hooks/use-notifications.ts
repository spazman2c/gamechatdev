'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getSocket } from './use-socket'
import { useNotificationCenter } from '@/store/notification-center'
import { useAuthStore } from '@/store/auth'
import { playNotificationSound, playMentionSound } from '@/lib/notification-sound'
import type { AppNotification, NotificationSettings } from '@nexora/types'

export function useNotifications() {
  const { setNotifications, addNotification } = useNotificationCenter()
  const user = useAuthStore((s) => s.user)

  // Fetch on mount
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const res = await api.get<{ notifications: AppNotification[]; unreadCount: number }>('/notifications')
      return res.data
    },
    staleTime: 60_000,
  })

  useEffect(() => {
    if (data) {
      setNotifications(data.notifications, data.unreadCount)
    }
  }, [data, setNotifications])

  // Sync sound preference from server on load
  const { data: settingsData } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const res = await api.get<{ notifSounds: boolean }>('/notifications/settings')
      return res.data
    },
    staleTime: 5 * 60_000,
  })

  useEffect(() => {
    if (settingsData) {
      window.__nexoraSoundsEnabled = settingsData.notifSounds
    }
  }, [settingsData])

  // Listen for real-time notifications
  useEffect(() => {
    const socket = getSocket()
    if (!socket) { return }

    const handler = (notif: AppNotification) => {
      // Only handle notifications for the current user
      if (notif.userId !== user?.id) { return }
      addNotification(notif)

      // Play sound based on type
      // Sound settings are stored in the server; we check them via the store
      // Default to playing sounds unless explicitly disabled
      const soundsEnabled = window.__nexoraSoundsEnabled !== false
      if (soundsEnabled) {
        if (notif.type === 'mention') {
          playMentionSound()
        } else {
          playNotificationSound()
        }
      }

      // Desktop notification
      if (
        typeof Notification !== 'undefined' &&
        Notification.permission === 'granted' &&
        document.hidden
      ) {
        new Notification(notif.title, {
          ...(notif.body ? { body: notif.body } : {}),
          icon: '/favicon.ico',
          tag: notif.id,
        })
      }
    }

    socket.on('notification:new', handler)
    return () => { socket.off('notification:new', handler) }
  }, [user?.id, addNotification])
}

export function useNotificationSettings() {
  return useQuery({
    queryKey: ['notification-settings'],
    queryFn: async () => {
      const res = await api.get<NotificationSettings>('/notifications/settings')
      return res.data
    },
    staleTime: 5 * 60_000,
  })
}

// Global flag for sound setting (set by settings page after fetching)
declare global {
  interface Window {
    __nexoraSoundsEnabled?: boolean
  }
}
