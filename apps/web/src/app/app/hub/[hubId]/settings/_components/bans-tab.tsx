'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Search, ShieldOff } from 'lucide-react'
import { Avatar } from '@nexora/ui/avatar'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'

interface Ban {
  hubId: string
  userId: string
  reason: string | null
  createdAt: string
  user: {
    id: string
    username: string
    displayName: string | null
    avatarUrl: string | null
  } | null
}

export function BansTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['bans', hubId],
    queryFn: () => api.get<{ bans: Ban[] }>(`/hubs/${hubId}/bans`).then((r) => r.data.bans),
  })

  const unbanMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/hubs/${hubId}/bans/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bans', hubId] })
      notify.success('User unbanned')
    },
    onError: () => notify.error('Failed to unban user'),
  })

  const filtered = (data ?? []).filter((b) => {
    const q = search.toLowerCase()
    return !q || b.userId.toLowerCase().includes(q) || (b.user?.username ?? '').toLowerCase().includes(q)
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)]">
          Bans — {data?.length ?? 0}
        </h2>
      </div>

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search banned users…"
          className="w-full pl-9 pr-3 py-2 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 rounded-[var(--radius-sm)] bg-[var(--surface-panel)] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-[var(--text-muted)]">
          <ShieldOff className="h-10 w-10 opacity-30" />
          <p className="text-sm">{search ? 'No matching bans found.' : 'No banned users.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {filtered.map((ban) => (
            <div
              key={ban.userId}
              className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] group transition-colors"
            >
              <Avatar
                src={ban.user?.avatarUrl ?? undefined}
                fallback={ban.user?.displayName ?? ban.user?.username ?? ban.userId.slice(0, 2)}
                size="sm"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {ban.user?.displayName ?? ban.user?.username ?? <span className="font-mono text-xs">{ban.userId.slice(0, 12)}</span>}
                </p>
                {ban.reason && <p className="text-xs text-[var(--text-muted)] truncate">Reason: {ban.reason}</p>}
              </div>
              <p className="text-xs text-[var(--text-muted)] shrink-0 hidden sm:block">
                {new Date(ban.createdAt).toLocaleDateString()}
              </p>
              <button
                onClick={() => unbanMutation.mutate(ban.userId)}
                className="opacity-0 group-hover:opacity-100 text-xs px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--functional-success)] hover:bg-[var(--surface-hover)] transition-all"
              >
                Unban
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
