'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ClipboardList } from 'lucide-react'
import { Badge } from '@nexora/ui/badge'
import { api } from '@/lib/api'

interface ModAction {
  id: string
  action: string
  actorId: string | null
  targetId: string | null
  reason: string | null
  createdAt: string
}

const ACTION_VARIANTS: Record<string, 'error' | 'warning' | 'success' | 'default'> = {
  ban:    'error',
  kick:   'warning',
  unban:  'success',
  timeout: 'warning',
  warn:   'default',
  delete_message: 'default',
}

const ALL_ACTIONS = ['ban', 'kick', 'unban', 'timeout', 'warn', 'delete_message']

export function AuditLogTab({ hubId }: { hubId: string }) {
  const [filterAction, setFilterAction] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['mod-log', hubId],
    queryFn: () =>
      api.get<{ actions: ModAction[] }>(`/hubs/${hubId}/mod-log`).then((r) => r.data.actions),
  })

  const filtered = (data ?? []).filter((a) => !filterAction || a.action === filterAction)

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-4">Audit Log</h2>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterAction}
          onChange={(e) => setFilterAction(e.target.value)}
          className="bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
        >
          <option value="">All actions</option>
          {ALL_ACTIONS.map((a) => (
            <option key={a} value={a}>{a.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-[var(--radius-sm)] bg-[var(--surface-panel)] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-[var(--text-muted)]">
          <ClipboardList className="h-10 w-10 opacity-30" />
          <p className="text-sm">No moderation actions recorded{filterAction ? ' for this filter' : ''}.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filtered.map((action) => (
            <div
              key={action.id}
              className="flex items-center gap-3 px-4 py-3 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-xs"
            >
              <Badge variant={ACTION_VARIANTS[action.action] ?? 'default'} size="sm">
                {action.action.replace('_', ' ')}
              </Badge>
              <span className="text-[var(--text-muted)] flex-1 min-w-0 truncate">
                {action.targetId ? (
                  <>Target: <span className="font-mono">{action.targetId.slice(0, 8)}</span></>
                ) : '—'}
                {action.reason && <> — {action.reason}</>}
              </span>
              <span className="text-[var(--text-muted)] shrink-0">
                {new Date(action.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
