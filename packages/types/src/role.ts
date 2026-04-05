export const Permissions = {
  // ── General ────────────────────────────────────────────────────────────────
  VIEW_CHANNEL:         1n << 0n,
  MANAGE_CHANNELS:      1n << 16n,
  MANAGE_ROLES:         1n << 17n,
  MANAGE_HUB:           1n << 21n,
  ADMINISTRATOR:        1n << 22n,
  CREATE_INVITES:       1n << 23n,
  MANAGE_WEBHOOKS:      1n << 26n,
  VIEW_AUDIT_LOG:       1n << 27n,

  // ── Membership ─────────────────────────────────────────────────────────────
  KICK_MEMBERS:         1n << 20n,
  BAN_MEMBERS:          1n << 19n,
  MODERATE_MEMBERS:     1n << 28n,
  MANAGE_MEMBERS:       1n << 18n,
  MANAGE_NICKNAMES:     1n << 25n,
  CHANGE_NICKNAME:      1n << 24n,
  MENTION_EVERYONE:     1n << 8n,

  // ── Text ───────────────────────────────────────────────────────────────────
  SEND_MESSAGES:        1n << 1n,
  SEND_DMS:             1n << 2n,
  EMBED_LINKS:          1n << 3n,
  ATTACH_FILES:         1n << 4n,
  READ_MESSAGE_HISTORY: 1n << 5n,
  ADD_REACTIONS:        1n << 6n,
  USE_SLASH_COMMANDS:   1n << 7n,
  MANAGE_MESSAGES:      1n << 15n,
  PIN_MESSAGES:         1n << 29n,

  // ── Voice ──────────────────────────────────────────────────────────────────
  CONNECT:              1n << 9n,
  SPEAK:                1n << 10n,
  STREAM:               1n << 11n,
  USE_VOICE_ACTIVITY:   1n << 30n,
  MUTE_MEMBERS:         1n << 12n,
  DEAFEN_MEMBERS:       1n << 13n,
  MOVE_MEMBERS:         1n << 14n,
} as const

export type PermissionKey = keyof typeof Permissions

export function hasPermission(permissions: bigint, flag: bigint): boolean {
  if ((permissions & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) { return true }
  return (permissions & flag) === flag
}

export function addPermission(permissions: bigint, flag: bigint): bigint {
  return permissions | flag
}

export function removePermission(permissions: bigint, flag: bigint): bigint {
  return permissions & ~flag
}

export interface Role {
  id: string
  hubId: string
  name: string
  color: string | null
  icon: string | null
  position: number
  isDefault: boolean
  hoist: boolean
  mentionable: boolean
  permissions: string   // bigint serialized as decimal string
  createdAt: string
}
