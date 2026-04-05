'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSocket } from '@/hooks/use-socket'
import { useHubStore, type VoiceParticipant } from '@/store/hub'

export function useHubSocket(hubId: string | null) {
  const { emit, on } = useSocket()
  const { setVoiceParticipants, addVoiceParticipant, removeVoiceParticipant } = useHubStore()
  const queryClient = useQueryClient()

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

    const offRolesUpdated = on<unknown>(
      'hub:roles_updated',
      () => {
        queryClient.invalidateQueries({ queryKey: ['roles', hubId] })
      },
    )

    // Live-patch the members list when any member's presence changes.
    // This avoids a full refetch and keeps the online/offline sections instant.
    const offPresence = on<{ userId: string; status: string }>(
      'presence:changed',
      ({ userId, status }) => {
        type MemberUser = { id: string; username: string; displayName: string | null; avatarUrl: string | null; presence: string }
        type HubMember = { userId: string; nickname: string | null; user: MemberUser }
        queryClient.setQueryData<HubMember[]>(['hub-members', hubId], (old) =>
          old?.map((m) =>
            m.userId === userId ? { ...m, user: { ...m.user, presence: status } } : m,
          ),
        )
      },
    )

    return () => {
      emit('hub:leave', { hubId })
      offSnapshot()
      offJoined()
      offLeft()
      offRolesUpdated()
      offPresence()
    }
  // emit and on are stable useCallback refs; include hubId as the only real dep
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hubId])
}
