'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ChevronRight, ArrowLeft } from 'lucide-react'
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

type View = 'landing' | 'create' | 'join'

/** Extract the invite code from a raw input — accepts full URL or bare code */
function parseInviteCode(raw: string): string {
  const trimmed = raw.trim()
  // Match /invite/CODE at end of URL
  const urlMatch = trimmed.match(/\/invite\/([A-Za-z0-9_-]+)\s*$/)
  if (urlMatch) return urlMatch[1]!
  // Bare code (no slashes or dots)
  if (/^[A-Za-z0-9_-]+$/.test(trimmed)) return trimmed
  return trimmed
}

export function CreateHubModal({ onClose }: { onClose: () => void }) {
  const [view, setView] = useState<View>('landing')

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />

      {view === 'landing' && (
        <LandingView
          onClose={onClose}
          onCreate={() => setView('create')}
          onJoin={() => setView('join')}
        />
      )}
      {view === 'create' && (
        <CreateView onClose={onClose} onBack={() => setView('landing')} />
      )}
      {view === 'join' && (
        <JoinView onClose={onClose} onBack={() => setView('landing')} />
      )}
    </div>
  )
}

// ─── Landing ──────────────────────────────────────────────────────────────────

function LandingView({
  onClose,
  onCreate,
  onJoin,
}: {
  onClose: () => void
  onCreate: () => void
  onJoin: () => void
}) {
  return (
    <div className="relative w-full max-w-sm surface-elevated rounded-[var(--radius-lg)] shadow-lg overflow-hidden animate-slide-up">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1.5 rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors z-10"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="px-6 pt-8 pb-2 text-center">
        <h2 className="font-brand font-bold text-xl text-[var(--text-primary)]">Create Your Hub</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1.5 max-w-xs mx-auto">
          Your hub is where you and your friends hang out. Make yours and start talking.
        </p>
      </div>

      <div className="px-4 py-4 flex flex-col gap-2">
        {/* Create My Own */}
        <button
          onClick={onCreate}
          className="flex items-center gap-3 w-full px-4 py-3.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all text-left"
        >
          <span className="text-xl">🚀</span>
          <span className="flex-1 text-sm font-semibold text-[var(--text-primary)]">Create My Own</span>
          <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
        </button>

        {/* Templates */}
        <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest px-1 pt-1">
          Start from a template
        </p>
        {[
          { emoji: '🎮', label: 'Gaming' },
          { emoji: '💬', label: 'Friends' },
          { emoji: '📚', label: 'Study Group' },
          { emoji: '🎨', label: 'Creative' },
        ].map(({ emoji, label }) => (
          <button
            key={label}
            onClick={onCreate}
            className="flex items-center gap-3 w-full px-4 py-3 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] hover:border-[var(--border-strong)] transition-all text-left"
          >
            <span className="text-xl">{emoji}</span>
            <span className="flex-1 text-sm font-medium text-[var(--text-primary)]">{label}</span>
            <ChevronRight className="h-4 w-4 text-[var(--text-muted)]" />
          </button>
        ))}
      </div>

      {/* Join section */}
      <div className="px-6 pb-6 border-t border-[var(--border-subtle)] pt-4">
        <p className="text-sm font-semibold text-[var(--text-primary)] text-center mb-3">
          Have an invite already?
        </p>
        <button
          onClick={onJoin}
          className="w-full py-2.5 rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] text-sm font-medium text-[var(--text-primary)] transition-colors"
        >
          Join a Hub
        </button>
      </div>
    </div>
  )
}

// ─── Join ─────────────────────────────────────────────────────────────────────

function JoinView({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [value, setValue] = useState('')
  const [joining, setJoining] = useState(false)
  const [err, setErr] = useState('')

  const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://yourapp.com'

  async function handleJoin() {
    const code = parseInviteCode(value)
    if (!code) { setErr('Please enter an invite link or code.'); return }
    setErr('')
    setJoining(true)
    try {
      const res = await api.post<{ hubId: string }>(`/invites/${code}/join`)
      queryClient.invalidateQueries({ queryKey: ['joined-hubs'] })
      notify.success('Joined!', 'Welcome to your new hub')
      onClose()
      router.push(`/app/hub/${res.data.hubId}`)
    } catch (e: unknown) {
      const code_ = (e as { response?: { data?: { code?: string; message?: string } } })?.response?.data?.code
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (code_ === 'ALREADY_HUB_MEMBER') {
        // Look up hub id from invite preview
        try {
          const info = await api.get<{ hub: { id: string } }>(`/invites/${parseInviteCode(value)}`)
          onClose()
          router.push(`/app/hub/${info.data.hub.id}`)
        } catch {
          notify.error('You are already a member of this hub')
          onClose()
        }
      } else {
        setErr(msg ?? 'Invalid or expired invite link.')
      }
      setJoining(false)
    }
  }

  return (
    <div className="relative w-full max-w-sm surface-elevated rounded-[var(--radius-lg)] shadow-lg overflow-hidden animate-slide-up">
      <button
        onClick={onClose}
        className="absolute top-3 right-3 p-1.5 rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors z-10"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="px-6 pt-8 pb-4 text-center">
        <h2 className="font-brand font-bold text-xl text-[var(--text-primary)]">Join a Hub</h2>
        <p className="text-sm text-[var(--text-muted)] mt-1.5">
          Enter an invite below to join an existing hub
        </p>
      </div>

      <div className="px-6 pb-2 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
            Invite link <span className="text-[var(--functional-error)]">*</span>
          </label>
          <input
            value={value}
            onChange={(e) => { setValue(e.target.value); setErr('') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleJoin() }}
            placeholder={`${appUrl}/invite/hTKzmak`}
            className={cn(
              'w-full bg-[var(--surface-base)] border rounded-[var(--radius-sm)] px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors',
              err
                ? 'border-[var(--functional-error)] focus:border-[var(--functional-error)]'
                : 'border-[var(--border-default)] focus:border-[var(--accent-primary)]',
            )}
          />
          {err && <p className="text-xs text-[var(--functional-error)] mt-1.5">{err}</p>}
        </div>

        {/* Examples */}
        <div>
          <p className="text-xs text-[var(--text-muted)] mb-2">Invites should look like</p>
          <div className="flex flex-wrap gap-1.5">
            {['hTKzmak', `${appUrl}/invite/hTKzmak`].map((ex) => (
              <button
                key={ex}
                onClick={() => { setValue(ex); setErr('') }}
                className="px-2 py-1 rounded bg-[var(--surface-panel)] border border-[var(--border-default)] text-xs text-[var(--text-secondary)] font-mono hover:border-[var(--border-strong)] transition-colors truncate max-w-[200px]"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-6 py-4 mt-2 border-t border-[var(--border-subtle)]">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-[var(--accent-primary)] hover:underline"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </button>
        <Button onClick={handleJoin} loading={joining} disabled={!value.trim()}>
          Join Hub
        </Button>
      </div>
    </div>
  )
}

// ─── Create ───────────────────────────────────────────────────────────────────

function CreateView({ onClose, onBack }: { onClose: () => void; onBack: () => void }) {
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
    <div className="relative w-full max-w-md surface-elevated rounded-[var(--radius-lg)] shadow-lg overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <button
          onClick={onBack}
          className="p-1.5 rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="font-brand font-bold text-lg text-[var(--text-primary)]">Create a Hub</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

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
  )
}
