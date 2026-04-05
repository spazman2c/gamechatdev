'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, Shield } from 'lucide-react'
import { Avatar } from '@nexora/ui/avatar'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'

interface Member {
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    presence: string | null
  }
  joinedAt: string
  nickname: string | null
}

export function MembersTab({ hubId, ownerId }: { hubId: string; ownerId: string }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['members', hubId],
    queryFn: () => api.get<{ members: Member[] }>(`/hubs/${hubId}/members`).then((r) => r.data.members),
  })

  const kickMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/hubs/${hubId}/members/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', hubId] })
      notify.success('Member kicked')
    },
    onError: () => notify.error('Failed to kick member'),
  })

  const banMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/hubs/${hubId}/bans/${userId}`, { reason: '' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', hubId] })
      notify.success('Member banned')
    },
    onError: () => notify.error('Failed to ban member'),
  })

  const filtered = (data ?? []).filter((m) => {
    const q = search.toLowerCase()
    return !q || m.user.username.includes(q) || (m.user.displayName ?? '').toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)]">
          Members — {data?.length ?? 0}
        </h2>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search members…"
          className="w-full pl-9 pr-3 py-2 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 rounded-[var(--radius-sm)] bg-[var(--surface-panel)] animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map(({ user, joinedAt }) => (
            <div
              key={user.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] group transition-colors"
            >
              <Avatar src={user.avatarUrl ?? undefined} fallback={user.displayName ?? user.username} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {user.displayName ?? user.username}
                  </p>
                  {user.id === ownerId && (
                    <Shield className="h-3.5 w-3.5 text-[var(--accent-secondary)] shrink-0" />
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">@{user.username}</p>
              </div>
              <p className="text-xs text-[var(--text-muted)] shrink-0 hidden sm:block">
                Joined {new Date(joinedAt).toLocaleDateString()}
              </p>
              {user.id !== ownerId && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                  <button
                    onClick={() => kickMutation.mutate(user.id)}
                    className="text-xs px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--functional-warning)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    Kick
                  </button>
                  <button
                    onClick={() => banMutation.mutate(user.id)}
                    className="text-xs px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--functional-error)] hover:bg-[var(--surface-hover)] transition-colors"
                  >
                    Ban
                  </button>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-sm text-[var(--text-muted)] py-4 text-center">No members found.</p>
          )}
        </div>
      )}
    </div>
  )
}
