'use client'

import { useEffect, useCallback } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSocket } from './use-socket'
import { useMessagesStore } from '@/store/messages'
import { useAuthStore } from '@/store/auth'
import { joinChannel, leaveChannel, getSocket } from './use-socket'
import type { Message } from '@nexora/types'

interface MessagesPage {
  messages: Message[]
  hasMore: boolean
}

export function useChannelMessages(channelId: string) {
  const { on } = useSocket()
  const { setMessages, prependMessages, addMessage, updateMessage, removeMessage, setTyping } =
    useMessagesStore()
  const { user } = useAuthStore()

  // Fetch paginated messages
  const query = useInfiniteQuery({
    queryKey: ['messages', channelId],
    queryFn: async ({ pageParam }) => {
      const res = await api.get<MessagesPage>('/messages', {
        params: { channelId, before: pageParam, limit: 50 },
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
    setMessages(channelId, allMessages)
  }, [query.data, channelId, setMessages])

  // Join WebSocket channel room.
  // Also re-join on socket reconnect — handles the case where the socket
  // wasn't connected yet when the component mounted (token was null, socket
  // hadn't been created) and only became available after the first API
  // token refresh.
  useEffect(() => {
    joinChannel(channelId)

    const socket = getSocket()
    const onConnect = () => joinChannel(channelId)
    socket?.on('connect', onConnect)

    return () => {
      leaveChannel(channelId)
      socket?.off('connect', onConnect)
    }
  }, [channelId])

  // Wire WebSocket events
  useEffect(() => {
    const offNew = on<Message>('message:new', (msg) => {
      if (msg.channelId === channelId) {
        addMessage(channelId, msg)
      }
    })

    const offEdited = on<Message>('message:edited', (msg) => {
      if (msg.channelId === channelId) {
        updateMessage(channelId, msg.id, msg)
      }
    })

    const offDeleted = on<{ messageId: string; channelId: string }>('message:deleted', ({ messageId, channelId: cId }) => {
      if (cId === channelId) {
        removeMessage(channelId, messageId)
      }
    })

    const offTyping = on<{ channelId: string; userId: string; username: string; typing: boolean }>('typing:update', (data) => {
      if (data.channelId === channelId && data.userId !== user?.id) {
        setTyping(channelId, data.userId, data.username, data.typing)
      }
    })

    return () => {
      offNew()
      offEdited()
      offDeleted()
      offTyping()
    }
  }, [channelId, on, addMessage, updateMessage, removeMessage, setTyping, user?.id])

  const loadMore = useCallback(() => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage()
    }
  }, [query])

  return { ...query, loadMore }
}
