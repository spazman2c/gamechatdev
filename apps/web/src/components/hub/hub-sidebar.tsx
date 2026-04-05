'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import {
  Hash,
  Volume2,
  Video,
  Megaphone,
  ChevronDown,
  ChevronRight,
  Lock,
  PhoneOff,
  Mic,
  MicOff,
  Maximize2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useHubStore } from '@/store/hub'
import type { VoiceParticipant } from '@/store/hub'
import { useAuthStore } from '@/store/auth'
import { Avatar } from '@nexora/ui/avatar'
import { UserControlsBar } from './user-controls-bar'
import { openProfile } from '@/store/profile-modal'
import { openContextMenu } from '@/store/context-menu'
import { useVoiceSession } from '@/contexts/voice-session-context'
import { PRESENCE_COLORS } from '@nexora/types'
import { api } from '@/lib/api'
import { useHubUI } from '@/store/hub-ui'
import { useNotificationCenter } from '@/store/notification-center'
import type { Channel, ChannelType, PresenceStatus } from '@nexora/types'
import { HubMenu } from './hub-menu'
import { CreateChannelModal } from '@/components/modals/create-channel-modal'
import { CreateCategoryModal } from '@/components/modals/create-category-modal'

const CHANNEL_ICONS: Record<ChannelType, React.ReactNode> = {
  text:         <Hash className="h-4 w-4 shrink-0" />,
  announcement: <Megaphone className="h-4 w-4 shrink-0" />,
  voice:        <Volume2 className="h-4 w-4 shrink-0" />,
  video:        <Video className="h-4 w-4 shrink-0" />,
  stage:        <Volume2 className="h-4 w-4 shrink-0" />,
}

export function HubSidebar({ hubId }: { hubId: string }) {
  const pathname = usePathname()
  const { hub, zones, channels, collapsedZones, toggleZone, voiceParticipants } = useHubStore()
  const { user } = useAuthStore()
  const [showCreateChannel, setShowCreateChannel] = useState(false)
  const [showCreateCategory, setShowCreateCategory] = useState(false)

  // Listen for menu events dispatched by HubMenu
  useEffect(() => {
    const onCreateChannel = () => setShowCreateChannel(true)
    const onCreateCategory = () => setShowCreateCategory(true)
    window.addEventListener('hub:create-channel', onCreateChannel)
    window.addEventListener('hub:create-category', onCreateCategory)
    return () => {
      window.removeEventListener('hub:create-channel', onCreateChannel)
      window.removeEventListener('hub:create-category', onCreateCategory)
    }
  }, [])

  if (!hub) { return null }

  const isOwner = hub.ownerId === user?.id
  const orphanChannels = channels.filter((c) => !c.zoneId)

  return (
    <div className="flex flex-col h-full" data-atmosphere={hub.atmosphere}>
      {/* Hub header — clicking name opens dropdown menu */}
      <div className="flex items-center border-b border-[var(--border-subtle)] shrink-0">
        <HubMenu hubId={hubId} hubName={hub.name} isOwner={isOwner} />
      </div>

      {/* Modals */}
      {showCreateChannel && (
        <CreateChannelModal hubId={hubId} onClose={() => setShowCreateChannel(false)} />
      )}
      {showCreateCategory && (
        <CreateCategoryModal hubId={hubId} onClose={() => setShowCreateCategory(false)} />
      )}

      {/* Channel list */}
      <nav className="flex-1 overflow-y-auto py-2 px-1 scrollbar-none" aria-label="Channels">
        {orphanChannels.map((ch) => (
          <ChannelRow
            key={ch.id}
            channel={ch}
            hubId={hubId}
            pathname={pathname}
            participants={voiceParticipants[ch.id] ?? []}
          />
        ))}

        {zones.map((zone) => {
          const zoneChannels = channels
            .filter((c) => c.zoneId === zone.id)
            .sort((a, b) => a.position - b.position)
          const isCollapsed = collapsedZones.has(zone.id)

          return (
            <div key={zone.id} className="mb-1">
              <button
                onClick={() => toggleZone(zone.id)}
                className="flex w-full items-center gap-1 px-2 py-1 rounded text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                aria-expanded={!isCollapsed}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-3 w-3 shrink-0" />
                ) : (
                  <ChevronDown className="h-3 w-3 shrink-0" />
                )}
                <span className="text-xs font-semibold uppercase tracking-wider truncate">
                  {zone.name}
                </span>
              </button>

              {!isCollapsed && (
                <div>
                  {zoneChannels.map((ch) => (
                    <ChannelRow
                      key={ch.id}
                      channel={ch}
                      hubId={hubId}
                      pathname={pathname}
                      participants={voiceParticipants[ch.id] ?? []}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Voice panel */}
      <VoicePanel hubId={hubId} />

      {/* User controls bar */}
      <UserControlsBar />
    </div>
  )
}

// ─── Members Panel ───────────────────────────────────────────────────────────

interface MemberUser {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  presence: string
}

interface HubMember {
  userId: string
  nickname: string | null
  user: MemberUser
}

export function MembersPanel({ hubId }: { hubId: string }) {
  const { user: me } = useAuthStore()

  const { data, isLoading } = useQuery({
    queryKey: ['hub-members', hubId],
    queryFn: async () => {
      const res = await api.get<{ members: HubMember[] }>(`/hubs/${hubId}/members`)
      return res.data.members
    },
    staleTime: 60_000,
  })

  const online  = data?.filter((m) => m.user.presence !== 'offline') ?? []
  const offline = data?.filter((m) => m.user.presence === 'offline') ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="px-3 py-3 shrink-0">
        <span className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">
          Members{data ? ` — ${data.length}` : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1 scrollbar-none">
        {isLoading ? (
          <div className="flex flex-col gap-1 px-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 px-2 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-[var(--surface-panel)] shrink-0" />
                <div className="flex-1">
                  <div className="h-3 w-24 rounded bg-[var(--surface-panel)] mb-1" />
                  <div className="h-2 w-16 rounded bg-[var(--surface-panel)]" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {online.length > 0 && (
              <section className="mb-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] px-3 py-1">
                  Online — {online.length}
                </p>
                {online.map((m) => (
                  <MemberRow key={m.userId} member={m} isMe={m.userId === me?.id} />
                ))}
              </section>
            )}
            {offline.length > 0 && (
              <section>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] px-3 py-1">
                  Offline — {offline.length}
                </p>
                {offline.map((m) => (
                  <MemberRow key={m.userId} member={m} isMe={m.userId === me?.id} />
                ))}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MemberRow({ member, isMe }: { member: HubMember; isMe: boolean }) {
  const displayName = member.nickname ?? member.user.displayName ?? member.user.username
  const showHandle = member.user.displayName && member.user.displayName !== member.user.username
  const presenceColor = PRESENCE_COLORS[member.user.presence as PresenceStatus] ?? PRESENCE_COLORS.offline

  return (
    <button
      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-[var(--radius-xs)] hover:bg-[var(--surface-hover)] transition-colors text-left mx-1"
      style={{ width: 'calc(100% - 8px)' }}
      onClick={(e) => openProfile(member.userId, { x: e.clientX, y: e.clientY })}
      onContextMenu={(e) => {
        e.preventDefault()
        openContextMenu(
          { userId: member.userId, username: member.user.username, displayName: member.user.displayName },
          { x: e.clientX, y: e.clientY },
        )
      }}
    >
      <div className="shrink-0">
        <Avatar
          src={member.user.avatarUrl ?? undefined}
          fallback={displayName}
          size="sm"
          showPresence
          presenceColor={presenceColor}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[var(--text-primary)] truncate leading-tight">
          {displayName}
          {isMe && <span className="text-[var(--text-muted)] font-normal text-xs"> (you)</span>}
        </p>
        {showHandle && (
          <p className="text-[11px] text-[var(--text-muted)] truncate leading-tight">
            @{member.user.username}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── Channel Row ──────────────────────────────────────────────────────────────

function ChannelRow({
  channel,
  hubId,
  pathname,
  participants,
}: {
  channel: Channel
  hubId: string
  pathname: string
  participants: VoiceParticipant[]
}) {
  const mentionCount = useNotificationCenter((s) => s.mentionedChannels[channel.id] ?? 0)
  const isVoice = channel.type === 'voice' || channel.type === 'video' || channel.type === 'stage'
  const href = isVoice
    ? `/app/hub/${hubId}/room/${channel.id}`
    : `/app/hub/${hubId}/stream/${channel.id}`

  const { join, activeChannelId } = useVoiceSession()
  // Voice channels: active when connected to this channel; text channels: active by URL
  const isActive = isVoice
    ? activeChannelId === channel.id
    : pathname === href || pathname.startsWith(href)
  const router = useRouter()

  const handleVoiceClick = () => {
    if (activeChannelId === null) {
      // Not in any voice channel — join silently without navigating
      join(channel.id)
    } else if (activeChannelId === channel.id) {
      // Already in this channel — open the full view
      router.push(`/app/hub/${hubId}/room/${channel.id}`)
    } else {
      // In a different voice channel — switch to this one
      join(channel.id)
    }
  }

  return (
    <div className="mx-1 mb-0.5">
      {isVoice ? (
        <button
          onClick={handleVoiceClick}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-2 px-2 py-1.5 rounded-[var(--radius-xs)]',
            'text-sm transition-colors duration-[120ms]',
            'group',
            isActive
              ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
              : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]',
          )}
        >
          <span
            className={cn(
              'transition-colors',
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]',
            )}
          >
            {CHANNEL_ICONS[channel.type]}
          </span>
          <span className="truncate flex-1 text-left">{channel.name}</span>
          {channel.isNsfw && (
            <Lock className="h-3 w-3 text-[var(--text-muted)] shrink-0" aria-label="NSFW" />
          )}
        </button>
      ) : (
        <button
          onClick={() => { if (!isActive) router.push(href) }}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            'flex w-full items-center gap-2 px-2 py-1.5 rounded-[var(--radius-xs)]',
            'text-sm transition-colors duration-[120ms]',
            'group',
            isActive
              ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
              : mentionCount > 0
                ? 'text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
                : 'text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-secondary)]',
          )}
        >
          <span
            className={cn(
              'transition-colors',
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] group-hover:text-[var(--text-secondary)]',
            )}
          >
            {CHANNEL_ICONS[channel.type]}
          </span>
          <span className={cn('truncate flex-1 text-left', mentionCount > 0 && !isActive && 'font-semibold')}>
            {channel.name}
          </span>
          {channel.isNsfw && (
            <Lock className="h-3 w-3 text-[var(--text-muted)] shrink-0" aria-label="NSFW" />
          )}
          {mentionCount > 0 && !isActive && (
            <span className="shrink-0 h-4 w-4 rounded-full bg-[var(--functional-error)] text-white text-[9px] font-bold flex items-center justify-center leading-none">
              {mentionCount > 9 ? '9+' : mentionCount}
            </span>
          )}
        </button>
      )}

      {isVoice && participants.length > 0 && (
        <div className="ml-6 mt-0.5 flex flex-col gap-0.5">
          {participants.map((p) => (
            <div
              key={p.userId}
              className="flex items-center gap-1.5 px-2 py-0.5 rounded text-xs text-[var(--text-muted)]"
            >
              <div
                className={cn(
                  'rounded-full',
                  p.isSpeaking && 'ring-2 ring-[var(--functional-success)] ring-offset-1 ring-offset-[var(--surface-raised)]',
                )}
              >
                <Avatar
                  src={p.avatarUrl ?? undefined}
                  fallback={p.displayName ?? p.username}
                  size="xs"
                />
              </div>
              <span className={cn('truncate', p.isSpeaking && 'text-[var(--functional-success)]')}>
                {p.displayName ?? p.username}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function VoicePanel({ hubId }: { hubId: string }) {
  const { activeChannelId, disconnect, session } = useVoiceSession()
  const { channels } = useHubStore()
  const router = useRouter()

  if (!activeChannelId) { return null }

  const channel = channels.find((c) => c.id === activeChannelId)
  const participants = session.participants

  return (
    <div className="shrink-0 px-2 py-2 border-t border-[var(--border-subtle)] bg-[var(--surface-panel)]">
      <div className="rounded-[var(--radius-xs)] bg-[var(--surface-raised)] overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-1.5 px-2 py-1.5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[var(--functional-success)] animate-pulse shrink-0" />
              <span className="text-xs font-semibold text-[var(--functional-success)]">Voice Connected</span>
            </div>
            <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">{channel?.name ?? 'Voice Room'}</p>
          </div>
          <button
            onClick={() => router.push(`/app/hub/${hubId}/room/${activeChannelId}`)}
            className="h-6 w-6 flex items-center justify-center rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors shrink-0"
            aria-label="Expand voice room"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Participant mini-list */}
        {participants.length > 0 && (
          <div className="px-2 pb-1.5 flex flex-col gap-0.5">
            {participants.map((p) => (
              <div
                key={p.userId}
                className="flex items-center gap-1.5 px-1 py-0.5 rounded text-xs text-[var(--text-muted)]"
              >
                <div
                  className={cn(
                    'rounded-full',
                    p.isSpeaking && 'ring-2 ring-[var(--functional-success)] ring-offset-1 ring-offset-[var(--surface-raised)]',
                  )}
                >
                  <Avatar
                    src={p.avatarUrl ?? undefined}
                    fallback={p.displayName ?? p.username}
                    size="xs"
                  />
                </div>
                <span className={cn('truncate', p.isSpeaking && 'text-[var(--functional-success)]')}>
                  {p.displayName ?? p.username}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Controls row */}
        <div className="flex items-center gap-1 px-2 pb-1.5">
          <button
            onClick={() => session.toggleMic()}
            className={cn(
              'flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors',
              session.isMuted
                ? 'text-[var(--functional-error)] bg-[var(--functional-error)]/10 hover:bg-[var(--functional-error)]/20'
                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]',
            )}
            aria-label={session.isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {session.isMuted
              ? <MicOff className="h-3.5 w-3.5 shrink-0" />
              : <Mic className="h-3.5 w-3.5 shrink-0" />
            }
          </button>
          <button
            onClick={disconnect}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-[var(--text-muted)] hover:text-[var(--functional-error)] hover:bg-[var(--surface-hover)] transition-colors"
            aria-label="Leave voice channel"
          >
            <PhoneOff className="h-3.5 w-3.5 shrink-0" />
            <span>Leave</span>
          </button>
        </div>
      </div>
    </div>
  )
}
