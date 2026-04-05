'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { X, Search, Copy, Check, ChevronDown, Settings2, Link } from 'lucide-react'
import { api } from '@/lib/api'
import { useInviteModal } from '@/store/invite-modal'
import { Avatar } from '@nexora/ui/avatar'
import { notify } from '@/store/notifications'
import { cn } from '@/lib/utils'
import { PRESENCE_COLORS } from '@nexora/types'
import type { PresenceStatus } from '@nexora/types'

const APP_URL = typeof window !== 'undefined' ? window.location.origin : ''

interface Friend {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  presence: string
}

interface Invite {
  code: string
  expiresAt: string | null
  maxUses: number | null
  uses: number
  temporary: boolean
}

const EXPIRY_OPTIONS = [
  { value: '30m', label: '30 minutes' },
  { value: '1h',  label: '1 hour' },
  { value: '6h',  label: '6 hours' },
  { value: '12h', label: '12 hours' },
  { value: '1d',  label: '1 day' },
  { value: '7d',  label: '7 days' },
  { value: 'never', label: 'Never' },
]

const MAX_USES_OPTIONS = [
  { value: null,  label: 'No limit' },
  { value: 1,     label: '1 use' },
  { value: 5,     label: '5 uses' },
  { value: 10,    label: '10 uses' },
  { value: 25,    label: '25 uses' },
  { value: 50,    label: '50 uses' },
  { value: 100,   label: '100 uses' },
]

export function InviteModal() {
  const { hubId, hubName, close } = useInviteModal()

  useEffect(() => {
    if (!hubId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hubId, close])

  if (!hubId || !hubName) return null

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <InviteCard hubId={hubId} hubName={hubName} onClose={close} />
    </div>
  )
}

function InviteCard({ hubId, hubName, onClose }: { hubId: string; hubName: string; onClose: () => void }) {
  const [view, setView] = useState<'invite' | 'settings'>('invite')
  const [search, setSearch] = useState('')
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set())
  const [copied, setCopied] = useState(false)
  const [invite, setInvite] = useState<Invite | null>(null)

  // Settings state
  const [expiresIn, setExpiresIn] = useState('7d')
  const [maxUses, setMaxUses] = useState<number | null>(null)
  const [temporary, setTemporary] = useState(false)

  // Load or create invite on mount
  const createMutation = useMutation({
    mutationFn: () =>
      api.post<Invite>('/invites', { hubId, expiresIn, maxUses, temporary }),
    onSuccess: (res) => setInvite(res.data),
    onError: () => notify.error('Failed to generate invite link'),
  })

  useEffect(() => {
    if (hubId) createMutation.mutate()
  }, [hubId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Friends list
  const { data: friendsData } = useQuery({
    queryKey: ['friends'],
    queryFn: async () => {
      const res = await api.get<{ friends: Friend[] }>('/social/friends')
      return res.data.friends
    },
    staleTime: 60_000,
  })

  const friends = (friendsData ?? []).filter((f) => {
    const q = search.toLowerCase()
    return (
      f.username.toLowerCase().includes(q) ||
      (f.displayName ?? '').toLowerCase().includes(q)
    )
  })

  const inviteLink = invite ? `${APP_URL}/invite/${invite.code}` : ''

  function copyLink() {
    if (!inviteLink) return
    navigator.clipboard.writeText(inviteLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function handleInviteFriend(friend: Friend) {
    setInvitedIds((prev) => new Set([...prev, friend.id]))
    // TODO: send DM with invite link when DMs are ready
    notify.success('Invite copied', `Share the link with ${friend.displayName ?? friend.username}`)
    copyLink()
  }

  function expiryLabel() {
    if (!invite?.expiresAt) return 'never expires'
    const diff = new Date(invite.expiresAt).getTime() - Date.now()
    const days = Math.round(diff / 86400000)
    if (days >= 1) return `expires in ${days} day${days !== 1 ? 's' : ''}`
    const hours = Math.round(diff / 3600000)
    return `expires in ${hours} hour${hours !== 1 ? 's' : ''}`
  }

  if (view === 'settings') {
    return (
      <SettingsView
        expiresIn={expiresIn}
        setExpiresIn={setExpiresIn}
        maxUses={maxUses}
        setMaxUses={setMaxUses}
        temporary={temporary}
        setTemporary={setTemporary}
        onCancel={() => setView('invite')}
        onGenerate={() => {
          createMutation.mutate()
          setView('invite')
        }}
        loading={createMutation.isPending}
        onClose={onClose}
      />
    )
  }

  return (
    <div
      className="w-full max-w-md bg-[var(--surface-panel)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-3">
        <div>
          <h2 className="font-semibold text-base text-[var(--text-primary)]">
            Invite friends to {hubName}
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            They'll be able to join the hub with your link
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-5 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] focus-within:border-[var(--accent-primary)] transition-colors">
          <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for friends"
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none"
          />
        </div>
      </div>

      {/* Friends list */}
      <div className="px-2 max-h-64 overflow-y-auto scrollbar-none">
        {friends.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)] text-center py-6">
            {search ? 'No friends match your search' : 'No friends yet'}
          </p>
        ) : (
          friends.map((friend) => {
            const name = friend.displayName ?? friend.username
            const isInvited = invitedIds.has(friend.id)
            const presenceColor = PRESENCE_COLORS[friend.presence as PresenceStatus] ?? PRESENCE_COLORS.offline

            return (
              <div
                key={friend.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors"
              >
                <Avatar
                  src={friend.avatarUrl ?? undefined}
                  fallback={name}
                  size="sm"
                  showPresence
                  presenceColor={presenceColor}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{name}</p>
                  <p className="text-xs text-[var(--text-muted)] truncate">@{friend.username}</p>
                </div>
                <button
                  onClick={() => !isInvited && handleInviteFriend(friend)}
                  disabled={isInvited}
                  className={cn(
                    'shrink-0 px-3 py-1 rounded-[var(--radius-xs)] text-xs font-medium transition-colors',
                    isInvited
                      ? 'bg-[var(--surface-active)] text-[var(--text-muted)] cursor-default'
                      : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-light)]',
                  )}
                >
                  {isInvited ? 'Invited' : 'Invite'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--border-subtle)] mx-5 my-3" />

      {/* Invite link section */}
      <div className="px-5 pb-5">
        <p className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
          Or, send a hub invite link
        </p>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] min-w-0">
            <Link className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
            <span className="text-sm text-[var(--text-secondary)] truncate font-mono">
              {inviteLink || 'Generating…'}
            </span>
          </div>
          <button
            onClick={copyLink}
            disabled={!inviteLink}
            className={cn(
              'shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-[var(--radius-sm)] text-sm font-medium transition-colors',
              copied
                ? 'bg-[var(--functional-success)] text-white'
                : 'bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-light)] disabled:opacity-50',
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="text-[11px] text-[var(--text-muted)] mt-2">
          {invite ? (
            <>
              Your invite link {expiryLabel()}.{' '}
              <button
                onClick={() => setView('settings')}
                className="text-[var(--accent-primary)] hover:underline"
              >
                Edit invite link.
              </button>
            </>
          ) : (
            'Generating invite link…'
          )}
        </p>
      </div>
    </div>
  )
}

// ─── Settings view ────────────────────────────────────────────────────────────

function SettingsView({
  expiresIn, setExpiresIn,
  maxUses, setMaxUses,
  temporary, setTemporary,
  onCancel, onGenerate, loading, onClose,
}: {
  expiresIn: string
  setExpiresIn: (v: string) => void
  maxUses: number | null
  setMaxUses: (v: number | null) => void
  temporary: boolean
  setTemporary: (v: boolean) => void
  onCancel: () => void
  onGenerate: () => void
  loading: boolean
  onClose: () => void
}) {
  return (
    <div
      className="w-full max-w-md bg-[var(--surface-panel)] rounded-[var(--radius-lg)] shadow-2xl overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-5 pt-5 pb-4">
        <h2 className="font-semibold text-base text-[var(--text-primary)]">Hub invite link settings</h2>
        <button
          onClick={onClose}
          className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="px-5 pb-2 space-y-5">
        {/* Expire After */}
        <SettingsField label="Expire After">
          <Select
            value={expiresIn}
            onChange={setExpiresIn}
            options={EXPIRY_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
          />
        </SettingsField>

        {/* Max Uses */}
        <SettingsField label="Max Number of Uses">
          <Select
            value={maxUses === null ? 'null' : String(maxUses)}
            onChange={(v) => setMaxUses(v === 'null' ? null : Number(v))}
            options={MAX_USES_OPTIONS.map((o) => ({
              value: o.value === null ? 'null' : String(o.value),
              label: o.label,
            }))}
          />
        </SettingsField>

        {/* Temporary membership */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-[var(--text-primary)]">Grant temporary membership</span>
            <button
              role="switch"
              aria-checked={temporary}
              onClick={() => setTemporary(!temporary)}
              className={cn(
                'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none',
                temporary ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-active)]',
              )}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                  temporary ? 'translate-x-6' : 'translate-x-1',
                )}
              />
            </button>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-1 pr-16">
            Temporary members are automatically kicked when they disconnect unless a role has been assigned
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 px-5 py-4 border-t border-[var(--border-subtle)] mt-3">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-[var(--radius-sm)] bg-[var(--surface-base)] text-sm font-medium text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border-default)]"
        >
          Cancel
        </button>
        <button
          onClick={onGenerate}
          disabled={loading}
          className="flex-1 py-2 rounded-[var(--radius-sm)] bg-[var(--accent-primary)] text-sm font-medium text-white hover:bg-[var(--accent-primary-light)] transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate a New Link'}
        </button>
      </div>
    </div>
  )
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
        {label}
      </label>
      {children}
    </div>
  )
}

function Select({
  value, onChange, options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--surface-base)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors"
      >
        {selected?.label ?? 'Select'}
        <ChevronDown className={cn('h-4 w-4 text-[var(--text-muted)] transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="absolute z-10 left-0 right-0 mt-1 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] shadow-lg overflow-hidden">
          {options.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={cn(
                'w-full text-left px-4 py-2.5 text-sm transition-colors',
                opt.value === value
                  ? 'bg-[var(--accent-primary)] text-white'
                  : 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
