'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Pencil, Trash2, Reply, SmilePlus } from 'lucide-react'
import { formatMessageTime } from '@/lib/utils'
import { Avatar } from '@nexora/ui/avatar'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useMessagesStore } from '@/store/messages'
import { notify } from '@/store/notifications'
import { openProfile } from '@/store/profile-modal'
import { openContextMenu } from '@/store/context-menu'
import type { Message } from '@nexora/types'

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥']

interface MessageBubbleProps {
  message: Message
  isOwn: boolean
  grouped: boolean
  onReply?: (msg: Message) => void
}

export function MessageBubble({ message, isOwn, grouped, onReply }: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content ?? '')
  const { updateMessage, removeMessage } = useMessagesStore()

  const editMutation = useMutation({
    mutationFn: (content: string) =>
      api.patch(`/messages/${message.id}`, { content }),
    onSuccess: (res) => {
      updateMessage(message.channelId, message.id, res.data as Partial<Message>)
      setEditing(false)
    },
    onError: () => notify.error('Failed to edit message'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/messages/${message.id}`),
    onSuccess: () => removeMessage(message.channelId, message.id),
    onError: () => notify.error('Failed to delete message'),
  })

  const reactMutation = useMutation({
    mutationFn: (emoji: string) =>
      api.post(`/messages/${message.id}/reactions/${encodeURIComponent(emoji)}`),
  })

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editContent.trim() && editContent !== message.content) {
      editMutation.mutate(editContent.trim())
    } else {
      setEditing(false)
    }
  }

  return (
    <div
      className={cn(
        'group relative flex items-start gap-3 px-4',
        grouped ? 'py-0.5' : 'pt-3 pb-0.5',
        'hover:bg-[var(--surface-hover)]',
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar or spacer */}
      <div className="w-10 shrink-0">
        {!grouped ? (
          <button
            onClick={(e) => message.author?.id && openProfile(message.author.id, { x: e.clientX, y: e.clientY })}
            onContextMenu={(e) => {
              e.preventDefault()
              if (message.author?.id) {
                openContextMenu(
                  { userId: message.author.id, username: message.author.username ?? '', displayName: message.author.displayName ?? null },
                  { x: e.clientX, y: e.clientY },
                  message.channelId,
                )
              }
            }}
            className="rounded-full focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
            aria-label={`View ${message.author?.displayName ?? message.author?.username}'s profile`}
          >
            <Avatar
              src={message.author?.avatarUrl ?? undefined}
              fallback={message.author?.displayName ?? message.author?.username ?? '?'}
              size="sm"
            />
          </button>
        ) : null}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-baseline gap-2 mb-0.5">
            <button
              onClick={(e) => message.author?.id && openProfile(message.author.id, { x: e.clientX, y: e.clientY })}
              onContextMenu={(e) => {
                e.preventDefault()
                if (message.author?.id) {
                  openContextMenu(
                    { userId: message.author.id, username: message.author.username ?? '', displayName: message.author.displayName ?? null },
                    { x: e.clientX, y: e.clientY },
                    message.channelId,
                  )
                }
              }}
              className="text-sm font-semibold text-[var(--text-primary)] hover:underline focus:outline-none"
            >
              {message.author?.displayName ?? message.author?.username ?? 'Unknown'}
            </button>
            <time
              className="text-[11px] text-[var(--text-muted)]"
              dateTime={message.createdAt}
              title={new Date(message.createdAt).toLocaleString()}
            >
              {formatMessageTime(message.createdAt)}
            </time>
            {message.isEdited && (
              <span className="text-[10px] text-[var(--text-muted)]">(edited)</span>
            )}
          </div>
        )}

        {/* Reply reference */}
        {message.replyTo && (
          <div className="flex items-center gap-2 mb-1 text-xs text-[var(--text-muted)] pl-2 border-l-2 border-[var(--border-default)]">
            <span className="font-medium">{message.replyTo.author?.username}</span>
            <span className="truncate max-w-[200px]">{message.replyTo.content}</span>
          </div>
        )}

        {/* Message content or editor */}
        {editing ? (
          <form onSubmit={handleEditSubmit} className="flex flex-col gap-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleEditSubmit(e)
                }
                if (e.key === 'Escape') { setEditing(false) }
              }}
              autoFocus
              rows={Math.min(5, (editContent.match(/\n/g)?.length ?? 0) + 1)}
              className="w-full bg-[var(--surface-panel)] border border-[var(--accent-primary)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] resize-none focus:outline-none"
            />
            <div className="flex gap-2 text-xs text-[var(--text-muted)]">
              <span>Enter to save · Esc to cancel</span>
            </div>
          </form>
        ) : (
          <div className="text-sm text-[var(--text-primary)] leading-relaxed break-words">
            {renderContent(message.content ?? '')}
          </div>
        )}

        {/* Attachments */}
        {message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.attachments.map((att) => (
              att.contentType?.startsWith('image/') ? (
                <img
                  key={att.id}
                  src={att.url}
                  alt={att.filename ?? 'Attachment'}
                  className="max-w-sm max-h-64 rounded-[var(--radius-sm)] object-cover border border-[var(--border-subtle)]"
                  loading="lazy"
                />
              ) : (
                <a
                  key={att.id}
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-link)] hover:underline"
                >
                  {att.filename ?? 'File'}
                  {att.sizeBytes && (
                    <span className="text-xs text-[var(--text-muted)]">
                      ({formatBytes(att.sizeBytes)})
                    </span>
                  )}
                </a>
              )
            ))}
          </div>
        )}

        {/* Reactions */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {message.reactions.map((r) => (
              <button
                key={r.emoji}
                onClick={() => reactMutation.mutate(r.emoji)}
                className={cn(
                  'flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border transition-colors',
                  r.me
                    ? 'bg-[var(--accent-primary-bg)] border-[var(--accent-primary-border)] text-[var(--accent-primary)]'
                    : 'bg-[var(--surface-panel)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--border-default)]',
                )}
                aria-label={`${r.emoji} ${r.count} reaction${r.count !== 1 ? 's' : ''}`}
              >
                <span aria-hidden="true">{r.emoji}</span>
                <span>{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover action toolbar */}
      {showActions && !editing && (
        <div className="absolute right-4 top-1 flex items-center gap-0.5 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] shadow-sm p-0.5 z-10">
          {/* Quick reactions */}
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => reactMutation.mutate(emoji)}
              className="h-7 w-7 flex items-center justify-center text-sm rounded hover:bg-[var(--surface-hover)] transition-colors"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
          <div className="w-px h-5 bg-[var(--border-subtle)] mx-0.5" />
          {onReply && (
            <ActionButton onClick={() => onReply(message)} label="Reply">
              <Reply className="h-3.5 w-3.5" />
            </ActionButton>
          )}
          {isOwn && (
            <ActionButton onClick={() => { setEditing(true); setShowActions(false) }} label="Edit">
              <Pencil className="h-3.5 w-3.5" />
            </ActionButton>
          )}
          {isOwn && (
            <ActionButton
              onClick={() => deleteMutation.mutate()}
              label="Delete"
              danger
            >
              <Trash2 className="h-3.5 w-3.5" />
            </ActionButton>
          )}
        </div>
      )}
    </div>
  )
}

function ActionButton({
  onClick,
  label,
  danger,
  children,
}: {
  onClick: () => void
  label: string
  danger?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'h-7 w-7 flex items-center justify-center rounded transition-colors',
        danger
          ? 'text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)]'
          : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
      )}
    >
      {children}
    </button>
  )
}

function renderContent(content: string): React.ReactNode {
  if (!content) { return null }

  // Simple mention highlighting: @username
  const parts = content.split(/(@\w+)/g)
  return parts.map((part, i) =>
    part.startsWith('@') ? (
      <span key={i} className="text-[var(--accent-primary)] font-medium">
        {part}
      </span>
    ) : (
      part
    ),
  )
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) { return `${bytes} B` }
  if (bytes < 1024 * 1024) { return `${(bytes / 1024).toFixed(1)} KB` }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
