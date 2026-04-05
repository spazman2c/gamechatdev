'use client'

import { useEffect } from 'react'
import { useSocket } from '@/hooks/use-socket'
import { useHubStore, type VoiceParticipant } from '@/store/hub'

export function useHubSocket(hubId: string | null) {
  const { emit, on } = useSocket()
  const { setVoiceParticipants, addVoiceParticipant, removeVoiceParticipant } = useHubStore()

  useEffect(() => {
    if (!hubId) { return }

    emit('hub:join', { hubId })

    const offSnapshot = on<{ rooms: Record<string, VoiceParticipant[]> }>(
      'voice:snapshot',
      ({ rooms }) => {
        for (const [channelId, participants] of Object.entries(rooms)) {
          setVoiceParticipants(channelId, participants.map((p) => ({ ...p, isSpeaking: false })))
        }
      },
    )

    const offJoined = on<{ channelId: string; participant: Omit<VoiceParticipant, 'isSpeaking'> }>(
      'voice:user_joined',
      ({ channelId, participant }) => {
        addVoiceParticipant(channelId, { ...participant, isSpeaking: false })
      },
    )

    const offLeft = on<{ channelId: string; userId: string }>(
      'voice:user_left',
      ({ channelId, userId }) => {
        removeVoiceParticipant(channelId, userId)
      },
    )

    return () => {
      emit('hub:leave', { hubId })
      offSnapshot()
      offJoined()
      offLeft()
    }
  // emit and on are stable useCallback refs; include hubId as the only real dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubId])
}
