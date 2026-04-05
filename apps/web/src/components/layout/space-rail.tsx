'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, MessageSquare, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@nexora/ui/avatar'
import { useAuthStore } from '@/store/auth'
import { useHubStore } from '@/store/hub'
import { useDmStore } from '@/store/dm'
import { useJoinedHubs } from '@/hooks/use-hub'
import { CreateHubModal } from '@/components/modals/create-hub-modal'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { PRESENCE_COLORS } from '@nexora/types'
import type { PresenceStatus } from '@nexora/types'

export function SpaceRail() {
  const [showCreate, setShowCreate] = useState(false)
  useJoinedHubs() // Loads and syncs to store
  const pathname = usePathname()
  const { user } = useAuthStore()
  const { joinedHubs } = useHubStore()
  const unreadCounts = useDmStore((s) => s.unreadCounts)
  const totalDmUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  return (
    <nav
      className={cn(
        'w-[60px] flex flex-col items-center py-3 gap-2',
        'bg-[var(--surface-base)] border-r border-[var(--border-subtle)]',
        'shrink-0 overflow-y-auto scrollbar-none',
      )}
      aria-label="Your spaces"
    >
      {/* DMs */}
      <div className="relative">
        <RailIcon
          href="/app/dms"
          label="Direct Messages"
          active={pathname.startsWith('/app/dms')}
        >
          <MessageSquare className="h-5 w-5" />
        </RailIcon>
        {totalDmUnread > 0 && (
          <span
            className="pointer-events-none absolute -bottom-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--functional-error)] text-white text-[10px] font-bold flex items-center justify-center leading-none ring-2 ring-[var(--surface-base)]"
            aria-hidden="true"
          >
            {totalDmUnread > 99 ? '99+' : totalDmUnread}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="w-8 h-px bg-[var(--border-subtle)] my-1" aria-hidden="true" />

      {/* Hub icons */}
      {joinedHubs.map((hub) => (
        <HubIcon
          key={hub.id}
          hub={hub}
          active={pathname.startsWith(`/app/hub/${hub.id}`)}
        />
      ))}

      {/* Add hub */}
      <button
        onClick={() => setShowCreate(true)}
        title="Create or join a Hub"
        aria-label="Create or join a Hub"
        className="group flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--surface-raised)] text-[var(--text-secondary)] transition-all duration-[120ms] hover:rounded-[var(--radius-sm)] hover:bg-[var(--accent-mint)] hover:text-white"
      >
        <Plus className="h-5 w-5" />
      </button>

      {showCreate && <CreateHubModal onClose={() => setShowCreate(false)} />}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Notification Bell */}
      <NotificationBell />

      {/* Settings */}
      <RailIcon href="/app/settings" label="Settings" active={pathname.startsWith('/app/settings')}>
        <Settings className="h-4.5 w-4.5" />
      </RailIcon>

      {/* User avatar */}
      {user && (
        <Link
          href="/app/settings/profile"
          className="group relative flex items-center justify-center"
          aria-label={`Your profile: ${user.displayName ?? user.username}`}
        >
          <Avatar
            src={user.avatarUrl ?? undefined}
            fallback={user.displayName ?? user.username}
            size="sm"
            showPresence
            presenceColor={PRESENCE_COLORS[user.presence as PresenceStatus]}
          />
        </Link>
      )}
    </nav>
  )
}

interface RailIconProps {
  href: string
  label: string
  active?: boolean
  children: React.ReactNode
}

function RailIcon({ href, label, active, children }: RailIconProps) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-11 w-11 items-center justify-center',
        'rounded-[var(--radius-md)] transition-all duration-[120ms]',
        'text-[var(--text-secondary)]',
        'hover:rounded-[var(--radius-full)] hover:bg-[var(--accent-primary)] hover:text-white',
        active
          ? 'rounded-[var(--radius-full)] bg-[var(--accent-primary)] text-white'
          : 'bg-[var(--surface-raised)]',
      )}
    >
      {children}
      {/* Active/hover indicator pill */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -left-3 rounded-r-full bg-[var(--text-primary)] transition-all duration-[120ms]',
          active ? 'h-8 w-1' : 'h-4 w-1 opacity-0 group-hover:opacity-100',
        )}
      />
    </Link>
  )
}

interface HubIconProps {
  hub: { id: string; name: string; iconUrl: string | null }
  active: boolean
}

function HubIcon({ hub, active }: HubIconProps) {
  return (
    <Link
      href={`/app/hub/${hub.id}`}
      title={hub.name}
      aria-label={hub.name}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group relative flex h-11 w-11 items-center justify-center overflow-hidden',
        'transition-all duration-[120ms]',
        active ? 'rounded-[var(--radius-full)]' : 'rounded-[var(--radius-md)] hover:rounded-[var(--radius-full)]',
      )}
    >
      {hub.iconUrl ? (
        <img
          src={hub.iconUrl}
          alt={hub.name}
          className="h-full w-full object-cover"
        />
      ) : (
        <div
          className={cn(
            'h-full w-full flex items-center justify-center text-sm font-semibold',
            active
              ? 'bg-[var(--accent-primary)] text-white'
              : 'bg-[var(--surface-raised)] text-[var(--text-secondary)] group-hover:bg-[var(--accent-primary)] group-hover:text-white',
          )}
        >
          {hub.name.slice(0, 2).toUpperCase()}
        </div>
      )}
      {/* Active/hover indicator pill */}
      <span
        aria-hidden="true"
        className={cn(
          'absolute -left-3 rounded-r-full bg-[var(--text-primary)] transition-all duration-[120ms]',
          active ? 'h-8 w-1' : 'h-4 w-1 opacity-0 group-hover:opacity-100',
        )}
      />
    </Link>
  )
}
