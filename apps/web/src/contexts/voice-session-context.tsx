'use client'

import { createContext, useContext, useState, useCallback, useMemo } from 'react'
import { useWebRTC } from '@/hooks/use-webrtc'
import type { UseWebRTCReturn } from '@/hooks/use-webrtc'

interface VoiceSession {
  activeChannelId: string | null
  join: (channelId: string) => void
  disconnect: () => void
  session: UseWebRTCReturn
}

const VoiceSessionContext = createContext<VoiceSession | null>(null)

export function VoiceSessionProvider({ children }: { children: React.ReactNode }) {
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null)

  const disconnect = useCallback(() => {
    setActiveChannelId(null)
  }, [])

  const session = useWebRTC({ channelId: activeChannelId })

  const join = useCallback((channelId: string) => {
    setActiveChannelId(channelId)
  }, [])

  const value = useMemo(() => ({
    activeChannelId,
    join,
    disconnect,
    session,
  }), [activeChannelId, join, disconnect, session])

  return (
    <VoiceSessionContext.Provider value={value}>
      {children}
    </VoiceSessionContext.Provider>
  )
}

export function useVoiceSession(): VoiceSession {
  const ctx = useContext(VoiceSessionContext)
  if (!ctx) { throw new Error('useVoiceSession must be used within VoiceSessionProvider') }
  return ctx
}
