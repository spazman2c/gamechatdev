'use client'

import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { X, MessageSquare, MoreHorizontal } from 'lucide-react'
import { Avatar } from '@nexora/ui/avatar'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useProfileModal, type ProfileAnchor } from '@/store/profile-modal'
import { notify } from '@/store/notifications'
import { PRESENCE_LABELS, PRESENCE_COLORS } from '@nexora/types'
import { cn } from '@/lib/utils'
import type { UserProfile } from '@nexora/types'

const CARD_W = 340
const CARD_H = 480 // generous estimate; card is self-sizing but this prevents edge clipping
const GAP    = 12  // gap between cursor and card edge

function computeStyle(anchor: ProfileAnchor | null | undefined): React.CSSProperties {
  if (!anchor) {
    // fallback: centered
    return { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  }

  const vw = window.innerWidth
  const vh = window.innerHeight

  // Prefer opening to the right; flip left if not enough room
  let left = anchor.x + GAP
  if (left + CARD_W > vw - GAP) {
    left = anchor.x - CARD_W - GAP
  }
  left = Math.max(GAP, left)

  // Align top to click; push up if near bottom
  let top = anchor.y - 60 // slight upward offset so card starts near click
  if (top + CARD_H > vh - GAP) {
    top = vh - CARD_H - GAP
  }
  top = Math.max(GAP, top)

  return { position: 'fixed', top, left }
}

export function UserProfileModal() {
  const { userId, anchor, closeProfile } = useProfileModal()
  const currentUser = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!userId) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeProfile() }
    const onDown = (e: MouseEvent) => {
      const card = document.getElementById('profile-card')
      if (card && !card.contains(e.target as Node)) closeProfile()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [userId, closeProfile])

  if (!userId) return null

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal)] pointer-events-none"
      role="dialog"
      aria-modal="true"
      aria-label="User profile"
    >
      <ProfileCard
        userId={userId}
        isOwnProfile={userId === currentUser?.id}
        onClose={closeProfile}
        style={computeStyle(anchor)}
      />
    </div>
  )
}

// ─── Card ────────────────────────────────────────────────────────────────────

function ProfileCard({
  userId,
  isOwnProfile,
  onClose,
  style,
}: {
  userId: string
  isOwnProfile: boolean
  onClose: () => void
  style?: React.CSSProperties
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const res = await api.get<UserProfile>(`/users/${userId}`)
      return res.data
    },
    staleTime: 30_000,
  })

  const presenceKey = data?.presence ?? 'offline'
  const presenceColor = PRESENCE_COLORS[presenceKey as keyof typeof PRESENCE_COLORS] ?? '#4A5568'
  const presenceLabel = PRESENCE_LABELS[presenceKey as keyof typeof PRESENCE_LABELS] ?? presenceKey

  return (
    <div
      id="profile-card"
      className="relative w-[340px] surface-elevated rounded-[var(--radius-lg)] shadow-2xl overflow-hidden animate-slide-up pointer-events-auto"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Banner */}
      <div
        className="h-[88px] w-full relative"
        style={{
          background: `linear-gradient(135deg, ${presenceColor}50 0%, ${presenceColor}18 100%)`,
        }}
      >
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {!isOwnProfile && (
            <button
              onClick={() => notify.info('Coming soon', 'Direct messages are on the way!')}
              className="h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-colors"
              title="Send message"
              aria-label="Send message"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-colors"
            title="Close"
            aria-label="Close profile"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="px-4 pb-4">
        {/* Avatar + more-options row */}
        <div className="flex items-end justify-between -mt-[46px] mb-3">
          <div
            className={cn(
              'rounded-full ring-[5px] ring-[var(--surface-elevated)]',
              isLoading && 'animate-pulse',
            )}
          >
            {isLoading ? (
              <div className="h-[72px] w-[72px] rounded-full bg-[var(--surface-panel)]" />
            ) : (
              <Avatar
                size="2xl"
                src={data?.avatarUrl ?? undefined}
                fallback={data?.displayName ?? '?'}
                showPresence
                presenceColor={presenceColor}
              />
            )}
          </div>

          {!isOwnProfile && !isLoading && (
            <button
              className="mb-1 h-8 w-8 rounded-full bg-[var(--surface-panel)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
              title="More options"
              aria-label="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          )}
        </div>

        {isLoading ? (
          <ProfileSkeleton />
        ) : data ? (
          <ProfileInfo
            data={data}
            presenceColor={presenceColor}
            presenceLabel={presenceLabel}
            isOwnProfile={isOwnProfile}
          />
        ) : (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">User not found.</p>
        )}
      </div>

      {/* Message input */}
      {!isLoading && data && !isOwnProfile && (
        <div className="px-4 pb-4">
          <button
            onClick={() => notify.info('Coming soon', 'Direct messages are on the way!')}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--surface-panel)] hover:bg-[var(--surface-hover)] transition-colors text-left border border-transparent focus:outline-none focus:border-[var(--accent-primary)]"
            aria-label={`Message ${data.username}`}
          >
            <span className="flex-1 text-sm text-[var(--text-muted)]">
              Message @{data.username}
            </span>
            <span aria-hidden="true">😊</span>
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Profile info ────────────────────────────────────────────────────────────

function ProfileInfo({
  data,
  presenceColor,
  presenceLabel,
  isOwnProfile,
}: {
  data: UserProfile
  presenceColor: string
  presenceLabel: string
  isOwnProfile: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Name */}
      <div>
        <h2 className="font-brand font-bold text-xl text-[var(--text-primary)] leading-tight">
          {data.displayName}
        </h2>
        <p className="text-sm text-[var(--text-muted)]">@{data.username}</p>
      </div>

      {/* Presence */}
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: presenceColor }}
          aria-hidden="true"
        />
        <span className="text-sm text-[var(--text-secondary)]">{presenceLabel}</span>
      </div>

      <Divider />

      {/* Bio / About */}
      {data.bio && (
        <>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1.5">
              About
            </p>
            <p className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap">
              {data.bio}
            </p>
          </div>
          <Divider />
        </>
      )}

      {/* Member since */}
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-1">
          Member since
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          {new Date(data.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        </p>
      </div>

      {/* Mutual hubs */}
      {!isOwnProfile && data.mutualHubs.length > 0 && (
        <>
          <Divider />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[var(--text-muted)] mb-2">
              {data.mutualHubs.length} Mutual {data.mutualHubs.length === 1 ? 'Hub' : 'Hubs'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {data.mutualHubs.map((hub) => (
                <div
                  key={hub.id}
                  className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-full bg-[var(--surface-panel)] text-xs text-[var(--text-secondary)]"
                >
                  <Avatar size="xs" src={hub.iconUrl ?? undefined} fallback={hub.name} />
                  <span>{hub.name}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-[var(--border-subtle)]" />
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse">
      <div className="flex flex-col gap-1.5">
        <div className="h-6 w-36 rounded bg-[var(--surface-panel)]" />
        <div className="h-4 w-24 rounded bg-[var(--surface-panel)]" />
      </div>
      <div className="h-4 w-28 rounded bg-[var(--surface-panel)]" />
      <div className="h-px bg-[var(--border-subtle)]" />
      <div className="flex flex-col gap-1.5">
        <div className="h-3 w-16 rounded bg-[var(--surface-panel)]" />
        <div className="h-4 w-full rounded bg-[var(--surface-panel)]" />
        <div className="h-4 w-3/4 rounded bg-[var(--surface-panel)]" />
      </div>
    </div>
  )
}
