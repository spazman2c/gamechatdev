'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Users, Plus } from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { Avatar } from '@nexora/ui/avatar'
import { Badge } from '@nexora/ui/badge'
import { Button } from '@nexora/ui/button'
import { Skeleton } from '@nexora/ui/skeleton'
import { CreateHubModal } from '@/components/modals/create-hub-modal'
import type { Hub } from '@nexora/types'

const ATMOSPHERE_LABELS: Record<string, string> = {
  studio: 'Studio',
  arcade: 'Arcade',
  lounge: 'Lounge',
  guild: 'Guild',
  orbit: 'Orbit',
}

export default function DiscoverPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['public-hubs', search],
    queryFn: async () => {
      const res = await api.get<{ hubs: Hub[] }>('/hubs', { params: { q: search } })
      return res.data.hubs
    },
    staleTime: 30_000,
  })

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-5 border-b border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-4">
          <h1 className="font-brand text-xl font-bold text-[var(--text-primary)]">Discover Hubs</h1>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />
            Create Hub
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
          <input
            type="search"
            placeholder="Search public hubs…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
          />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-[var(--radius-md)]" />
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.map((hub) => (
              <HubCard key={hub.id} hub={hub} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-[var(--text-muted)] text-sm">No public hubs found.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 text-[var(--text-link)] text-sm hover:text-[var(--text-link-hover)] transition-colors"
            >
              Create the first one →
            </button>
          </div>
        )}
      </div>

      {showCreate && <CreateHubModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}

function HubCard({ hub }: { hub: Hub }) {
  return (
    <Link
      href={`/join/${hub.id}`}
      className="group flex flex-col gap-3 p-4 surface-elevated rounded-[var(--radius-md)] hover:border-[var(--border-strong)] hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <Avatar
          src={hub.iconUrl ?? undefined}
          fallback={hub.name}
          size="lg"
          className="shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm text-[var(--text-primary)] truncate">
              {hub.name}
            </h3>
            <Badge variant="default" size="sm">
              {ATMOSPHERE_LABELS[hub.atmosphere]}
            </Badge>
          </div>
          {hub.description && (
            <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-2">
              {hub.description}
            </p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
        <Users className="h-3 w-3" />
        <span>{hub.memberCount.toLocaleString()} members</span>
      </div>
    </Link>
  )
}
