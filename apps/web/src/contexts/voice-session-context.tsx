'use client'

import { createContext, useContext, useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useWebRTC } from '@/hooks/use-webrtc'
import type { UseWebRTCReturn, RoomParticipant } from '@/hooks/use-webrtc'
import { useAuthStore } from '@/store/auth'

interface VoiceSession {
  activeChannelId: string | null
  join: (channelId: string) => void
  disconnect: () => void
  session: UseWebRTCReturn
}

const VoiceSessionContext = createContext<VoiceSession | null>(null)

/**
 * Renders a hidden <audio> element for every remote participant that has a
 * stream. These are mounted at the provider level so audio keeps playing
 * regardless of which page the user navigates to.
 */
function PersistentAudioOutputs({ participants }: { participants: RoomParticipant[] }) {
  const userId = useAuthStore((s) => s.user?.id)

  // Only remote participants with a stream
  const remotes = participants.filter((p) => p.userId !== userId && p.stream)

  return (
    <>
      {remotes.map((p) => (
        <HiddenAudio key={p.userId} stream={p.stream!} />
      ))}
    </>
  )
}

function HiddenAudio({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLAudioElement>(null)
  useEffect(() => {
    if (ref.current) {
      ref.current.srcObject = stream
    }
  }, [stream])
  return <audio ref={ref} autoPlay style={{ display: 'none' }} />
}

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
      {/* Always-mounted audio elements ensure voice is heard on any page */}
      <PersistentAudioOutputs participants={session.participants} />
      {children}
    </VoiceSessionContext.Provider>
  )
}

export function useVoiceSession(): VoiceSession {
  const ctx = useContext(VoiceSessionContext)
  if (!ctx) { throw new Error('useVoiceSession must be used within VoiceSessionProvider') }
  return ctx
}
