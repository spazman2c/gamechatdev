'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Shield, ShieldCheck } from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { useHubStore } from '@/store/hub'
import { cn } from '@/lib/utils'
import type { Hub } from '@nexora/types'

const VERIFICATION_LEVELS = [
  { value: 0, label: 'None', desc: 'Unrestricted. Anyone can send messages.' },
  { value: 1, label: 'Low', desc: 'Must have a verified email address.' },
  { value: 2, label: 'Medium', desc: 'Must be registered on Nexora for longer than 5 minutes.' },
  { value: 3, label: 'High', desc: 'Must be a member of this server for longer than 10 minutes.' },
  { value: 4, label: 'Highest', desc: 'Must have a verified phone number.' },
] as const

const CONTENT_FILTERS = [
  { value: 0, label: 'Do not scan any media content', desc: 'Images are not scanned for explicit content.' },
  { value: 1, label: 'Scan media content from members without a role', desc: 'Media from unroled members is scanned.' },
  { value: 2, label: 'Scan all media content', desc: 'All media from all members is scanned.' },
] as const

export function SafetyTab({ hubId, hub }: { hubId: string; hub: Hub | null }) {
  const queryClient = useQueryClient()
  const { updateHub: updateHubStore } = useHubStore()
  const [verificationLevel, setVerificationLevel] = useState(hub?.verificationLevel ?? 0)
  const [contentFilter, setContentFilter] = useState(hub?.contentFilter ?? 0)

  const mutation = useMutation({
    mutationFn: () => api.patch<Hub>(`/hubs/${hubId}`, { verificationLevel, contentFilter }),
    onSuccess: (res) => {
      updateHubStore(res.data)
      queryClient.invalidateQueries({ queryKey: ['hub', hubId] })
      notify.success('Safety settings saved!')
    },
    onError: () => notify.error('Failed to save safety settings'),
  })

  const dirty = verificationLevel !== (hub?.verificationLevel ?? 0) || contentFilter !== (hub?.contentFilter ?? 0)

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Safety Setup</h2>

      {/* Verification Level */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <Shield className="h-4 w-4 text-[var(--accent-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Verification Level</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Determine the criteria a new member must meet before they can send messages in this server.
        </p>
        <div className="flex flex-col gap-2">
          {VERIFICATION_LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setVerificationLevel(l.value)}
              className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-[var(--radius-sm)] border text-left transition-all',
                verificationLevel === l.value
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
              )}
            >
              <div className={cn(
                'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                verificationLevel === l.value ? 'border-[var(--accent-primary)]' : 'border-[var(--border-default)]',
              )}>
                {verificationLevel === l.value && <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />}
              </div>
              <div>
                <p className={cn('text-sm font-semibold', verificationLevel === l.value ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]')}>
                  {l.label}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{l.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Content Filter */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <ShieldCheck className="h-4 w-4 text-[var(--accent-primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Explicit Content Filter</h3>
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-3">
          Automatically scan and delete messages containing explicit images.
        </p>
        <div className="flex flex-col gap-2">
          {CONTENT_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setContentFilter(f.value)}
              className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-[var(--radius-sm)] border text-left transition-all',
                contentFilter === f.value
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
              )}
            >
              <div className={cn(
                'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                contentFilter === f.value ? 'border-[var(--accent-primary)]' : 'border-[var(--border-default)]',
              )}>
                {contentFilter === f.value && <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />}
              </div>
              <div>
                <p className={cn('text-sm font-semibold', contentFilter === f.value ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]')}>
                  {f.label}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{f.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      <div className="flex justify-end">
        <Button onClick={() => mutation.mutate()} disabled={!dirty} loading={mutation.isPending}>
          Save Changes
        </Button>
      </div>
    </div>
  )
}
