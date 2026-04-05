import { create } from 'zustand'
import type { Message } from '@nexora/types'

interface MessagesStore {
  // channelId → messages (newest last)
  channels: Record<string, Message[]>
  // channelId → typing user ids
  typingUsers: Record<string, { userId: string; username: string }[]>

  setMessages: (channelId: string, messages: Message[]) => void
  prependMessages: (channelId: string, messages: Message[]) => void // older messages
  addMessage: (channelId: string, message: Message) => void
  updateMessage: (channelId: string, messageId: string, partial: Partial<Message>) => void
  removeMessage: (channelId: string, messageId: string) => void

  setTyping: (channelId: string, userId: string, username: string, typing: boolean) => void
}

export const useMessagesStore = create<MessagesStore>((set) => ({
  channels: {},
  typingUsers: {},

  setMessages: (channelId, messages) =>
    set((s) => ({ channels: { ...s.channels, [channelId]: messages } })),

  prependMessages: (channelId, older) =>
    set((s) => ({
      channels: {
        ...s.channels,
        [channelId]: [...older, ...(s.channels[channelId] ?? [])],
      },
    })),

  addMessage: (channelId, message) =>
    set((s) => ({
      channels: {
        ...s.channels,
        [channelId]: [...(s.channels[channelId] ?? []), message],
      },
    })),

  updateMessage: (channelId, messageId, partial) =>
    set((s) => ({
      channels: {
        ...s.channels,
        [channelId]: (s.channels[channelId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...partial } : m,
        ),
      },
    })),

  removeMessage: (channelId, messageId) =>
    set((s) => ({
      channels: {
        ...s.channels,
        [channelId]: (s.channels[channelId] ?? []).filter((m) => m.id !== messageId),
      },
    })),

  setTyping: (channelId, userId, username, typing) =>
    set((s) => {
      const current = s.typingUsers[channelId] ?? []
      const filtered = current.filter((u) => u.userId !== userId)
      return {
        typingUsers: {
          ...s.typingUsers,
          [channelId]: typing ? [...filtered, { userId, username }] : filtered,
        },
      }
    }),
}))
