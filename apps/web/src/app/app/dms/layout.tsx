'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter } from 'next/navigation'
import { MessageSquare, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@nexora/ui/avatar'
import { api } from '@/lib/api'
import { useDmStore } from '@/store/dm'
import { useAuthStore } from '@/store/auth'
import { PRESENCE_COLORS } from '@nexora/types'
import type { DmConversation } from '@nexora/types'
import type { PresenceStatus } from '@nexora/types'

export default function DmsLayout({ children }: { children: React.ReactNode }) {
  const { setConversations } = useDmStore()
  const { user } = useAuthStore()

  const { data } = useQuery({
    queryKey: ['dm-conversations'],
    queryFn: async () => {
      const res = await api.get<{ conversations: DmConversation[] }>('/dms')
      return res.data
    },
    staleTime: 30_000,
  })

  useEffect(() => {
    if (data?.conversations) {
      setConversations(data.conversations)
    }
  }, [data, setConversations])

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* DM Sidebar */}
      <aside className="w-60 shrink-0 flex flex-col bg-[var(--surface-raised)] border-r border-[var(--border-subtle)]">
        {/* Header */}
        <div className="px-3 pt-4 pb-2">
          <h2 className="font-brand text-sm font-semibold text-[var(--text-primary)] px-1 mb-2">
            Direct Messages
          </h2>
          {/* Search box (visual only, future) */}
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-[var(--radius-sm)] bg-[var(--surface-panel)] text-[var(--text-muted)] text-sm">
            <Search className="h-3.5 w-3.5 shrink-0" />
            <span className="text-xs">Find a conversation</span>
          </div>
        </div>

        {/* Conversation list */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-0.5">
          <ConversationList currentUserId={user?.id ?? ''} />
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  )
}

function ConversationList({ currentUserId }: { currentUserId: string }) {
  const { conversations } = useDmStore()
  const pathname = usePathname()

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 gap-2 py-8">
        <MessageSquare className="h-8 w-8 text-[var(--text-muted)]" />
        <p className="text-xs text-[var(--text-muted)] text-center px-4">
          No conversations yet. Click a user&apos;s avatar to start one.
        </p>
      </div>
    )
  }

  return (
    <>
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          currentUserId={currentUserId}
          active={pathname === `/app/dms/${conv.id}`}
        />
      ))}
    </>
  )
}

function ConversationItem({
  conversation,
  currentUserId,
  active,
}: {
  conversation: DmConversation
  currentUserId: string
  active: boolean
}) {
  const router = useRouter()
  const unread = useDmStore((s) => s.unreadCounts[conversation.id] ?? 0)

  // For 1:1 DMs, show the OTHER participant
  const other = conversation.participants?.find((p) => p.user.id !== currentUserId)?.user
  if (!other) { return null }

  const presenceColor = PRESENCE_COLORS[other.presence as PresenceStatus] ?? '#4A5568'
  const displayName = other.displayName ?? other.username

  return (
    <button
      onClick={() => router.push(`/app/dms/${conversation.id}`)}
      className={cn(
        'flex items-center gap-2.5 w-full px-2 py-2 rounded-[var(--radius-xs)] transition-colors text-left',
        active
          ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
          : unread > 0
            ? 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
      )}
      aria-current={active ? 'page' : undefined}
    >
      <Avatar
        src={other.avatarUrl ?? undefined}
        fallback={displayName}
        size="sm"
        showPresence
        presenceColor={presenceColor}
      />
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm truncate', unread > 0 ? 'font-semibold' : 'font-medium')}>
          {displayName}
        </p>
        <p className="text-[11px] text-[var(--text-muted)] truncate">@{other.username}</p>
      </div>
      {unread > 0 && (
        <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-[var(--functional-error)] text-white text-[10px] font-bold flex items-center justify-center leading-none">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </button>
  )
}
