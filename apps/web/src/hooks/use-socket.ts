'use client'

import { useEffect, useRef, useCallback } from 'react'
import { io, type Socket } from 'socket.io-client'
import { useAuthStore } from '@/store/auth'

const API_URL = process.env['NEXT_PUBLIC_API_URL']?.replace('/api', '') ?? 'http://localhost:3001'

let globalSocket: Socket | null = null

export function useSocket() {
  const { accessToken } = useAuthStore()
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!accessToken) { return }

    if (!globalSocket || !globalSocket.connected) {
      globalSocket = io(API_URL, {
        auth: { token: accessToken },
        transports: ['websocket'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      })
    }

    socketRef.current = globalSocket

    return () => {
      // Don't disconnect on unmount — keep one global connection
    }
  }, [accessToken])

  const emit = useCallback(<T>(event: string, data?: T) => {
    globalSocket?.emit(event, data)
  }, [])

  const on = useCallback(<T>(event: string, handler: (data: T) => void) => {
    globalSocket?.on(event, handler)
    return () => { globalSocket?.off(event, handler) }
  }, [])

  return { socket: socketRef.current, emit, on }
}

export function getSocket() {
  return globalSocket
}

export function joinChannel(channelId: string) {
  globalSocket?.emit('channel:join', { channelId })
}

export function leaveChannel(channelId: string) {
  globalSocket?.emit('channel:leave', { channelId })
}

export function emitTypingStart(channelId: string) {
  globalSocket?.emit('typing:start', { channelId })
}

export function emitTypingStop(channelId: string) {
  globalSocket?.emit('typing:stop', { channelId })
}
