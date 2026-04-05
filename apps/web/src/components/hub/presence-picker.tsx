'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'
import { getSocket } from '@/hooks/use-socket'
import { PRESENCE_COLORS, PRESENCE_LABELS, CORE_STATUSES, CUSTOM_STATUSES } from '@nexora/types'
import type { PresenceStatus } from '@nexora/types'

interface PresencePickerProps {
  currentStatus: PresenceStatus
  onClose: () => void
}

export function PresencePicker({ currentStatus, onClose }: PresencePickerProps) {
  const updateUser = useAuthStore((s) => s.updateUser)
  const ref = useRef<HTMLDivElement>(null)

  function selectStatus(status: PresenceStatus) {
    // Optimistic update in the store immediately
    updateUser({ presence: status })
    // Let the server handle DB + broadcast
    getSocket()?.emit('presence:update', { status })
    onClose()
  }

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { onClose() }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') { onClose() } }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Set presence status"
      className={cn(
        'absolute bottom-full left-0 mb-2 w-56 z-[var(--z-dropdown)]',
        'bg-[var(--surface-panel)] border border-[var(--border-default)]',
        'rounded-[var(--radius-md)] shadow-lg overflow-hidden',
        'animate-slide-up',
      )}
    >
      {/* Core statuses */}
      <p className="px-3 pt-3 pb-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        Status
      </p>
      {CORE_STATUSES.map((status) => (
        <StatusItem
          key={status}
          status={status}
          active={status === currentStatus}
          onSelect={selectStatus}
        />
      ))}

      {/* Divider */}
      <div className="my-1 h-px bg-[var(--border-subtle)]" />

      {/* Custom / mood statuses */}
      <p className="px-3 pt-1 pb-1 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
        Custom
      </p>
      {CUSTOM_STATUSES.map((status) => (
        <StatusItem
          key={status}
          status={status}
          active={status === currentStatus}
          onSelect={selectStatus}
        />
      ))}
      <div className="pb-1" />
    </div>
  )
}

function StatusItem({
  status,
  active,
  onSelect,
}: {
  status: PresenceStatus
  active: boolean
  onSelect: (s: PresenceStatus) => void
}) {
  return (
    <button
      role="menuitem"
      onClick={() => onSelect(status)}
      className={cn(
        'flex w-full items-center gap-3 px-3 py-2 text-sm transition-colors',
        'hover:bg-[var(--surface-hover)]',
        active && 'bg-[var(--surface-active)]',
      )}
      aria-current={active}
    >
      <span
        className="h-2.5 w-2.5 rounded-full shrink-0"
        style={{ backgroundColor: PRESENCE_COLORS[status] }}
        aria-hidden="true"
      />
      <span className={cn(
        active ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-secondary)]',
      )}>
        {PRESENCE_LABELS[status]}
      </span>
    </button>
  )
}
