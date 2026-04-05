'use client'

import { useState } from 'react'
import { Mic, MicOff, Headphones, HeadphoneOff, Settings } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Avatar } from '@nexora/ui/avatar'
import { useAuthStore } from '@/store/auth'
import { PresencePicker } from './presence-picker'
import { openProfile } from '@/store/profile-modal'
import { openContextMenu } from '@/store/context-menu'
import { PRESENCE_COLORS, PRESENCE_LABELS } from '@nexora/types'
import type { PresenceStatus } from '@nexora/types'

export function UserControlsBar() {
  const { user } = useAuthStore()
  const [muted, setMuted] = useState(false)
  const [deafened, setDeafened] = useState(false)
  const [showPresence, setShowPresence] = useState(false)

  if (!user) { return null }

  const presenceColor = PRESENCE_COLORS[user.presence as PresenceStatus]
  const presenceLabel = PRESENCE_LABELS[user.presence as PresenceStatus]

  return (
    <div className="shrink-0 flex items-center gap-2 px-2 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-base)]">
      {/* Avatar + presence */}
      <div className="relative flex items-center gap-2 flex-1 min-w-0">
        {/* Avatar → opens own profile */}
        <button
          onClick={(e) => openProfile(user.id, { x: e.clientX, y: e.clientY })}
          onContextMenu={(e) => {
            e.preventDefault()
            openContextMenu(
              { userId: user.id, username: user.username, displayName: user.displayName ?? null },
              { x: e.clientX, y: e.clientY },
            )
          }}
          className="shrink-0 rounded-full hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)]"
          aria-label="View your profile"
        >
          <Avatar
            src={user.avatarUrl ?? undefined}
            fallback={user.displayName ?? user.username}
            size="sm"
            showPresence
            presenceColor={presenceColor}
          />
        </button>

        {/* Name + status → opens presence picker */}
        <button
          onClick={() => setShowPresence((v) => !v)}
          className="flex flex-col items-start min-w-0 rounded-[var(--radius-sm)] px-1 py-1 hover:bg-[var(--surface-hover)] transition-colors"
          aria-label={`Presence: ${presenceLabel}. Click to change.`}
        >
          <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[80px]">
            {user.displayName ?? user.username}
          </span>
          <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[80px]">
            {presenceLabel}
          </span>
        </button>

        {showPresence && (
          <PresencePicker
            currentStatus={user.presence as PresenceStatus}
            onClose={() => setShowPresence(false)}
          />
        )}
      </div>

      {/* Voice controls */}
      <div className="flex items-center gap-0.5 ml-auto">
        <button
          onClick={() => {
            setMuted((v) => !v)
            if (deafened) { setDeafened(false) }
          }}
          aria-label={muted ? 'Unmute' : 'Mute'}
          aria-pressed={muted}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded-[var(--radius-xs)] transition-colors',
            muted
              ? 'text-[var(--functional-error)] bg-[var(--functional-error-bg)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
          )}
        >
          {muted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
        </button>

        <button
          onClick={() => setDeafened((v) => !v)}
          aria-label={deafened ? 'Undeafen' : 'Deafen'}
          aria-pressed={deafened}
          className={cn(
            'h-7 w-7 flex items-center justify-center rounded-[var(--radius-xs)] transition-colors',
            deafened
              ? 'text-[var(--functional-error)] bg-[var(--functional-error-bg)]'
              : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
          )}
        >
          {deafened ? <HeadphoneOff className="h-3.5 w-3.5" /> : <Headphones className="h-3.5 w-3.5" />}
        </button>

        <Link
          href="/app/settings"
          className="h-7 w-7 flex items-center justify-center rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Settings"
        >
          <Settings className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  )
}
