'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Plus, Trash2, Copy, Check, Pause } from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { cn } from '@/lib/utils'

interface Invite {
  code: string
  hubId: string
  createdBy: string | null
  uses: number
  maxUses: number | null
  expiresAt: string | null
  temporary: boolean
  createdAt: string
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return 'Never'
  const d = new Date(expiresAt)
  if (d < new Date()) return 'Expired'
  const diff = d.getTime() - Date.now()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Soon'
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export function InvitesTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [expiresIn, setExpiresIn] = useState<'1h' | '6h' | '12h' | '1d' | '7d' | 'never'>('7d')
  const [maxUses, setMaxUses] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  const { data, isLoading } = useQuery({
    queryKey: ['invites', hubId],
    queryFn: () => api.get<{ invites: Invite[] }>(`/invites/hub/${hubId}`).then((r) => r.data.invites),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post<Invite>('/invites', {
      hubId,
      expiresIn,
      maxUses: maxUses ? parseInt(maxUses, 10) : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', hubId] })
      setShowCreate(false)
      setMaxUses('')
      notify.success('Invite created')
    },
    onError: () => notify.error('Failed to create invite'),
  })

  const revokeMutation = useMutation({
    mutationFn: (code: string) => api.delete(`/invites/${code}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites', hubId] })
      notify.success('Invite revoked')
    },
    onError: () => notify.error('Failed to revoke invite'),
  })

  function copyInvite(code: string) {
    navigator.clipboard.writeText(`${origin}/invite/${code}`)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)]">Invites</h2>
        <Button size="sm" onClick={() => setShowCreate((v) => !v)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Create Invite
        </Button>
      </div>

      {/* Create invite form */}
      {showCreate && (
        <div className="mb-5 p-4 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">New Invite</h3>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Expires after</label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(e.target.value as typeof expiresIn)}
                className="w-full bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="1h">1 hour</option>
                <option value="6h">6 hours</option>
                <option value="12h">12 hours</option>
                <option value="1d">1 day</option>
                <option value="7d">7 days</option>
                <option value="never">Never</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs text-[var(--text-muted)] mb-1">Max uses (optional)</label>
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Unlimited"
                min={1}
                max={1000}
                className="w-full bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" loading={createMutation.isPending} onClick={() => createMutation.mutate()}>
              Generate Invite
            </Button>
          </div>
        </div>
      )}

      {/* Invite list */}
      {isLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-[var(--radius-md)] bg-[var(--surface-panel)] animate-pulse" />
          ))}
        </div>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-[var(--text-muted)]">
          <Link className="h-10 w-10 opacity-30" />
          <p className="text-sm">No active invites. Create one to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {data?.map((invite) => {
            const expired = invite.expiresAt && new Date(invite.expiresAt) < new Date()
            return (
              <div
                key={invite.code}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 bg-[var(--surface-panel)] border rounded-[var(--radius-md)] group',
                  expired ? 'border-[var(--border-subtle)] opacity-60' : 'border-[var(--border-subtle)]',
                )}
              >
                <code className="text-sm font-mono text-[var(--accent-primary)] flex-1">{invite.code}</code>
                <div className="text-xs text-[var(--text-muted)] flex items-center gap-3 shrink-0">
                  <span>{invite.uses}{invite.maxUses ? `/${invite.maxUses}` : ''} uses</span>
                  <span>Expires: {formatExpiry(invite.expiresAt)}</span>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => copyInvite(invite.code)}
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                    title="Copy invite link"
                  >
                    {copiedCode === invite.code ? <Check className="h-3.5 w-3.5 text-[var(--functional-success)]" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                  <button
                    onClick={() => revokeMutation.mutate(invite.code)}
                    className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)] transition-colors"
                    title="Revoke invite"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
