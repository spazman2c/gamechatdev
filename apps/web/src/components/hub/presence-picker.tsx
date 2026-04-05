'use client'

import { useEffect, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { PRESENCE_COLORS, PRESENCE_LABELS } from '@nexora/types'
import type { PresenceStatus } from '@nexora/types'

const ALL_STATUSES: PresenceStatus[] = [
  'online',
  'open_to_chat',
  'focused',
  'listening_only',
  'available_for_calls',
  'co_op',
  'hosting',
  'quiet',
  'offline',
]

interface PresencePickerProps {
  currentStatus: PresenceStatus
  onClose: () => void
}

export function PresencePicker({ currentStatus, onClose }: PresencePickerProps) {
  const { updateUser } = useAuthStore()
  const ref = useRef<HTMLDivElement>(null)

  const mutation = useMutation({
    mutationFn: (presence: PresenceStatus) =>
      api.patch('/users/me', { presence }),
    onSuccess: (_, presence) => {
      updateUser({ presence })
      onClose()
    },
  })

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Set presence status"
      className={cn(
        'absolute bottom-full left-0 mb-2 w-52 z-[var(--z-dropdown)]',
        'bg-[var(--surface-panel)] border border-[var(--border-default)]',
        'rounded-[var(--radius-md)] shadow-lg overflow-hidden',
        'animate-slide-up',
      )}
    >
      <p className="px-3 pt-3 pb-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        Set Status
      </p>
      {ALL_STATUSES.map((status) => (
        <button
          key={status}
          role="menuitem"
          onClick={() => mutation.mutate(status)}
          className={cn(
            'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
            'hover:bg-[var(--surface-hover)]',
            status === currentStatus && 'bg-[var(--surface-active)]',
          )}
          aria-current={status === currentStatus}
        >
          <span
            className="h-2.5 w-2.5 rounded-full shrink-0"
            style={{ backgroundColor: PRESENCE_COLORS[status] }}
            aria-hidden="true"
          />
          <span className={cn(
            status === currentStatus ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]',
          )}>
            {PRESENCE_LABELS[status]}
          </span>
        </button>
      ))}
    </div>
  )
}
