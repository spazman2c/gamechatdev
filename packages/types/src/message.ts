import type { PublicUser } from './user'

export interface DmMessage {
  id: string
  conversationId: string
  author: PublicUser | null
  content: string | null
  replyToId: string | null
  isEdited: boolean
  editedAt: string | null
  createdAt: string
}

export interface DmConversation {
  id: string
  isGroup: boolean
  name: string | null
  participants: Array<{ user: PublicUser }>
  createdAt: string
}

export interface MessageAttachment {
  id: string
  messageId: string
  url: string
  filename: string | null
  contentType: string | null
  sizeBytes: number | null
  width: number | null
  height: number | null
}

export interface MessageReaction {
  emoji: string
  count: number
  userIds: string[]
  me: boolean
}

export interface Message {
  id: string
  channelId: string
  author: PublicUser | null
  content: string | null
  replyTo: Message | null
  attachments: MessageAttachment[]
  reactions: MessageReaction[]
  isPinned: boolean
  isEdited: boolean
  editedAt: string | null
  createdAt: string
}

// WebSocket payloads
export interface MessageSendPayload {
  channelId: string
  content: string
  replyToId?: string
}

export interface MessageEditPayload {
  messageId: string
  content: string
}

export interface TypingPayload {
  channelId: string
  userId: string
  username: string
}
