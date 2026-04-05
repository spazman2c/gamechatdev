'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, Trash2, MessageSquare, AtSign, UserPlus, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useNotificationCenter } from '@/store/notification-center'
import { useQueryClient } from '@tanstack/react-query'
import type { AppNotification } from '@nexora/types'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { unreadCount } = useNotificationCenter()

  // Close on outside click
  useEffect(() => {
    if (!open) { return }
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false) }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Notifications"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        className={cn(
          'group relative flex h-11 w-11 items-center justify-center',
          'rounded-[var(--radius-md)] transition-all duration-[120ms]',
          'text-[var(--text-secondary)] bg-[var(--surface-raised)]',
          'hover:rounded-[var(--radius-full)] hover:bg-[var(--accent-primary)] hover:text-white',
          open && 'rounded-[var(--radius-full)] bg-[var(--accent-primary)] text-white',
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--functional-error)] text-white text-[10px] font-bold flex items-center justify-center leading-none pointer-events-none"
            aria-hidden="true"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && <NotificationPanel onClose={() => setOpen(false)} />}
    </div>
  )
}

function NotificationPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { notifications, markRead, markAllRead, removeNotification, clearAll } = useNotificationCenter()

  const handleMarkAllRead = useCallback(async () => {
    await api.patch('/notifications/read-all').catch(() => null)
    markAllRead()
  }, [markAllRead])

  const handleClearAll = useCallback(async () => {
    await api.delete('/notifications').catch(() => null)
    clearAll()
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }, [clearAll, queryClient])

  const handleClick = useCallback(async (notif: AppNotification) => {
    if (!notif.read) {
      await api.patch(`/notifications/${notif.id}/read`).catch(() => null)
      markRead(notif.id)
    }
    if (notif.referenceUrl) {
      router.push(notif.referenceUrl)
    }
    onClose()
  }, [markRead, router, onClose])

  const handleDelete = useCallback(async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    await api.delete(`/notifications/${id}`).catch(() => null)
    removeNotification(id)
  }, [removeNotification])

  return (
    <div
      className={cn(
        'absolute bottom-full left-0 mb-3 w-80 z-[var(--z-dropdown)]',
        'bg-[var(--surface-panel)] border border-[var(--border-default)]',
        'rounded-[var(--radius-md)] shadow-2xl overflow-hidden',
        'animate-slide-up',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <h3 className="font-brand font-semibold text-sm text-[var(--text-primary)]">Notifications</h3>
        <div className="flex items-center gap-2">
          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] transition-colors"
              title="Mark all as read"
            >
              <Check className="h-3.5 w-3.5" />
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button
              onClick={handleClearAll}
              className="text-[var(--text-muted)] hover:text-[var(--functional-error)] transition-colors"
              title="Clear all"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* List */}
      <div className="overflow-y-auto max-h-[420px]">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 gap-2">
            <Bell className="h-8 w-8 text-[var(--text-muted)]" />
            <p className="text-sm text-[var(--text-muted)]">You&apos;re all caught up!</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <NotificationItem
              key={notif.id}
              notif={notif}
              onClick={() => handleClick(notif)}
              onDelete={(e) => handleDelete(e, notif.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

function NotificationItem({
  notif,
  onClick,
  onDelete,
}: {
  notif: AppNotification
  onClick: () => void
  onDelete: (e: React.MouseEvent) => void
}) {
  const icon = NOTIF_ICONS[notif.type] ?? <Bell className="h-4 w-4" />
  const color = NOTIF_COLORS[notif.type] ?? 'bg-[var(--surface-hover)]'
  const timeAgo = formatTimeAgo(notif.createdAt)

  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
        'hover:bg-[var(--surface-hover)] border-b border-[var(--border-subtle)] last:border-0',
        !notif.read && 'bg-[var(--accent-primary)]/[0.04]',
      )}
    >
      {/* Icon badge */}
      <span className={cn('mt-0.5 h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-white', color)}>
        {icon}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', notif.read ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)] font-medium')}>
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{notif.body}</p>
        )}
        <p className="text-[10px] text-[var(--text-muted)] mt-1">{timeAgo}</p>
      </div>

      {/* Unread dot + delete on hover */}
      <div className="flex flex-col items-end gap-1.5 shrink-0 mt-0.5">
        {!notif.read && (
          <span className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" aria-hidden="true" />
        )}
        <button
          onClick={onDelete}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--text-muted)] hover:text-[var(--functional-error)]"
          aria-label="Delete notification"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </button>
  )
}

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  dm_message:     <MessageSquare className="h-3.5 w-3.5" />,
  mention:        <AtSign className="h-3.5 w-3.5" />,
  friend_request: <UserPlus className="h-3.5 w-3.5" />,
  hub_invite:     <Megaphone className="h-3.5 w-3.5" />,
  system:         <Bell className="h-3.5 w-3.5" />,
}

const NOTIF_COLORS: Record<string, string> = {
  dm_message:     'bg-[#38D39F]',
  mention:        'bg-[var(--accent-primary)]',
  friend_request: 'bg-[#FFB84D]',
  hub_invite:     'bg-[#7C5CFF]',
  system:         'bg-[var(--text-muted)]',
}

function formatTimeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) { return 'just now' }
  const min = Math.floor(sec / 60)
  if (min < 60) { return `${min}m ago` }
  const hr = Math.floor(min / 60)
  if (hr < 24) { return `${hr}h ago` }
  const day = Math.floor(hr / 24)
  if (day < 7) { return `${day}d ago` }
  return new Date(isoString).toLocaleDateString()
}
