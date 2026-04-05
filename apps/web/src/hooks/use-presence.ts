'use client'

import { useEffect, useRef } from 'react'
import { getSocket } from './use-socket'
import { useAuthStore } from '@/store/auth'
import type { PresenceStatus } from '@nexora/types'

// Throttle activity events — emit at most once per minute
const ACTIVITY_THROTTLE_MS = 60_000

export function usePresence() {
  const user = useAuthStore((s) => s.user)
  const updateUser = useAuthStore((s) => s.updateUser)
  const lastEmitRef = useRef(0)

  // Listen for presence:changed and keep the auth store in sync
  useEffect(() => {
    const socket = getSocket()
    if (!socket) { return }

    const handler = ({ userId, status }: { userId: string; status: string }) => {
      if (userId === user?.id) {
        updateUser({ presence: status as PresenceStatus })
      }
    }

    socket.on('presence:changed', handler)
    return () => { socket.off('presence:changed', handler) }
  }, [user?.id, updateUser])

  // Detect user activity and emit presence:activity (throttled)
  useEffect(() => {
    const emitActivity = () => {
      const now = Date.now()
      if (now - lastEmitRef.current < ACTIVITY_THROTTLE_MS) { return }
      lastEmitRef.current = now
      getSocket()?.emit('presence:activity')
    }

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'wheel'] as const
    for (const event of events) {
      window.addEventListener(event, emitActivity, { passive: true })
    }
    return () => {
      for (const event of events) {
        window.removeEventListener(event, emitActivity)
      }
    }
  }, [])
}
