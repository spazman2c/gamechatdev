'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Shield, Hash, Users, Trash2, Plus, Crown, X } from 'lucide-react'
import { UpdateHubSchema, type UpdateHubInput } from '@nexora/schemas'
import { Button } from '@nexora/ui/button'
import { Input } from '@nexora/ui/input'
import { Avatar } from '@nexora/ui/avatar'
import { Badge } from '@nexora/ui/badge'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useHubStore } from '@/store/hub'
import { notify } from '@/store/notifications'
import type { Hub } from '@nexora/types'

const TABS = [
  { id: 'overview',   label: 'Overview',    icon: <Hash className="h-4 w-4" /> },
  { id: 'roles',      label: 'Roles',       icon: <Shield className="h-4 w-4" /> },
  { id: 'members',    label: 'Members',     icon: <Users className="h-4 w-4" /> },
  { id: 'moderation', label: 'Moderation',  icon: <Shield className="h-4 w-4" /> },
] as const

type TabId = (typeof TABS)[number]['id']

export default function HubSettingsPage() {
  const { hubId } = useParams<{ hubId: string }>()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const router = useRouter()
  const { hub, updateHub } = useHubStore()

  return (
    <div className="flex flex-1 overflow-hidden">
      <aside className="w-56 shrink-0 flex flex-col bg-[var(--surface-raised)] border-r border-[var(--border-subtle)] py-4 px-2 gap-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {hub?.name ?? 'Hub'} Settings
        </p>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-xs)] text-sm transition-colors w-full text-left',
              activeTab === tab.id
                ? 'bg-[var(--surface-active)] text-[var(--text-primary)] font-medium'
                : 'text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]',
            )}
            aria-current={activeTab === tab.id ? 'page' : undefined}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}

        <div className="mt-auto pt-4 border-t border-[var(--border-subtle)]">
          <button
            onClick={() => router.push(`/app/hub/${hubId}`)}
            className="flex items-center gap-2.5 px-3 py-2 rounded-[var(--radius-xs)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors w-full"
          >
            ← Back to hub
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto p-8 max-w-2xl">
        {activeTab === 'overview'   && <OverviewTab hubId={hubId} hub={hub} />}
        {activeTab === 'roles'      && <RolesTab hubId={hubId} />}
        {activeTab === 'members'    && <MembersTab hubId={hubId} />}
        {activeTab === 'moderation' && <ModerationTab hubId={hubId} />}
      </main>
    </div>
  )
}

function OverviewTab({ hubId, hub }: { hubId: string; hub: Hub | null }) {
  const queryClient = useQueryClient()
  const { updateHub: updateHubStore } = useHubStore()

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<UpdateHubInput>({
    resolver: zodResolver(UpdateHubSchema),
    defaultValues: {
      name: hub?.name ?? '',
      description: hub?.description ?? '',
      isPublic: hub?.isPublic ?? true,
    },
  })

  const mutation = useMutation({
    mutationFn: (data: UpdateHubInput) => api.patch<Hub>(`/hubs/${hubId}`, data),
    onSuccess: (res) => {
      updateHubStore(res.data)
      queryClient.invalidateQueries({ queryKey: ['hub', hubId] })
      notify.success('Hub updated!')
    },
    onError: () => notify.error('Failed to save hub settings'),
  })

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Overview</h2>
      <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="flex flex-col gap-5">
        <Input
          label="Hub name"
          error={errors.name?.message}
          {...register('name')}
        />
        <div>
          <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
            Description
          </label>
          <textarea
            rows={3}
            className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] resize-none focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            {...register('description')}
          />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="hub-public" className="h-4 w-4 accent-[var(--accent-primary)]" {...register('isPublic')} />
          <label htmlFor="hub-public" className="text-sm text-[var(--text-secondary)]">
            Make hub publicly discoverable
          </label>
        </div>
        <div className="flex justify-end">
          <Button type="submit" disabled={!isDirty} loading={mutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  )
}

function RolesTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['roles', hubId],
    queryFn: () => api.get<{ roles: Array<{ id: string; name: string; color: string | null; position: number; isDefault: boolean }> }>(`/hubs/${hubId}/roles`).then((r) => r.data.roles),
  })

  const createMutation = useMutation({
    mutationFn: () => api.post(`/hubs/${hubId}/roles`, { name: 'New Role' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', hubId] })
      notify.success('Role created')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => api.delete(`/hubs/${hubId}/roles/${roleId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles', hubId] }),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)]">Roles</h2>
        <Button size="sm" onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
          <Plus className="h-3.5 w-3.5" /> New role
        </Button>
      </div>
      <div className="flex flex-col gap-2">
        {data?.map((role) => (
          <div
            key={role.id}
            className="flex items-center gap-3 px-4 py-3 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)]"
          >
            <span
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: role.color ?? 'var(--text-muted)' }}
              aria-hidden="true"
            />
            <span className="text-sm font-medium text-[var(--text-primary)] flex-1">{role.name}</span>
            {role.isDefault && <Badge variant="default" size="sm">Default</Badge>}
            {!role.isDefault && (
              <button
                onClick={() => deleteMutation.mutate(role.id)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)] transition-colors"
                aria-label={`Delete role ${role.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MembersTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['members', hubId],
    queryFn: () => api.get<{ members: Array<{ user: { id: string; username: string; displayName: string | null; avatarUrl: string | null } }> }>(`/hubs/${hubId}/members`).then((r) => r.data.members),
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
  })

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">
        Members ({data?.length ?? 0})
      </h2>
      <div className="flex flex-col gap-1">
        {data?.map(({ user }) => (
          <div
            key={user.id}
            className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] group"
          >
            <Avatar
              src={user.avatarUrl ?? undefined}
              fallback={user.displayName ?? user.username}
              size="sm"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                {user.displayName ?? user.username}
              </p>
              <p className="text-xs text-[var(--text-muted)]">@{user.username}</p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
              <button
                onClick={() => kickMutation.mutate(user.id)}
                className="text-xs px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--functional-warning)] hover:bg-[var(--functional-warning-bg)] transition-colors"
              >
                Kick
              </button>
              <button
                onClick={() => banMutation.mutate(user.id)}
                className="text-xs px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--functional-error)] hover:bg-[var(--functional-error-bg)] transition-colors"
              >
                Ban
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ModerationTab({ hubId }: { hubId: string }) {
  const { channels } = useHubStore()
  const textChannels = channels.filter((c) => c.type === 'text')

  const slowmodeMutation = useMutation({
    mutationFn: ({ channelId, delay }: { channelId: string; delay: number }) =>
      api.patch(`/hubs/${hubId}/channels/${channelId}/slowmode`, { delay }),
    onSuccess: () => notify.success('Slow mode updated'),
    onError: () => notify.error('Failed to update slow mode'),
  })

  return (
    <div>
      <h2 className="font-brand text-xl font-bold text-[var(--text-primary)] mb-6">Moderation</h2>

      {/* Slow mode */}
      <section className="mb-8">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">Slow Mode</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Limit how often members can post in each channel.
        </p>
        <div className="flex flex-col gap-2">
          {textChannels.map((ch) => (
            <div key={ch.id} className="flex items-center gap-3 p-3 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)]">
              <span className="text-sm text-[var(--text-primary)] flex-1">#{ch.name}</span>
              <select
                defaultValue={String(ch.slowmodeDelay)}
                onChange={(e) =>
                  slowmodeMutation.mutate({ channelId: ch.id, delay: Number(e.target.value) })
                }
                className="bg-[var(--surface-raised)] border border-[var(--border-default)] text-sm text-[var(--text-primary)] rounded-[var(--radius-xs)] px-2 py-1 focus:outline-none focus:border-[var(--accent-primary)]"
              >
                <option value="0">Off</option>
                <option value="5">5s</option>
                <option value="10">10s</option>
                <option value="30">30s</option>
                <option value="60">1m</option>
                <option value="300">5m</option>
                <option value="600">10m</option>
                <option value="3600">1h</option>
              </select>
            </div>
          ))}
          {textChannels.length === 0 && (
            <p className="text-sm text-[var(--text-muted)]">No text channels in this hub.</p>
          )}
        </div>
      </section>

      {/* Word filter */}
      <section className="mb-8">
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">Word Filter</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Block or replace specific words. Filtered words are replaced with *** unless you choose to block the message entirely.
        </p>
        <WordFilterManager hubId={hubId} />
      </section>

      {/* Mod log */}
      <section>
        <h3 className="text-base font-semibold text-[var(--text-primary)] mb-3">Audit Log</h3>
        <ModLog hubId={hubId} />
      </section>
    </div>
  )
}

function WordFilterManager({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const [newWord, setNewWord] = useState('')
  const [blockMessage, setBlockMessage] = useState(false)

  const { data } = useQuery({
    queryKey: ['word-filters', hubId],
    queryFn: () =>
      api
        .get<{ filters: Array<{ id: string; word: string; blockMessage: boolean }> }>(`/hubs/${hubId}/word-filters`)
        .then((r) => r.data.filters),
  })

  const addMutation = useMutation({
    mutationFn: () => api.post(`/hubs/${hubId}/word-filters`, { word: newWord.trim(), blockMessage }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['word-filters', hubId] })
      setNewWord('')
      setBlockMessage(false)
      notify.success('Word filter added')
    },
    onError: () => notify.error('Failed to add word filter'),
  })

  const deleteMutation = useMutation({
    mutationFn: (filterId: string) => api.delete(`/hubs/${hubId}/word-filters/${filterId}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['word-filters', hubId] }),
  })

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newWord.trim()) { addMutation.mutate() } }}
          placeholder="Add a word…"
          className="flex-1 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
        />
        <label className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] whitespace-nowrap">
          <input
            type="checkbox"
            checked={blockMessage}
            onChange={(e) => setBlockMessage(e.target.checked)}
            className="h-3.5 w-3.5 accent-[var(--accent-primary)]"
          />
          Block message
        </label>
        <Button
          size="sm"
          onClick={() => addMutation.mutate()}
          disabled={!newWord.trim()}
          loading={addMutation.isPending}
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {data?.map((filter) => (
          <div
            key={filter.id}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-full text-xs"
          >
            <span className="text-[var(--text-primary)] font-mono">{filter.word}</span>
            {filter.blockMessage && (
              <span className="text-[var(--functional-error)] text-[10px]">block</span>
            )}
            <button
              onClick={() => deleteMutation.mutate(filter.id)}
              className="text-[var(--text-muted)] hover:text-[var(--functional-error)] transition-colors"
              aria-label={`Remove filter for ${filter.word}`}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        {data?.length === 0 && (
          <p className="text-sm text-[var(--text-muted)]">No word filters configured.</p>
        )}
      </div>
    </div>
  )
}

function ModLog({ hubId }: { hubId: string }) {
  const { data } = useQuery({
    queryKey: ['mod-log', hubId],
    queryFn: () =>
      api
        .get<{ actions: Array<{ id: string; action: string; actorId: string; targetId: string; reason: string | null; createdAt: string }> }>(`/hubs/${hubId}/mod-log`)
        .then((r) => r.data.actions),
  })

  if (!data || data.length === 0) {
    return <p className="text-sm text-[var(--text-muted)]">No moderation actions recorded.</p>
  }

  const ACTION_COLORS: Record<string, string> = {
    ban:    'error',
    kick:   'warning',
    unban:  'success',
    timeout:'warning',
  }

  return (
    <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
      {data.map((action) => (
        <div
          key={action.id}
          className="flex items-center gap-3 px-3 py-2 bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-sm)] text-xs"
        >
          <Badge variant={(ACTION_COLORS[action.action] as 'error' | 'warning' | 'success') ?? 'default'} size="sm">
            {action.action}
          </Badge>
          <span className="text-[var(--text-muted)] flex-1">
            Target: <span className="font-mono">{action.targetId.slice(0, 8)}</span>
            {action.reason && ` — ${action.reason}`}
          </span>
          <span className="text-[var(--text-muted)] shrink-0">
            {new Date(action.createdAt).toLocaleDateString()}
          </span>
        </div>
      ))}
    </div>
  )
}
