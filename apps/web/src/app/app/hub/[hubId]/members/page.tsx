'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { useAuthStore } from '@/store/auth'
import { api } from '@/lib/api'
import { Avatar } from '@nexora/ui/avatar'
import { PRESENCE_COLORS } from '@nexora/types'
import { openProfile } from '@/store/profile-modal'
import type { PresenceStatus } from '@nexora/types'

interface MemberUser {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  presence: string
}

interface Member {
  hubId: string
  userId: string
  joinedAt: string
  nickname: string | null
  user: MemberUser
}

export default function MembersPage() {
  const { hubId } = useParams<{ hubId: string }>()
  const [members, setMembers] = useState<Member[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user: me } = useAuthStore()

  useEffect(() => {
    api.get<{ members: Member[] }>(`/hubs/${hubId}/members`).then((res) => {
      setMembers(res.data.members)
    }).finally(() => setIsLoading(false))
  }, [hubId])

  const online = members.filter((m) => m.user.presence !== 'offline')
  const offline = members.filter((m) => m.user.presence === 'offline')

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="shrink-0 flex items-center gap-2 px-4 h-12 border-b border-[var(--border-subtle)] bg-[var(--surface-raised)]">
        <h1 className="font-semibold text-sm text-[var(--text-primary)]">Members</h1>
        <span className="text-xs text-[var(--text-muted)] ml-1">— {members.length}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-sm text-[var(--text-muted)]">Loading members…</div>
          </div>
        ) : (
          <>
            {online.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">
                  Online — {online.length}
                </p>
                <div className="space-y-0.5">
                  {online.map((m) => (
                    <MemberRow key={m.userId} member={m} isMe={m.userId === me?.id} />
                  ))}
                </div>
              </section>
            )}
            {offline.length > 0 && (
              <section>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-2 px-1">
                  Offline — {offline.length}
                </p>
                <div className="space-y-0.5">
                  {offline.map((m) => (
                    <MemberRow key={m.userId} member={m} isMe={m.userId === me?.id} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member, isMe }: { member: Member; isMe: boolean }) {
  const displayName = member.nickname ?? member.user.displayName ?? member.user.username
  const presence = member.user.presence as PresenceStatus

  return (
    <div
      className="flex items-center gap-3 px-2 py-1.5 rounded-[var(--radius-xs)] hover:bg-[var(--surface-hover)] transition-colors cursor-pointer"
      onClick={(e) => openProfile(member.userId, { x: e.clientX, y: e.clientY })}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openProfile(member.userId, { x: 0, y: 0 }) }}
    >
      <Avatar
        src={member.user.avatarUrl ?? undefined}
        fallback={displayName}
        size="sm"
        showPresence
        presenceColor={PRESENCE_COLORS[presence] ?? PRESENCE_COLORS.offline}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate">
          {displayName}
          {isMe && <span className="text-[var(--text-muted)] font-normal"> (you)</span>}
        </p>
        {member.user.displayName && member.user.displayName !== member.user.username && (
          <p className="text-xs text-[var(--text-muted)] truncate">@{member.user.username}</p>
        )}
      </div>
    </div>
  )
}
