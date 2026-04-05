'use client'

import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, Hash, Volume2, Video, Megaphone, Lock } from 'lucide-react'
import { CreateChannelSchema, type CreateChannelInput } from '@nexora/schemas'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { cn } from '@/lib/utils'
import { useHubStore } from '@/store/hub'
import type { Channel } from '@nexora/types'

type ChannelType = 'text' | 'announcement' | 'voice' | 'video'

const TYPES: { id: ChannelType; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: 'text',         label: 'Text',         desc: 'Send messages, images, and files', icon: <Hash className="h-5 w-5" /> },
  { id: 'announcement', label: 'Announcement', desc: 'Post important updates for your hub', icon: <Megaphone className="h-5 w-5" /> },
  { id: 'voice',        label: 'Voice',        desc: 'Hang out together with voice chat', icon: <Volume2 className="h-5 w-5" /> },
  { id: 'video',        label: 'Video',        desc: 'Share your screen or hang out on cam', icon: <Video className="h-5 w-5" /> },
]

interface Props {
  hubId: string
  onClose: () => void
}

export function CreateChannelModal({ hubId, onClose }: Props) {
  const queryClient = useQueryClient()
  const { zones, addChannel } = useHubStore()
  const [type, setType] = useState<ChannelType>('text')
  const [isPrivate, setIsPrivate] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<CreateChannelInput>({
    resolver: zodResolver(CreateChannelSchema),
    defaultValues: { type: 'text', isNsfw: false, slowmodeDelay: 0 },
  })

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const mutation = useMutation({
    mutationFn: (data: CreateChannelInput) =>
      api.post<Channel>('/channels', { ...data, hubId, type, isPrivate }),
    onSuccess: (res) => {
      addChannel(res.data)
      queryClient.invalidateQueries({ queryKey: ['hub', hubId] })
      notify.success('Channel created!', `#${res.data.name} is ready`)
      onClose()
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      notify.error(msg ?? 'Failed to create channel')
    },
  })

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{ background: 'rgba(0,0,0,0.6)' }}
    >
      <div
        className="w-full max-w-md bg-[var(--surface-panel)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <h2 className="font-brand font-bold text-lg text-[var(--text-primary)]">Create Channel</h2>
            <p className="text-sm text-[var(--text-muted)] mt-0.5">in {useHubStore.getState().hub?.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="px-6 pb-6 flex flex-col gap-5 mt-4">
          {/* Channel type */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Channel Type
            </p>
            <div className="flex flex-col gap-2">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-sm)] border text-left transition-all',
                    type === t.id
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)]'
                      : 'border-[var(--border-default)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-hover)]',
                  )}
                >
                  <span className={cn(
                    'shrink-0',
                    type === t.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]',
                  )}>
                    {t.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm font-semibold', type === t.id ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]')}>
                      {t.label}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">{t.desc}</p>
                  </div>
                  <div className={cn(
                    'h-4 w-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                    type === t.id ? 'border-[var(--accent-primary)]' : 'border-[var(--border-default)]',
                  )}>
                    {type === t.id && <div className="h-2 w-2 rounded-full bg-[var(--accent-primary)]" />}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Channel name */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
              Channel Name
            </label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] focus-within:border-[var(--accent-primary)] transition-colors">
              <span className="text-[var(--text-muted)] shrink-0">
                {TYPES.find(t => t.id === type)?.icon ?? <Hash className="h-4 w-4" />}
              </span>
              <input
                {...register('name')}
                placeholder="new-channel"
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
              />
            </div>
            {errors.name && (
              <p className="text-xs text-[var(--functional-error)] mt-1">{errors.name.message}</p>
            )}
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Lowercase letters, numbers, hyphens and underscores only.
            </p>
          </div>

          {/* Zone / category */}
          {zones.length > 0 && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Category (optional)
              </label>
              <select
                {...register('zoneId')}
                className="w-full bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
              >
                <option value="">No category</option>
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Private toggle */}
          <div className="flex items-center justify-between px-4 py-3 bg-[var(--surface-base)] rounded-[var(--radius-sm)] border border-[var(--border-default)]">
            <div className="flex items-center gap-3">
              <Lock className="h-4 w-4 text-[var(--text-muted)]" />
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">Private Channel</p>
                <p className="text-xs text-[var(--text-muted)]">Only selected members can view</p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPrivate}
              onClick={() => setIsPrivate((v) => !v)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none',
                isPrivate ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-active)]',
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                isPrivate ? 'translate-x-6' : 'translate-x-1',
              )} />
            </button>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create Channel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
