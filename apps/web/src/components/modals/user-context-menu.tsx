'use client'

import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useAuthStore } from '@/store/auth'
import { useContextMenu } from '@/store/context-menu'
import { useHubStore } from '@/store/hub'
import { openProfile } from '@/store/profile-modal'
import { setPendingMention } from '@/store/mention'
import { notify } from '@/store/notifications'
import type { ContextMenuAnchor } from '@/store/context-menu'

const MENU_W = 220
const MENU_H = 380
const GAP    = 8

interface SocialRelationship {
  note: string
  friendship: { status: string; isRequester: boolean } | null
  isIgnored: boolean
  isBlocked: boolean
}

function computeStyle(anchor: ContextMenuAnchor | null): React.CSSProperties {
  if (!anchor) {
    return { position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)' }
  }

  // Parent is fixed inset-0 (full viewport), so absolute coords == viewport coords
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800

  let left = anchor.x + GAP
  if (left + MENU_W > vw - GAP) {
    left = anchor.x - MENU_W - GAP
  }
  left = Math.max(GAP, left)

  let top = anchor.y
  if (top + MENU_H > vh - GAP) {
    top = vh - MENU_H - GAP
  }
  top = Math.max(GAP, top)

  return { position: 'absolute', top, left }
}

export function UserContextMenu() {
  const { target, anchor, channelId, close } = useContextMenu()

  useEffect(() => {
    if (!target) { return }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const onDown = (e: MouseEvent) => {
      const menu = document.getElementById('context-menu-card')
      if (menu && !menu.contains(e.target as Node)) close()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onDown)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onDown)
    }
  }, [target, close])

  if (!target) { return null }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] overflow-visible pointer-events-none">
      <MenuCard
        targetId={target.userId}
        username={target.username}
        displayName={target.displayName}
        anchor={anchor}
        channelId={channelId ?? null}
        onClose={close}
      />
    </div>
  )
}

// ─── Menu card ────────────────────────────────────────────────────────────────

function MenuCard({
  targetId,
  username,
  displayName,
  anchor,
  channelId,
  onClose,
}: {
  targetId: string
  username: string
  displayName: string | null
  anchor: ContextMenuAnchor | null
  channelId: string | null
  onClose: () => void
}) {
  const currentUser = useAuthStore((s) => s.user)
  const { hub, activeHubId } = useHubStore()
  const queryClient = useQueryClient()

  const isOwnProfile = currentUser?.id === targetId
  const isHubOwner = !isOwnProfile && hub?.ownerId === currentUser?.id

  const [showNoteEditor, setShowNoteEditor] = useState(false)
  const [noteValue, setNoteValue] = useState('')

  const { data: rel, isLoading } = useQuery<SocialRelationship>({
    queryKey: ['social-rel', targetId],
    queryFn: async () => {
      const res = await api.get<SocialRelationship>(`/social/${targetId}`)
      return res.data
    },
    staleTime: 30_000,
    enabled: !isOwnProfile,
  })

  // Keep note textarea in sync with fetched value
  useEffect(() => {
    if (rel?.note != null) {
      setNoteValue(rel.note)
    }
  }, [rel?.note])

  // ── Mutations ──────────────────────────────────────────────────────────
  const noteMutation = useMutation({
    mutationFn: (note: string) => api.put(`/social/${targetId}/note`, { note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['social-rel', targetId] })
      setShowNoteEditor(false)
      notify.success('Note saved')
    },
    onError: () => notify.error('Failed to save note'),
  })

  const friendMutation = useMutation({
    mutationFn: (method: 'POST' | 'DELETE') =>
      method === 'POST'
        ? api.post(`/social/${targetId}/friend`, {})
        : api.delete(`/social/${targetId}/friend`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-rel', targetId] }),
    onError: () => notify.error('Action failed'),
  })

  const ignoreMutation = useMutation({
    mutationFn: (method: 'POST' | 'DELETE') =>
      method === 'POST'
        ? api.post(`/social/${targetId}/ignore`, {})
        : api.delete(`/social/${targetId}/ignore`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-rel', targetId] }),
    onError: () => notify.error('Action failed'),
  })

  const blockMutation = useMutation({
    mutationFn: (method: 'POST' | 'DELETE') =>
      method === 'POST'
        ? api.post(`/social/${targetId}/block`, {})
        : api.delete(`/social/${targetId}/block`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['social-rel', targetId] }),
    onError: () => notify.error('Action failed'),
  })

  const timeoutMutation = useMutation({
    mutationFn: () =>
      api.post(`/hubs/${activeHubId}/timeouts/${targetId}`, { durationMinutes: 60 }),
    onSuccess: () => { notify.success(`${displayName ?? username} timed out for 60 minutes`); onClose() },
    onError: () => notify.error('Failed to timeout member'),
  })

  const kickMutation = useMutation({
    mutationFn: () => api.delete(`/hubs/${activeHubId}/members/${targetId}`),
    onSuccess: () => { notify.success(`${displayName ?? username} was kicked`); onClose() },
    onError: () => notify.error('Failed to kick member'),
  })

  const banMutation = useMutation({
    mutationFn: () => api.post(`/hubs/${activeHubId}/bans/${targetId}`, {}),
    onSuccess: () => { notify.success(`${displayName ?? username} was banned`); onClose() },
    onError: () => notify.error('Failed to ban member'),
  })

  // ── Friend button label ─────────────────────────────────────────────────
  function friendLabel(): string {
    if (!rel?.friendship) { return 'Add Friend' }
    const { status, isRequester } = rel.friendship
    if (status === 'accepted') { return 'Remove Friend' }
    if (status === 'pending' && isRequester) { return 'Pending...' }
    if (status === 'pending' && !isRequester) { return 'Accept Friend' }
    return 'Add Friend'
  }

  function handleFriendClick() {
    const f = rel?.friendship
    if (!f) {
      friendMutation.mutate('POST')
    } else if (f.status === 'accepted') {
      friendMutation.mutate('DELETE')
    } else if (f.status === 'pending' && f.isRequester) {
      // Cancel request
      friendMutation.mutate('DELETE')
    } else if (f.status === 'pending' && !f.isRequester) {
      // Accept
      friendMutation.mutate('POST')
    }
  }

  const label = displayName ?? username

  return (
    <div
      id="context-menu-card"
      className="w-[220px] bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] shadow-2xl py-1 pointer-events-auto"
      style={computeStyle(anchor)}
    >
      {/* View Profile */}
      <MenuItem
        onClick={() => {
          openProfile(targetId, anchor ?? undefined)
          onClose()
        }}
      >
        View Profile
      </MenuItem>

      {/* Mention — only if in a channel context */}
      {channelId && (
        <MenuItem
          onClick={() => {
            setPendingMention(username)
            onClose()
          }}
        >
          Mention
        </MenuItem>
      )}

      {/* Message — not for own profile */}
      {!isOwnProfile && (
        <MenuItem
          onClick={() => {
            notify.info('Coming soon', 'Direct messages are on the way!')
            onClose()
          }}
        >
          Message
        </MenuItem>
      )}

      <Divider />

      {/* Note */}
      <MenuItem
        onClick={() => setShowNoteEditor((v) => !v)}
      >
        {rel?.note ? 'Edit Note' : 'Add Note'}
      </MenuItem>
      <p className="px-3 text-[11px] text-[var(--text-muted)] -mt-1 mb-1 leading-tight">
        Only visible to you
      </p>

      {showNoteEditor && (
        <div className="px-3 pb-2" onClick={(e) => e.stopPropagation()}>
          <textarea
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            rows={3}
            placeholder="Add a note about this user..."
            className="w-full text-xs bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] px-2 py-1.5 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] resize-none focus:outline-none focus:border-[var(--accent-primary)]"
          />
          <div className="flex gap-1.5 mt-1.5">
            <button
              onClick={() => noteMutation.mutate(noteValue)}
              disabled={noteMutation.isPending}
              className="px-2.5 py-1 text-xs rounded-[var(--radius-xs)] bg-[var(--accent-primary)] text-white hover:bg-[var(--accent-primary-light)] transition-colors disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => { setShowNoteEditor(false); setNoteValue(rel?.note ?? '') }}
              className="px-2.5 py-1 text-xs rounded-[var(--radius-xs)] text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Social actions — not for own profile */}
      {!isOwnProfile && !isLoading && (
        <>
          <Divider />

          {/* Friend */}
          <MenuItem onClick={handleFriendClick} disabled={friendMutation.isPending}>
            {friendLabel()}
          </MenuItem>

          {/* Ignore */}
          <MenuItem
            onClick={() => {
              ignoreMutation.mutate(rel?.isIgnored ? 'DELETE' : 'POST')
            }}
            disabled={ignoreMutation.isPending}
          >
            {rel?.isIgnored ? 'Unignore' : 'Ignore'}
          </MenuItem>

          {/* Block */}
          <MenuItem
            onClick={() => {
              blockMutation.mutate(rel?.isBlocked ? 'DELETE' : 'POST')
            }}
            disabled={blockMutation.isPending}
            danger
          >
            {rel?.isBlocked ? 'Unblock' : 'Block'}
          </MenuItem>
        </>
      )}

      {/* Hub owner moderation actions */}
      {isHubOwner && activeHubId && !isOwnProfile && (
        <>
          <Divider />

          <MenuItem
            onClick={() => timeoutMutation.mutate()}
            disabled={timeoutMutation.isPending}
            danger
          >
            Timeout {label}
          </MenuItem>

          <MenuItem
            onClick={() => kickMutation.mutate()}
            disabled={kickMutation.isPending}
            danger
          >
            Kick {label}
          </MenuItem>

          <MenuItem
            onClick={() => banMutation.mutate()}
            disabled={banMutation.isPending}
            danger
          >
            Ban {label}
          </MenuItem>
        </>
      )}

      <Divider />

      {/* Copy User ID */}
      <MenuItem
        onClick={() => {
          navigator.clipboard.writeText(targetId).then(() => {
            notify.success('Copied', 'User ID copied to clipboard')
          })
          onClose()
        }}
      >
        Copy User ID
      </MenuItem>
    </div>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────

function MenuItem({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode
  onClick?: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={[
        'w-full text-left px-3 py-1.5 text-sm transition-colors',
        'hover:bg-[var(--surface-hover)] focus:outline-none focus:bg-[var(--surface-hover)]',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        danger
          ? 'text-[var(--functional-error)]'
          : 'text-[var(--text-primary)]',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="h-px bg-[var(--border-subtle)] my-1" />
}
