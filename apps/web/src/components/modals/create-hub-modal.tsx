'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { CreateHubSchema, type CreateHubInput } from '@nexora/schemas'
import { Button } from '@nexora/ui/button'
import { Input } from '@nexora/ui/input'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { cn } from '@/lib/utils'
import type { Hub } from '@nexora/types'

const ATMOSPHERES = [
  { id: 'orbit',  label: 'Orbit',  desc: 'Futuristic, minimal, tech-forward' },
  { id: 'studio', label: 'Studio', desc: 'Clean, creator-focused, productivity' },
  { id: 'lounge', label: 'Lounge', desc: 'Warm, cozy, conversational' },
  { id: 'arcade', label: 'Arcade', desc: 'Energetic, neon, playful' },
  { id: 'guild',  label: 'Guild',  desc: 'Fantasy-inspired, structured' },
] as const

export function CreateHubModal({ onClose }: { onClose: () => void }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [selectedAtmosphere, setSelectedAtmosphere] = useState<'orbit' | 'studio' | 'lounge' | 'arcade' | 'guild'>('orbit')

  const { register, handleSubmit, formState: { errors } } = useForm<CreateHubInput>({
    resolver: zodResolver(CreateHubSchema),
    defaultValues: { atmosphere: 'orbit', isPublic: true, joinPolicy: 'open' },
  })

  const mutation = useMutation({
    mutationFn: (data: CreateHubInput) =>
      api.post<Hub>('/hubs', { ...data, atmosphere: selectedAtmosphere }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['joined-hubs'] })
      notify.success('Hub created!', `Welcome to ${res.data.name}`)
      onClose()
      router.push(`/app/hub/${res.data.id}`)
    },
    onError: () => notify.error('Failed to create hub'),
  })

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-hub-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md surface-elevated rounded-[var(--radius-lg)] shadow-lg overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 id="create-hub-title" className="font-brand font-bold text-lg text-[var(--text-primary)]">
            Create a Hub
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit((d) => mutation.mutate(d))} className="p-6 flex flex-col gap-5">
          <Input
            label="Hub name"
            placeholder="e.g. Midnight Gamers"
            error={errors.name?.message}
            {...register('name')}
          />

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Description
            </label>
            <textarea
              placeholder="What's this hub about?"
              rows={2}
              className="w-full bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] resize-none transition-colors"
              {...register('description')}
            />
          </div>

          {/* Atmosphere picker */}
          <div>
            <p className="text-sm font-medium text-[var(--text-secondary)] mb-2">Aura (Atmosphere)</p>
            <div className="grid grid-cols-5 gap-1.5">
              {ATMOSPHERES.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelectedAtmosphere(a.id)}
                  title={a.desc}
                  className={cn(
                    'flex flex-col items-center gap-1 p-2 rounded-[var(--radius-sm)] border text-xs font-medium transition-all',
                    selectedAtmosphere === a.id
                      ? 'border-[var(--accent-primary)] bg-[var(--accent-primary-bg)] text-[var(--accent-primary)]'
                      : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--border-default)] hover:text-[var(--text-secondary)]',
                  )}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Privacy */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is-public"
              className="h-4 w-4 accent-[var(--accent-primary)] rounded"
              defaultChecked
              {...register('isPublic')}
            />
            <label htmlFor="is-public" className="text-sm text-[var(--text-secondary)]">
              Make this hub public (discoverable)
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              Create Hub
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
