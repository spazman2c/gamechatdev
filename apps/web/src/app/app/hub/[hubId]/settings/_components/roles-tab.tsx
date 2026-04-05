'use client'

import { useState, useRef, useCallback } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Plus, Trash2, Shield, Search, GripVertical, AlertTriangle,
  ChevronDown, ChevronRight, Users, Check,
} from 'lucide-react'
import { Button } from '@nexora/ui/button'
import { api } from '@/lib/api'
import { notify } from '@/store/notifications'
import { cn } from '@/lib/utils'

// ── Types ──────────────────────────────────────────────────────────────────

interface Role {
  id: string
  name: string
  color: string | null
  icon: string | null
  position: number
  isDefault: boolean
  hoist: boolean
  mentionable: boolean
  permissions: string  // bigint as decimal string
  createdAt: string
}

interface RoleMember {
  id: string
  username: string
  displayName: string | null
  avatarUrl: string | null
  assignedAt: string
}

// ── Permission definitions ─────────────────────────────────────────────────

// All permission bit values as regular numbers (max is 1<<30 = 1073741824, within safe integer range)
const P = {
  ADMINISTRATOR:        1 << 22,
  VIEW_AUDIT_LOG:       1 << 27,
  MANAGE_HUB:           1 << 21,
  MANAGE_CHANNELS:      1 << 16,
  MANAGE_ROLES:         1 << 17,
  MANAGE_WEBHOOKS:      1 << 26,
  CREATE_INVITES:       1 << 23,
  KICK_MEMBERS:         1 << 20,
  BAN_MEMBERS:          1 << 19,
  MODERATE_MEMBERS:     1 << 28,
  MANAGE_MEMBERS:       1 << 18,
  MANAGE_NICKNAMES:     1 << 25,
  CHANGE_NICKNAME:      1 << 24,
  MENTION_EVERYONE:     1 << 8,
  VIEW_CHANNEL:         1 << 0,
  SEND_MESSAGES:        1 << 1,
  SEND_DMS:             1 << 2,
  EMBED_LINKS:          1 << 3,
  ATTACH_FILES:         1 << 4,
  READ_MESSAGE_HISTORY: 1 << 5,
  ADD_REACTIONS:        1 << 6,
  USE_SLASH_COMMANDS:   1 << 7,
  MANAGE_MESSAGES:      1 << 15,
  PIN_MESSAGES:         1 << 29,
  CONNECT:              1 << 9,
  SPEAK:                1 << 10,
  STREAM:               1 << 11,
  USE_VOICE_ACTIVITY:   1 << 30,
  MUTE_MEMBERS:         1 << 12,
  DEAFEN_MEMBERS:       1 << 13,
  MOVE_MEMBERS:         1 << 14,
}

const PERM_GROUPS = [
  {
    label: 'General Server',
    perms: [
      { key: P.ADMINISTRATOR,    name: 'Administrator',  description: 'Members with this permission have every permission and also bypass channel-specific overrides. This is a dangerous permission.', isAdmin: true },
      { key: P.VIEW_AUDIT_LOG,   name: 'View Audit Log', description: 'Members can view changes made to the server.' },
      { key: P.MANAGE_HUB,       name: 'Manage Server',  description: 'Members can change the server name, icon, and other settings.' },
      { key: P.MANAGE_CHANNELS,  name: 'Manage Channels', description: 'Members can create, edit, and delete channels.' },
      { key: P.MANAGE_ROLES,     name: 'Manage Roles',   description: 'Members can create, edit, and delete roles below their own.' },
      { key: P.MANAGE_WEBHOOKS,  name: 'Manage Webhooks', description: 'Members can create, edit, and delete webhooks.' },
      { key: P.CREATE_INVITES,   name: 'Create Invites', description: 'Members can create invite links for this server.' },
    ],
  },
  {
    label: 'Membership',
    perms: [
      { key: P.KICK_MEMBERS,     name: 'Kick Members',        description: 'Members can remove other members from the server.' },
      { key: P.BAN_MEMBERS,      name: 'Ban Members',         description: 'Members can permanently ban other members from the server.' },
      { key: P.MODERATE_MEMBERS, name: 'Moderate Members',    description: 'Members can timeout other members.' },
      { key: P.MANAGE_MEMBERS,   name: 'Manage Members',      description: 'Members can edit nicknames and roles of other members.' },
      { key: P.MANAGE_NICKNAMES, name: 'Manage Nicknames',    description: 'Members can change the nicknames of other members.' },
      { key: P.CHANGE_NICKNAME,  name: 'Change Own Nickname', description: 'Members can change their own nickname.' },
      { key: P.MENTION_EVERYONE, name: 'Mention @everyone',   description: 'Members can use @everyone and @here mentions.' },
    ],
  },
  {
    label: 'Text',
    perms: [
      { key: P.VIEW_CHANNEL,         name: 'View Channels',        description: 'Members can view text channels and read messages.' },
      { key: P.SEND_MESSAGES,        name: 'Send Messages',        description: 'Members can send messages in text channels.' },
      { key: P.READ_MESSAGE_HISTORY, name: 'Read Message History', description: 'Members can read messages sent before they joined the channel.' },
      { key: P.MANAGE_MESSAGES,      name: 'Manage Messages',      description: 'Members can delete and pin messages from other members.' },
      { key: P.PIN_MESSAGES,         name: 'Pin Messages',         description: 'Members can pin messages in channels.' },
      { key: P.EMBED_LINKS,          name: 'Embed Links',          description: 'Links sent will be embedded as rich content.' },
      { key: P.ATTACH_FILES,         name: 'Attach Files',         description: 'Members can attach images and files.' },
      { key: P.ADD_REACTIONS,        name: 'Add Reactions',        description: 'Members can add emoji reactions to messages.' },
      { key: P.USE_SLASH_COMMANDS,   name: 'Use Slash Commands',   description: 'Members can use slash commands from bots.' },
      { key: P.SEND_DMS,             name: 'Send DMs',             description: 'Members can send direct messages to other members in this server.' },
    ],
  },
  {
    label: 'Voice',
    perms: [
      { key: P.CONNECT,           name: 'Connect',            description: 'Members can join voice and video channels.' },
      { key: P.SPEAK,             name: 'Speak',              description: 'Members can speak in voice channels.' },
      { key: P.STREAM,            name: 'Stream / Go Live',   description: 'Members can share their screen or go live.' },
      { key: P.USE_VOICE_ACTIVITY,name: 'Use Voice Activity', description: 'Members can use voice activity detection instead of push-to-talk.' },
      { key: P.MUTE_MEMBERS,      name: 'Mute Members',       description: 'Members can mute other members in voice channels.' },
      { key: P.DEAFEN_MEMBERS,    name: 'Deafen Members',     description: 'Members can deafen other members in voice channels.' },
      { key: P.MOVE_MEMBERS,      name: 'Move Members',       description: 'Members can move other members between voice channels.' },
    ],
  },
]

const PRESET_COLORS = [
  '#1abc9c', '#2ecc71', '#3498db', '#9b59b6', '#e91e63',
  '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6', '#607d8b',
  '#11806a', '#1f8b4c', '#206694', '#71368a', '#ad1457',
  '#c27c0e', '#a84300', '#992d22', '#979c9f', '#546e7a',
]

// ── Permission Toggle ──────────────────────────────────────────────────────

function PermToggle({
  checked,
  onChange,
  label,
  description,
  isAdmin,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  description: string
  isAdmin?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-subtle)] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
          {isAdmin && <AlertTriangle className="h-3.5 w-3.5 text-[var(--functional-warning)] shrink-0" />}
        </div>
        <p className="text-xs text-[var(--text-muted)] leading-relaxed">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'mt-0.5 relative shrink-0 h-5 w-9 rounded-full transition-colors',
          checked ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-active)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-4' : 'translate-x-0.5',
          )}
        />
      </button>
    </div>
  )
}

// ── Role Editor Panel ──────────────────────────────────────────────────────

type EditorTab = 'display' | 'permissions' | 'members'

function RoleEditor({
  role,
  hubId,
  onDeleted,
}: {
  role: Role
  hubId: string
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const [tab, setTab] = useState<EditorTab>('display')

  // Display state
  const [name, setName] = useState(role.name)
  const [color, setColor] = useState(role.color ?? '')
  const [icon, setIcon] = useState(role.icon ?? '')
  const [hoist, setHoist] = useState(role.hoist)
  const [mentionable, setMentionable] = useState(role.mentionable)

  // Permissions state — stored as number (all flags ≤ 1<<30, within safe integer range)
  const [perms, setPerms] = useState<number>(Number(role.permissions))

  // Members state
  const [memberSearch, setMemberSearch] = useState('')

  const saveMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) =>
      api.patch(`/hubs/${hubId}/roles/${role.id}`, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', hubId] })
      notify.success('Role saved')
    },
    onError: () => notify.error('Failed to save role'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/hubs/${hubId}/roles/${role.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roles', hubId] })
      notify.success('Role deleted')
      onDeleted()
    },
    onError: () => notify.error('Failed to delete role'),
  })

  const { data: membersData } = useQuery({
    queryKey: ['role-members', hubId, role.id],
    queryFn: () =>
      api.get<{ members: RoleMember[] }>(`/hubs/${hubId}/roles/${role.id}/members`)
        .then((r) => r.data.members),
    enabled: tab === 'members',
  })

  function hasFlag(flag: number) {
    if ((perms & P.ADMINISTRATOR) === P.ADMINISTRATOR && flag !== P.ADMINISTRATOR) { return true }
    return (perms & flag) === flag
  }

  function toggleFlag(flag: number) {
    setPerms((prev) => {
      if ((prev & flag) === flag) { return prev & ~flag }
      return prev | flag
    })
  }

  function saveDisplay() {
    saveMutation.mutate({
      name,
      color: color || null,
      icon: icon || null,
      hoist,
      mentionable,
    })
  }

  function savePermissions() {
    saveMutation.mutate({ permissions: String(perms) })
  }

  const filteredMembers = (membersData ?? []).filter((m) => {
    const q = memberSearch.toLowerCase()
    return (m.displayName ?? m.username).toLowerCase().includes(q) || m.username.toLowerCase().includes(q)
  })

  return (
    <div className="flex flex-col h-full">
      {/* Role header */}
      <div className="px-6 pt-6 pb-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3 mb-1">
          <span
            className="h-5 w-5 rounded-full shrink-0 border border-white/20"
            style={{ backgroundColor: role.color ?? '#99aab5' }}
          />
          <h2 className="font-brand text-lg font-bold text-[var(--text-primary)] truncate">
            {role.name}
          </h2>
          {role.isDefault && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--surface-active)] text-[var(--text-muted)]">
              Default
            </span>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mt-4">
          {(['display', 'permissions', 'members'] as EditorTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors',
                tab === t
                  ? 'border-[var(--accent-primary)] text-[var(--text-primary)]'
                  : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {tab === 'display' && (
          <div className="flex flex-col gap-6">
            {/* Role Name */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Role Name
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={role.isDefault}
                className="w-full px-3 py-2 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] disabled:opacity-50"
              />
            </div>

            {/* Role Color */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Role Color
              </label>
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="h-10 w-10 rounded-[var(--radius-sm)] border-2 border-[var(--border-default)] shrink-0"
                  style={{ backgroundColor: color || '#99aab5' }}
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#99aab5"
                  className="flex-1 px-3 py-2 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)] font-mono"
                />
                <input
                  type="color"
                  value={color || '#99aab5'}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded border border-[var(--border-default)] bg-transparent shrink-0 p-0.5"
                />
              </div>
              <div className="grid grid-cols-10 gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-6 w-6 rounded-sm border-2 transition-transform hover:scale-110',
                      color === c ? 'border-white' : 'border-transparent',
                    )}
                    style={{ backgroundColor: c }}
                    title={c}
                  />
                ))}
              </div>
            </div>

            {/* Role Icon (emoji) */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">
                Role Icon <span className="font-normal normal-case text-[var(--text-muted)]">(emoji or short text)</span>
              </label>
              <input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="e.g. ⭐ or 🎮"
                maxLength={64}
                className="w-full px-3 py-2 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>

            {/* Display toggles */}
            <div className="flex flex-col gap-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                Display Options
              </label>
              <div className="flex items-start justify-between gap-4 py-3 border-b border-[var(--border-subtle)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5">Display role separately</p>
                  <p className="text-xs text-[var(--text-muted)]">Members with this role will appear in their own group in the member list.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={hoist}
                  onClick={() => setHoist(!hoist)}
                  className={cn(
                    'mt-0.5 relative shrink-0 h-5 w-9 rounded-full transition-colors',
                    hoist ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-active)]',
                  )}
                >
                  <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', hoist ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </div>
              <div className="flex items-start justify-between gap-4 py-3">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)] mb-0.5">Allow anyone to @mention this role</p>
                  <p className="text-xs text-[var(--text-muted)]">Members can use @rolename to notify all members with this role.</p>
                </div>
                <button
                  role="switch"
                  aria-checked={mentionable}
                  onClick={() => setMentionable(!mentionable)}
                  className={cn(
                    'mt-0.5 relative shrink-0 h-5 w-9 rounded-full transition-colors',
                    mentionable ? 'bg-[var(--accent-primary)]' : 'bg-[var(--surface-active)]',
                  )}
                >
                  <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform', mentionable ? 'translate-x-4' : 'translate-x-0.5')} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[var(--border-subtle)]">
              {!role.isDefault && (
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => deleteMutation.mutate()}
                  loading={deleteMutation.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete Role
                </Button>
              )}
              <Button
                size="sm"
                onClick={saveDisplay}
                loading={saveMutation.isPending}
                className="ml-auto"
              >
                Save Changes
              </Button>
            </div>
          </div>
        )}

        {tab === 'permissions' && (
          <div className="flex flex-col gap-6">
            {(perms & P.ADMINISTRATOR) === P.ADMINISTRATOR && (
              <div className="flex items-start gap-2 p-3 rounded-[var(--radius-sm)] bg-[var(--functional-warning-bg)] border border-[var(--functional-warning)] text-[var(--functional-warning)]">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">
                  <strong>Administrator</strong> is enabled — members with this role bypass all channel overrides and have every permission.
                </p>
              </div>
            )}

            {PERM_GROUPS.map((group) => (
              <div key={group.label}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)] mb-2">{group.label}</h3>
                <div className="bg-[var(--surface-panel)] border border-[var(--border-subtle)] rounded-[var(--radius-md)] px-4">
                  {group.perms.map((perm) => (
                    <PermToggle
                      key={String(perm.key)}
                      label={perm.name}
                      description={perm.description}
                      checked={hasFlag(perm.key)}
                      onChange={() => toggleFlag(perm.key)}
                      isAdmin={'isAdmin' in perm && perm.isAdmin}
                    />
                  ))}
                </div>
              </div>
            ))}

            <div className="flex justify-end pt-2 border-t border-[var(--border-subtle)]">
              <Button size="sm" onClick={savePermissions} loading={saveMutation.isPending}>
                Save Permissions
              </Button>
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="flex flex-col gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Search members..."
                className="w-full pl-9 pr-3 py-2 bg-[var(--surface-panel)] border border-[var(--border-default)] rounded-[var(--radius-sm)] text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-primary)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              {filteredMembers.length === 0 && (
                <div className="text-center py-8 text-sm text-[var(--text-muted)]">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  {membersData?.length === 0 ? 'No members have this role yet.' : 'No members match your search.'}
                </div>
              )}
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-[var(--radius-sm)] hover:bg-[var(--surface-hover)] transition-colors"
                >
                  {member.avatarUrl ? (
                    <img
                      src={member.avatarUrl}
                      alt={member.username}
                      className="h-8 w-8 rounded-full shrink-0 object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full shrink-0 bg-[var(--surface-active)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
                      {(member.displayName ?? member.username)[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                      {member.displayName ?? member.username}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] truncate">@{member.username}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Role Row (draggable) ───────────────────────────────────────────────────

function RoleRow({
  role,
  isSelected,
  onSelect,
  onDragStart,
  onDragOver,
  onDrop,
  isDragOver,
}: {
  role: Role
  isSelected: boolean
  onSelect: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  isDragOver: boolean
}) {
  return (
    <div
      draggable={!role.isDefault}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onClick={onSelect}
      className={cn(
        'flex items-center gap-2 px-3 py-2.5 rounded-[var(--radius-sm)] cursor-pointer transition-colors group',
        isSelected
          ? 'bg-[var(--surface-active)] text-[var(--text-primary)]'
          : 'hover:bg-[var(--surface-hover)] text-[var(--text-secondary)]',
        isDragOver && 'border-t-2 border-[var(--accent-primary)]',
      )}
    >
      {!role.isDefault ? (
        <GripVertical className="h-4 w-4 shrink-0 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing" />
      ) : (
        <span className="h-4 w-4 shrink-0" />
      )}
      <span
        className="h-3.5 w-3.5 rounded-full shrink-0 border border-white/10"
        style={{ backgroundColor: role.color ?? '#99aab5' }}
      />
      <span className="flex-1 truncate text-sm font-medium">
        {role.name}
      </span>
      {isSelected && <Check className="h-3.5 w-3.5 shrink-0 text-[var(--accent-primary)]" />}
    </div>
  )
}

// ── Main RolesTab ──────────────────────────────────────────────────────────

export function RolesTab({ hubId }: { hubId: string }) {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const dragId = useRef<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['roles', hubId],
    queryFn: () => api.get<{ roles: Role[] }>(`/hubs/${hubId}/roles`).then((r) => r.data.roles),
  })

  const createMutation = useMutation({
    mutationFn: () =>
      api.post<Role>(`/hubs/${hubId}/roles`, { name: 'New Role', color: '#99aab5' }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['roles', hubId] })
      setSelectedId(res.data.id)
    },
    onError: () => notify.error('Failed to create role'),
  })

  const reorderMutation = useMutation({
    mutationFn: (order: { id: string; position: number }[]) =>
      api.patch(`/hubs/${hubId}/roles/reorder`, { order }),
    onError: () => {
      notify.error('Failed to reorder roles')
      queryClient.invalidateQueries({ queryKey: ['roles', hubId] })
    },
  })

  const roles = data ?? []
  // Sort descending by position for display (highest at top)
  const sortedRoles = [...roles].sort((a, b) => b.position - a.position)
  // @everyone always pinned at bottom
  const nonDefault = sortedRoles.filter((r) => !r.isDefault)
  const everyoneRole = sortedRoles.find((r) => r.isDefault)

  const selectedRole = roles.find((r) => r.id === selectedId) ?? null

  const handleDragStart = useCallback((id: string) => {
    dragId.current = id
  }, [])

  const handleDrop = useCallback(
    (targetId: string) => {
      const sourceId = dragId.current
      if (!sourceId || sourceId === targetId) { return }

      const source = roles.find((r) => r.id === sourceId)
      const target = roles.find((r) => r.id === targetId)
      if (!source || !target || target.isDefault) { return }

      // Swap positions
      const order = roles
        .filter((r) => !r.isDefault)
        .map((r) => {
          if (r.id === sourceId) { return { id: r.id, position: target.position } }
          if (r.id === targetId) { return { id: r.id, position: source.position } }
          return { id: r.id, position: r.position }
        })

      // Optimistically update local cache
      queryClient.setQueryData<{ roles: Role[] }>(['roles', hubId], (old) => {
        if (!old) { return old }
        return {
          roles: old.roles.map((r) => {
            const o = order.find((x) => x.id === r.id)
            return o ? { ...r, position: o.position } : r
          }),
        }
      })

      reorderMutation.mutate(order)
      setDragOverId(null)
      dragId.current = null
    },
    [roles, hubId, queryClient, reorderMutation],
  )

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between mb-1 px-0">
        <h2 className="font-brand text-xl font-bold text-[var(--text-primary)]">Roles</h2>
        <Button size="sm" onClick={() => createMutation.mutate()} loading={createMutation.isPending}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Role
        </Button>
      </div>
      <p className="text-sm text-[var(--text-muted)] mb-4">
        Roles are shown from highest to lowest. Members inherit permissions from all their roles combined.
      </p>

      <div className="flex gap-0 flex-1 min-h-0 rounded-[var(--radius-lg)] border border-[var(--border-subtle)] overflow-hidden">
        {/* Left: role list */}
        <div className="w-56 shrink-0 flex flex-col bg-[var(--surface-raised)] border-r border-[var(--border-subtle)]">
          <div className="flex-1 overflow-y-auto p-2">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-9 rounded-[var(--radius-sm)] bg-[var(--surface-panel)] animate-pulse mb-1" />
              ))
            ) : (
              <>
                {nonDefault.map((role) => (
                  <RoleRow
                    key={role.id}
                    role={role}
                    isSelected={selectedId === role.id}
                    onSelect={() => setSelectedId(role.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move'
                      handleDragStart(role.id)
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                      setDragOverId(role.id)
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      handleDrop(role.id)
                    }}
                    isDragOver={dragOverId === role.id}
                  />
                ))}
                {everyoneRole && (
                  <>
                    <div className="h-px bg-[var(--border-subtle)] my-1.5 mx-2" />
                    <RoleRow
                      role={everyoneRole}
                      isSelected={selectedId === everyoneRole.id}
                      onSelect={() => setSelectedId(everyoneRole.id)}
                      onDragStart={() => {}}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => e.preventDefault()}
                      isDragOver={false}
                    />
                  </>
                )}
                {roles.length === 0 && (
                  <div className="text-center py-6">
                    <Shield className="h-6 w-6 text-[var(--text-muted)] opacity-30 mx-auto mb-1.5" />
                    <p className="text-xs text-[var(--text-muted)]">No roles yet</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: editor panel */}
        <div className="flex-1 min-w-0 bg-[var(--surface-base)]">
          {selectedRole ? (
            <RoleEditor
              key={selectedRole.id}
              role={selectedRole}
              hubId={hubId}
              onDeleted={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <Shield className="h-12 w-12 text-[var(--text-muted)] opacity-20 mb-3" />
              <p className="text-sm font-medium text-[var(--text-muted)]">Select a role to edit it</p>
              <p className="text-xs text-[var(--text-muted)] mt-1 opacity-70">
                Or create a new role using the button above.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
