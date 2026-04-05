'use client'

import { useRef, useEffect } from 'react'
import { Mic, MicOff, Video, VideoOff, Monitor, MonitorOff, PhoneOff, Hand, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar } from '@nexora/ui/avatar'
import type { RoomParticipant } from '@/hooks/use-webrtc'
import { useVoiceSession } from '@/contexts/voice-session-context'
import { useAuthStore } from '@/store/auth'

interface VoiceRoomProps {
  channelId: string
  channelName: string
  onLeave: () => void
}

export function VoiceRoom({ channelId, channelName, onLeave }: VoiceRoomProps) {
  const { user } = useAuthStore()
  const { session } = useVoiceSession()
  const {
    localStream,
    screenStream,
    participants,
    isMuted,
    isCameraOn,
    isScreenSharing,
    isConnecting,
    error,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
  } = session

  if (isConnecting) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 text-[var(--accent-primary)] animate-spin" />
        <p className="text-sm text-[var(--text-muted)]">Connecting to voice room…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center gap-4 p-8 text-center">
        <p className="text-sm text-[var(--functional-error)]">{error}</p>
        <button
          onClick={onLeave}
          className="h-9 px-4 rounded-[var(--radius-sm)] border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] transition-colors"
        >
          Go back
        </button>
      </div>
    )
  }

  // Build a "self" participant to include in the grid
  const selfParticipant: RoomParticipant = {
    userId: user?.id ?? 'self',
    username: user?.username ?? 'You',
    displayName: user?.displayName ?? user?.username ?? 'You',
    avatarUrl: user?.avatarUrl ?? null,
    stream: isScreenSharing ? screenStream : localStream,
    isSpeaking: false,
    isMuted,
    hasVideo: isCameraOn || isScreenSharing,
    isScreenSharing,
  }

  const allParticipants = [selfParticipant, ...participants]
  const totalCount = allParticipants.length

  return (
    <div className="flex flex-col h-full bg-[var(--surface-base)]">
      {/* Room header */}
      <div className="shrink-0 flex items-center justify-between px-4 h-12 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full bg-[var(--functional-success)] animate-pulse"
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-[var(--text-primary)]">{channelName}</span>
          <span className="text-xs text-[var(--text-muted)]">
            {totalCount} participant{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Participant grid */}
      <div className="flex-1 overflow-hidden p-4">
        {isScreenSharing ? (
          // Screen share layout
          <div className="flex h-full gap-4">
            <div className="flex-1 rounded-[var(--radius-md)] overflow-hidden bg-[var(--surface-panel)] border border-[var(--border-subtle)]">
              <VideoTile stream={screenStream} muted label="Your screen" isScreenShare />
            </div>
            <div className="w-44 flex flex-col gap-2 overflow-y-auto shrink-0">
              {allParticipants.map((p) => (
                <ParticipantCard key={p.userId} participant={p} compact />
              ))}
            </div>
          </div>
        ) : (
          // Voice/video grid
          <div
            className={cn(
              'h-full grid gap-3 content-start',
              totalCount === 1 && 'grid-cols-1 place-content-center',
              totalCount === 2 && 'grid-cols-2',
              totalCount <= 4 && totalCount > 2 && 'grid-cols-2',
              totalCount > 4 && 'grid-cols-3',
            )}
          >
            {allParticipants.map((p) => (
              <ParticipantCard
                key={p.userId}
                participant={p}
                isSelf={p.userId === user?.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Controls */}
      <VoiceControls
        isMuted={isMuted}
        isCameraOn={isCameraOn}
        isScreenSharing={isScreenSharing}
        onToggleMic={toggleMic}
        onToggleCamera={toggleCamera}
        onToggleScreen={toggleScreenShare}
        onLeave={onLeave}
      />
    </div>
  )
}

// ── Video tile ─────────────────────────────────────────────────────────
function VideoTile({
  stream,
  muted = false,
  label,
  isScreenShare = false,
}: {
  stream: MediaStream | null
  muted?: boolean
  label?: string
  isScreenShare?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  if (!stream) { return null }

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={cn(
        'w-full h-full object-cover',
        isScreenShare && 'object-contain bg-black',
      )}
      aria-label={label}
    />
  )
}

// ── Participant card ───────────────────────────────────────────────────
function ParticipantCard({
  participant,
  compact = false,
  isSelf = false,
}: {
  participant: RoomParticipant
  compact?: boolean
  isSelf?: boolean
}) {
  const { isSpeaking, isMuted, hasVideo, stream, displayName, username, avatarUrl } = participant
  const displayLabel = displayName ?? username
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (videoRef.current && stream && hasVideo) {
      videoRef.current.srcObject = stream
    }
  }, [stream, hasVideo])

  // Audio-only: attach stream to a hidden <audio> element so the remote voice plays.
  // When hasVideo becomes true the <video> element (non-muted for remote) takes over.
  useEffect(() => {
    if (audioRef.current && stream && !hasVideo) {
      audioRef.current.srcObject = stream
    }
  }, [stream, hasVideo])

  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        'bg-[var(--surface-panel)] rounded-[var(--radius-md)] border transition-all duration-150',
        compact ? 'flex-row gap-2 px-2 py-1.5' : 'flex-col gap-2 p-4 aspect-video',
        isSpeaking
          ? 'border-[var(--functional-success)] shadow-[0_0_0_2px_rgba(56,211,159,0.35)]'
          : 'border-[var(--border-subtle)]',
      )}
      aria-label={`${displayLabel}${isSelf ? ' (you)' : ''}${isSpeaking ? ', speaking' : ''}${isMuted ? ', muted' : ''}`}
    >
      {/* Hidden audio element for audio-only remote participants */}
      {!isSelf && !hasVideo && (
        <audio ref={audioRef} autoPlay />
      )}

      {/* Video */}
      {hasVideo && stream && (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isSelf}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}

      {/* Avatar overlay (shown when no video) */}
      {!hasVideo && (
        <div className={cn('relative z-10', compact ? '' : 'flex flex-col items-center gap-2')}>
          <div className="relative">
            <Avatar
              src={avatarUrl ?? undefined}
              fallback={displayLabel}
              size={compact ? 'sm' : 'lg'}
            />
            {isMuted && (
              <span className="absolute -bottom-0.5 -right-0.5 h-4 w-4 flex items-center justify-center bg-[var(--functional-error)] rounded-full">
                <MicOff className="h-2.5 w-2.5 text-white" />
              </span>
            )}
          </div>
          {!compact && (
            <span className="text-xs font-medium text-[var(--text-primary)] truncate max-w-[120px]">
              {displayLabel}
              {isSelf && <span className="text-[var(--text-muted)]"> (you)</span>}
            </span>
          )}
        </div>
      )}

      {/* Name bar over video */}
      {hasVideo && (
        <div className="absolute bottom-0 inset-x-0 z-10 px-2 py-1 bg-gradient-to-t from-black/60 to-transparent flex items-center justify-between">
          <span className="text-xs font-medium text-white truncate">
            {displayLabel}
            {isSelf && <span className="opacity-70"> (you)</span>}
          </span>
          {isMuted && <MicOff className="h-3 w-3 text-[var(--functional-error)] shrink-0" />}
        </div>
      )}

      {/* Compact label */}
      {compact && (
        <span className="flex-1 text-xs font-medium text-[var(--text-primary)] truncate min-w-0">
          {displayLabel}
          {isSelf && <span className="text-[var(--text-muted)]"> (you)</span>}
        </span>
      )}

      {/* Speaking indicator */}
      {isSpeaking && !compact && (
        <div className="absolute top-2 right-2 z-10 flex items-center gap-0.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-0.5 rounded-full bg-[var(--functional-success)]"
              style={{
                height: `${6 + i * 3}px`,
                animationDelay: `${i * 0.1}s`,
              }}
              aria-hidden="true"
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Controls bar ───────────────────────────────────────────────────────
function VoiceControls({
  isMuted,
  isCameraOn,
  isScreenSharing,
  onToggleMic,
  onToggleCamera,
  onToggleScreen,
  onLeave,
}: {
  isMuted: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
  onToggleMic: () => void
  onToggleCamera: () => void
  onToggleScreen: () => Promise<void>
  onLeave: () => void
}) {
  return (
    <div className="shrink-0 flex items-center justify-center gap-3 px-4 py-4 border-t border-[var(--border-subtle)] bg-[var(--surface-raised)]">
      {/* Mic */}
      <ControlButton
        onClick={onToggleMic}
        active={!isMuted}
        danger={isMuted}
        aria-label={isMuted ? 'Unmute mic' : 'Mute mic'}
        aria-pressed={!isMuted}
      >
        {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </ControlButton>

      {/* Camera */}
      <ControlButton
        onClick={onToggleCamera}
        active={isCameraOn}
        danger={!isCameraOn}
        aria-label={isCameraOn ? 'Turn off camera' : 'Turn on camera'}
        aria-pressed={isCameraOn}
      >
        {isCameraOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </ControlButton>

      {/* Screen share */}
      <ControlButton
        onClick={onToggleScreen}
        active={isScreenSharing}
        highlight={isScreenSharing}
        aria-label={isScreenSharing ? 'Stop screen share' : 'Share screen'}
        aria-pressed={isScreenSharing}
      >
        {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
      </ControlButton>

      {/* Hand raise (stub — state management to be added) */}
      <ControlButton
        active={false}
        aria-label="Raise hand"
      >
        <Hand className="h-5 w-5" />
      </ControlButton>

      {/* Leave */}
      <button
        onClick={onLeave}
        aria-label="Leave room"
        className="h-11 w-11 flex items-center justify-center rounded-full bg-[var(--functional-error)] text-white hover:opacity-90 transition-opacity shadow-[0_0_12px_rgba(255,100,124,0.3)]"
      >
        <PhoneOff className="h-5 w-5" />
      </button>
    </div>
  )
}

interface ControlButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active: boolean
  danger?: boolean
  highlight?: boolean
}

function ControlButton({ active, danger, highlight, children, className, ...props }: ControlButtonProps) {
  return (
    <button
      className={cn(
        'h-11 w-11 flex items-center justify-center rounded-full transition-all',
        danger && !active
          ? 'bg-[var(--functional-error-bg)] text-[var(--functional-error)]'
          : highlight
            ? 'bg-[var(--accent-primary)] text-white shadow-[var(--shadow-glow-violet)]'
            : active
              ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
              : 'bg-[var(--surface-panel)] text-[var(--text-secondary)] hover:bg-[var(--surface-active)] hover:text-[var(--text-primary)]',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
