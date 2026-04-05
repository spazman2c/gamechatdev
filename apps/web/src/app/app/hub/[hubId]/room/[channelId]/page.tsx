'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useHubStore } from '@/store/hub'
import { useVoiceSession } from '@/contexts/voice-session-context'
import { VoiceRoom } from '@/components/voice/voice-room'

export default function RoomPage() {
  const { hubId, channelId } = useParams<{ hubId: string; channelId: string }>()
  const { channels } = useHubStore()
  const router = useRouter()
  const { join, disconnect, activeChannelId } = useVoiceSession()
  const wasActiveRef = useRef(false)

  const channel = channels.find((c) => c.id === channelId)

  // Capture the active channel at render time so we can read it inside the effect
  // without adding it as a dep (which would re-fire the effect on every voice state change).
  const activeChannelIdRef = useRef(activeChannelId)
  activeChannelIdRef.current = activeChannelId

  // Join on mount — only if not already connected to this channel.
  useEffect(() => {
    if (activeChannelIdRef.current !== channelId) {
      join(channelId)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, join])  // intentionally omit activeChannelId — use ref above

  // If voice was active but then disconnect() was called externally (e.g. status bar),
  // navigate away from the voice room page.
  useEffect(() => {
    if (activeChannelId === channelId) {
      wasActiveRef.current = true
    } else if (wasActiveRef.current && activeChannelId === null) {
      router.push(`/app/hub/${hubId}`)
    }
  }, [activeChannelId, channelId, hubId, router])

  const handleLeave = useCallback(() => {
    disconnect()
    router.push(`/app/hub/${hubId}`)
  }, [disconnect, hubId, router])

  return (
    <div className="flex flex-col h-full">
      <VoiceRoom
        channelId={channelId}
        channelName={channel?.name ?? 'Voice Room'}
        onLeave={handleLeave}
      />
    </div>
  )
}
