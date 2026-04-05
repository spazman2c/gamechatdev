'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { use } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Send, Paperclip, SmilePlus, MoreHorizontal, Phone, Video, X, Edit2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMessageTime, formatDateDivider } from '@/lib/utils'
import { Avatar } from '@nexora/ui/avatar'
import { SkeletonMessage } from '@nexora/ui/skeleton'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { useDmStore } from '@/store/dm'
import { useDmMessages } from '@/hooks/use-dm-messages'
import { useAuthStore } from '@/store/auth'
import { PRESENCE_COLORS } from '@nexora/types'
import type { DmMessage, DmConversation } from '@nexora/types'
import type { PresenceStatus } from '@nexora/types'

const EMPTY_MESSAGES: DmMessage[] = []

export default function DmConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const { conversationId } = use(params)
  const { user } = useAuthStore()
  const { conversations, messages: allMessages } = useDmStore()
  const [replyTo, setReplyTo] = useState<DmMessage | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Load messages via hook (handles socket + fetching)
  const { isLoading, hasNextPage, loadMore } = useDmMessages(conversationId)
  const messages = allMessages[conversationId] ?? EMPTY_MESSAGES

  // Find conversation metadata
  const conversation = conversations.find((c) => c.id === conversationId)
  const other = conversation?.participants?.find((p) => p.user.id !== user?.id)?.user
  const presenceColor = PRESENCE_COLORS[(other?.presence ?? 'offline') as PresenceStatus] ?? '#4A5568'

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[var(--surface-base)]">
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <div className="flex items-center gap-2.5">
          {other && (
            <>
              <Avatar
                src={other.avatarUrl ?? undefined}
                fallback={other.displayName ?? other.username}
                size="sm"
                showPresence
                presenceColor={presenceColor}
              />
              <div>
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {other.displayName ?? other.username}
                </span>
                <span className="ml-1.5 text-xs text-[var(--text-muted)]">@{other.username}</span>
              </div>
            </>
          )}
          {!other && (
            <span className="text-sm font-semibold text-[var(--text-primary)]">Loading…</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            aria-label="Voice call"
            title="Voice call (coming soon)"
          >
            <Phone className="h-4 w-4" />
          </button>
          <button
            className="h-8 w-8 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            aria-label="Video call"
            title="Video call (coming soon)"
          >
            <Video className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <DmMessageFeed
        conversationId={conversationId}
        messages={messages}
        isLoading={isLoading}
        hasMore={!!hasNextPage}
        onLoadMore={loadMore}
        onReply={setReplyTo}
        onEdit={setEditingId}
        editingId={editingId}
        onCancelEdit={() => setEditingId(null)}
      />

      {/* Input */}
      <DmMessageInput
        conversationId={conversationId}
        recipientName={other?.username ?? 'them'}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
      />
    </div>
  )
}

// ── Message feed ──────────────────────────────────────────────────────────

function DmMessageFeed({
  conversationId,
  messages,
  isLoading,
  hasMore,
  onLoadMore,
  onReply,
  onEdit,
  editingId,
  onCancelEdit,
}: {
  conversationId: string
  messages: DmMessage[]
  isLoading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onReply: (msg: DmMessage) => void
  onEdit: (id: string) => void
  editingId: string | null
  onCancelEdit: () => void
}) {
  const { user } = useAuthStore()
  const bottomRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const topSentinelRef = useRef<HTMLDivElement>(null)
  const prevLengthRef = useRef(0)

  // Auto-scroll on new messages
  useEffect(() => {
    const newLen = messages.length
    const prevLen = prevLengthRef.current
    if (prevLen === 0 || newLen > prevLen) {
      const lastMsg = messages[messages.length - 1]
      const isMine = lastMsg?.author?.id === user?.id
      const el = containerRef.current
      const isNearBottom = el ? el.scrollHeight - el.scrollTop - el.clientHeight < 200 : true
      if (isMine || isNearBottom) {
        bottomRef.current?.scrollIntoView({ behavior: prevLen === 0 ? 'instant' : 'smooth' })
      }
    }
    prevLengthRef.current = newLen
  }, [messages, user?.id])

  // Load-more sentinel
  useEffect(() => {
    if (!topSentinelRef.current || !hasMore) { return }
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { onLoadMore() } },
      { threshold: 0.1 },
    )
    observer.observe(topSentinelRef.current)
    return () => observer.disconnect()
  }, [hasMore, onLoadMore])

  return (
    <div
      ref={containerRef}
      className="flex flex-col flex-1 overflow-y-auto px-0 py-2 scrollbar-thin"
      role="log"
      aria-label="Direct messages"
      aria-live="polite"
    >
      {hasMore && <div ref={topSentinelRef} className="h-1" />}

      {isLoading && (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonMessage key={i} />)}
        </div>
      )}

      {!isLoading && messages.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-[var(--text-muted)]">
            No messages yet. Send the first one!
          </p>
        </div>
      )}

      {renderDmMessages(messages, user?.id ?? '', onReply, onEdit, editingId, onCancelEdit, conversationId)}

      <div ref={bottomRef} />
    </div>
  )
}

function renderDmMessages(
  messages: DmMessage[],
  myId: string,
  onReply: (msg: DmMessage) => void,
  onEdit: (id: string) => void,
  editingId: string | null,
  onCancelEdit: () => void,
  conversationId: string,
) {
  const elements: React.ReactNode[] = []
  let lastDate = ''
  let lastAuthorId = ''
  let lastTimestamp = 0

  messages.forEach((msg) => {
    const msgDate = formatDateDivider(msg.createdAt)
    const msgTime = new Date(msg.createdAt).getTime()
    const groupBreak = msgTime - lastTimestamp > 5 * 60 * 1000

    if (msgDate !== lastDate) {
      lastDate = msgDate
      lastAuthorId = ''
      elements.push(
        <DateDivider key={`divider-${msg.id}`} label={msgDate} />,
      )
    }

    const grouped = !groupBreak && msg.author?.id === lastAuthorId
    lastAuthorId = msg.author?.id ?? ''
    lastTimestamp = msgTime

    if (editingId === msg.id) {
      elements.push(
        <InlineEditForm
          key={`edit-${msg.id}`}
          message={msg}
          conversationId={conversationId}
          onDone={onCancelEdit}
        />,
      )
    } else {
      elements.push(
        <DmBubble
          key={msg.id}
          message={msg}
          isOwn={msg.author?.id === myId}
          grouped={grouped}
          onReply={onReply}
          onEdit={msg.author?.id === myId ? onEdit : undefined}
          conversationId={conversationId}
        />,
      )
    }
  })

  return elements
}

// ── Message bubble ────────────────────────────────────────────────────────

function DmBubble({
  message,
  isOwn,
  grouped,
  onReply,
  onEdit,
  conversationId,
}: {
  message: DmMessage
  isOwn: boolean
  grouped: boolean
  onReply: (msg: DmMessage) => void
  onEdit?: ((id: string) => void) | undefined
  conversationId: string
}) {
  const { removeMessage } = useDmStore()
  const [hover, setHover] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/dms/${conversationId}/messages/${message.id}`),
    onSuccess: () => removeMessage(conversationId, message.id),
    onError: () => notify.error('Failed to delete message'),
  })

  const displayName = message.author?.displayName ?? message.author?.username ?? 'Unknown'

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-4 py-0.5 hover:bg-[var(--surface-hover)] transition-colors',
        grouped ? 'pt-0.5' : 'pt-3',
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Avatar column */}
      <div className="w-9 shrink-0">
        {!grouped ? (
          <Avatar
            src={message.author?.avatarUrl ?? undefined}
            fallback={displayName}
            size="sm"
          />
        ) : (
          <span className="block w-9 text-[10px] text-[var(--text-muted)] text-right leading-tight opacity-0 group-hover:opacity-100 select-none pt-0.5">
            {formatMessageTime(message.createdAt)}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {displayName}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">
              {formatMessageTime(message.createdAt)}
            </span>
          </div>
        )}

        {message.content && (
          <p className={cn(
            'text-sm text-[var(--text-secondary)] leading-relaxed break-words',
            message.isEdited && 'after:content-["_(edited)"] after:text-[10px] after:text-[var(--text-muted)] after:ml-1',
          )}>
            {message.content}
          </p>
        )}
      </div>

      {/* Action buttons on hover */}
      {hover && (
        <div className="absolute right-4 top-1 flex items-center gap-1 bg-[var(--surface-raised)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] px-1 py-0.5 shadow-sm">
          <ActionBtn label="Reply" onClick={() => onReply(message)}>
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </ActionBtn>
          {onEdit && (
            <ActionBtn label="Edit" onClick={() => onEdit(message.id)}>
              <Edit2 className="h-3.5 w-3.5" />
            </ActionBtn>
          )}
          {isOwn && (
            <ActionBtn
              label="Delete"
              danger
              onClick={() => deleteMutation.mutate()}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </ActionBtn>
          )}
        </div>
      )}
    </div>
  )
}

function ActionBtn({
  label,
  danger,
  onClick,
  children,
}: {
  label: string
  danger?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'h-6 w-6 flex items-center justify-center rounded transition-colors',
        danger
          ? 'text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
      )}
    >
      {children}
    </button>
  )
}

// ── Inline edit form ──────────────────────────────────────────────────────

function InlineEditForm({
  message,
  conversationId,
  onDone,
}: {
  message: DmMessage
  conversationId: string
  onDone: () => void
}) {
  const { updateMessage } = useDmStore()
  const [value, setValue] = useState(message.content ?? '')

  const mutation = useMutation({
    mutationFn: (content: string) =>
      api.patch(`/dms/${conversationId}/messages/${message.id}`, { content }),
    onSuccess: (res) => {
      updateMessage(conversationId, message.id, res.data as Partial<DmMessage>)
      onDone()
    },
    onError: () => notify.error('Failed to edit message'),
  })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); mutation.mutate(value) }
    if (e.key === 'Escape') { onDone() }
  }

  return (
    <div className="px-4 py-2">
      <textarea
        value={value}
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        className="w-full bg-[var(--surface-panel)] border border-[var(--accent-primary)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] resize-none focus:outline-none"
      />
      <p className="text-[11px] text-[var(--text-muted)] mt-1">
        Enter to save · Esc to cancel
      </p>
    </div>
  )
}

// ── Date divider ──────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 my-3" role="separator" aria-label={label}>
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
      <span className="text-[11px] font-semibold text-[var(--text-muted)] uppercase tracking-wider shrink-0">
        {label}
      </span>
      <div className="flex-1 h-px bg-[var(--border-subtle)]" />
    </div>
  )
}

// ── Message input ─────────────────────────────────────────────────────────

function DmMessageInput({
  conversationId,
  recipientName,
  replyTo,
  onCancelReply,
}: {
  conversationId: string
  recipientName: string
  replyTo: DmMessage | null
  onCancelReply: () => void
}) {
  const [content, setContent] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const sendMutation = useMutation({
    mutationFn: (body: { content: string; replyToId?: string }) =>
      api.post<DmMessage>(`/dms/${conversationId}/messages`, body),
    onError: () => notify.error('Failed to send message'),
  })

  const resizeTextarea = useCallback(() => {
    const el = textareaRef.current
    if (!el) { return }
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`
  }, [])

  useEffect(() => { resizeTextarea() }, [content, resizeTextarea])

  const handleSend = useCallback(() => {
    const trimmed = content.trim()
    if (!trimmed || sendMutation.isPending) { return }

    sendMutation.mutate({
      content: trimmed,
      ...(replyTo?.id !== undefined && { replyToId: replyTo.id }),
    })

    setContent('')
    onCancelReply()
    setTimeout(() => textareaRef.current?.focus(), 0)
  }, [content, sendMutation, replyTo, onCancelReply])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
  }

  const canSend = content.trim().length > 0 && !sendMutation.isPending

  return (
    <div className="shrink-0 px-4 pb-4 pt-2">
      {/* Reply preview */}
      {replyTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-[var(--surface-panel)] rounded-t-[var(--radius-sm)] border border-b-0 border-[var(--border-subtle)] text-sm">
          <div className="flex-1 min-w-0">
            <span className="text-[var(--text-muted)] text-xs">Replying to </span>
            <span className="text-[var(--accent-primary)] text-xs font-medium">
              {replyTo.author?.displayName ?? replyTo.author?.username}
            </span>
            <p className="text-[var(--text-muted)] text-xs truncate mt-0.5">{replyTo.content}</p>
          </div>
          <button
            onClick={onCancelReply}
            className="shrink-0 p-1 rounded hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Cancel reply"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      <div
        className={cn(
          'flex items-end gap-2 bg-[var(--surface-panel)] border border-[var(--border-default)]',
          'rounded-[var(--radius-md)] px-3 py-2.5',
          'focus-within:border-[var(--accent-primary)] transition-colors',
          replyTo && 'rounded-t-none border-t-0',
        )}
      >
        <button
          className="shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors self-center"
          aria-label="Attach file"
        >
          <Paperclip className="h-4 w-4" />
        </button>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Message @${recipientName}`}
          rows={1}
          aria-label={`Message @${recipientName}`}
          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none max-h-[200px] leading-relaxed"
        />

        <button
          className="shrink-0 p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors self-center"
          aria-label="Insert emoji"
        >
          <SmilePlus className="h-4 w-4" />
        </button>

        <button
          onClick={handleSend}
          disabled={!canSend}
          aria-label="Send message"
          className={cn(
            'shrink-0 h-7 w-7 flex items-center justify-center rounded-[var(--radius-xs)] transition-all self-center',
            canSend
              ? 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-light)] shadow-[var(--shadow-glow-violet)]'
              : 'text-[var(--text-muted)] cursor-not-allowed',
          )}
        >
          {sendMutation.isPending ? (
            <div className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5" />
          )}
        </button>
      </div>
    </div>
  )
}
