'use client'

import { useEffect, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSocket } from './use-socket'
import { joinDM, leaveDM, getSocket } from './use-socket'
import { useDmStore } from '@/store/dm'
import { useAuthStore } from '@/store/auth'
import type { DmMessage } from '@nexora/types'

interface MessagesPage {
  messages: DmMessage[]
  hasMore: boolean
}

export function useDmMessages(conversationId: string) {
  const { on } = useSocket()
  const { setMessages, prependMessages, addMessage, updateMessage, removeMessage } = useDmStore()
  const { user } = useAuthStore()

  // Fetch paginated messages
  const query = useInfiniteQuery({
    queryKey: ['dm-messages', conversationId],
    queryFn: async ({ pageParam }) => {
      const res = await api.get<MessagesPage>(`/dms/${conversationId}/messages`, {
        params: { before: pageParam, limit: 50 },
      })
      return res.data
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.hasMore) { return undefined }
      const oldest = lastPage.messages[0]
      return oldest?.createdAt
    },
    initialPageParam: undefined as string | undefined,
  })

  // Seed store from query data
  useEffect(() => {
    if (!query.data) { return }
    const allMessages = query.data.pages.flatMap((p) => p.messages)
    setMessages(conversationId, allMessages)
  }, [query.data, conversationId, setMessages])

  // Join DM socket room; re-join on reconnect
  useEffect(() => {
    joinDM(conversationId)

    const socket = getSocket()
    const onConnect = () => joinDM(conversationId)
    socket?.on('connect', onConnect)

    return () => {
      leaveDM(conversationId)
      socket?.off('connect', onConnect)
    }
  }, [conversationId])

  // Wire real-time events
  useEffect(() => {
    const offNew = on<DmMessage>('dm:message:new', (msg) => {
      if (msg.conversationId === conversationId) {
        addMessage(conversationId, msg)
      }
    })

    const offEdited = on<DmMessage>('dm:message:edited', (msg) => {
      if (msg.conversationId === conversationId) {
        updateMessage(conversationId, msg.id, msg)
      }
    })

    const offDeleted = on<{ messageId: string; conversationId: string }>(
      'dm:message:deleted',
      ({ messageId, conversationId: cId }) => {
        if (cId === conversationId) {
          removeMessage(conversationId, messageId)
        }
      },
    )

    return () => {
      offNew()
      offEdited()
      offDeleted()
    }
  }, [conversationId, on, addMessage, updateMessage, removeMessage, user?.id])

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage()
    }
  }, [query])

  return { ...query, loadMore }
}
