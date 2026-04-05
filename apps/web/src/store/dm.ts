import { create } from 'zustand'
import type { DmMessage, DmConversation } from '@nexora/types'

interface DmStore {
  conversations: DmConversation[]
  // conversationId → messages (newest last)
  messages: Record<string, DmMessage[]>

  setConversations: (convs: DmConversation[]) => void
  upsertConversation: (conv: DmConversation) => void
  setMessages: (conversationId: string, messages: DmMessage[]) => void
  prependMessages: (conversationId: string, older: DmMessage[]) => void
  addMessage: (conversationId: string, message: DmMessage) => void
  updateMessage: (conversationId: string, messageId: string, partial: Partial<DmMessage>) => void
  removeMessage: (conversationId: string, messageId: string) => void
}

export const useDmStore = create<DmStore>((set) => ({
  conversations: [],
  messages: {},

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conv) =>
    set((s) => {
      const exists = s.conversations.some((c) => c.id === conv.id)
      return {
        conversations: exists
          ? s.conversations.map((c) => (c.id === conv.id ? conv : c))
          : [conv, ...s.conversations],
      }
    }),

  setMessages: (conversationId, messages) =>
    set((s) => ({ messages: { ...s.messages, [conversationId]: messages } })),

  prependMessages: (conversationId, older) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...older, ...(s.messages[conversationId] ?? [])],
      },
    })),

  addMessage: (conversationId, message) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [...(s.messages[conversationId] ?? []), message],
      },
    })),

  updateMessage: (conversationId, messageId, partial) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).map((m) =>
          m.id === messageId ? { ...m, ...partial } : m,
        ),
      },
    })),

  removeMessage: (conversationId, messageId) =>
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: (s.messages[conversationId] ?? []).filter((m) => m.id !== messageId),
      },
    })),
}))
