'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { useHubStore } from '@/store/hub'
import { Button } from '@nexora/ui/button'
import { cn } from '@/lib/utils'
import { useState } from 'react'
import type { Hub } from '@nexora/types'

const JOIN_POLICIES = [
  {
    id: 'open',
    label: 'Open',
    desc: 'Anyone can join without an invite.',
  },
  {
    id: 'invite_only',
    label: 'Invite Only',
    desc: 'Members must have an invite link to join.',
  },
  {
    id: 'waitlist',
    label: 'Waitlist',
    desc: 'New members are placed on a waitlist for approval.',
  },
  {
    id: 'email_confirmed',
    label: 'Email Verified',
    desc: 'Members must have a verified email address.',
  },
  {
    id: 'age_gated',
    label: 'Age Restricted (18+)',
    desc: 'Server is marked as age-restricted. Members confirm age on join.',
  },
] as const

type JoinPolicy = (typeof JOIN_POLICIES)[number]['id']

export function AccessTab({ hubId, hub }: { hubId: string; hub: Hub | null }) {
  const queryClient = useQueryClient()
  const { updateHub: updateHubStore } = useHubStore()
  const [joinPolicy, setJoinPolicy] = useState<JoinPolicy>((hub?.joinPolicy as JoinPolicy) ?? 'open')
  const [isPublic, setIsPublic] = useState(hub?.isPublic ?? true)

  const mutation = useMutation({
    mutationFn: () => api.patch<Hub>(`/hubs/${hubId}`, { joinPolicy, isPublic }),
    onSuccess: (res) => {
      updateHubStore(res.data)
      queryClient.invalidateQueries({ queryKey: ['hub', hubId] })
      notify.success('Access settings saved!')
    },
    onError: () => notify.error('Failed to save access settings'),
  })

  const dirty = joinPolicy !== hub?.joinPolicy || isPublic !== hub?.isPublic

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Access</h2>

      {/* Join Policy */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Join Policy</h3>
        <div className="flex flex-col gap-2">
          {JOIN_POLICIES.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setJoinPolicy(p.id)}
              className={cn(
                'flex items-start gap-3 px-4 py-3 rounded-[var(--radius-sm)] border text-left transition-all',
                joinPolicy === p.id
                  ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)]'
                  : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
              )}
            >
              <div className={cn(
                'mt-0.5 h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                joinPolicy === p.id ? 'border-[var(--accent-primary)]' : 'border-[var(--border-default)]',
              )}>
                {joinPolicy === p.id && <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />}
              </div>
              <div>
                <p className={cn('text-sm font-semibold', joinPolicy === p.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]')}>
                  {p.label}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{p.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Discovery */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-3">Discovery</h3>
        <div
          className="flex items-center justify-between px-4 py-3 bg-[var(--surface-panel)] rounded-[var(--radius-sm)] border border-[var(--border-default)] cursor-pointer"
          onClick={() => setIsPublic((v) => !v)}
        >
          <div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Public Server</p>
            <p className="text-xs text-[var(--text-muted)]">Show this server in public discovery and search</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={isPublic}
            onClick={(e) => { e.stopPropagation(); setIsPublic((v) => !v) }}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors',
              isPublic ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-active)]',
            )}
          >
            <span className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
              isPublic ? 'translate-x-6' : 'translate-x-1',
            )} />
          </button>
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
