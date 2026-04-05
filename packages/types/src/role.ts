export const Permissions = {
  VIEW_CHANNEL:         1n << 0n,
  SEND_MESSAGES:        1n << 1n,
  SEND_DMS:             1n << 2n,
  EMBED_LINKS:          1n << 3n,
  ATTACH_FILES:         1n << 4n,
  READ_MESSAGE_HISTORY: 1n << 5n,
  ADD_REACTIONS:        1n << 6n,
  USE_SLASH_COMMANDS:   1n << 7n,
  MENTION_EVERYONE:     1n << 8n,
  CONNECT:              1n << 9n,
  SPEAK:                1n << 10n,
  STREAM:               1n << 11n,
  MUTE_MEMBERS:         1n << 12n,
  DEAFEN_MEMBERS:       1n << 13n,
  MOVE_MEMBERS:         1n << 14n,
  MANAGE_MESSAGES:      1n << 15n,
  MANAGE_CHANNELS:      1n << 16n,
  MANAGE_ROLES:         1n << 17n,
  MANAGE_MEMBERS:       1n << 18n,
  BAN_MEMBERS:          1n << 19n,
  KICK_MEMBERS:         1n << 20n,
  MANAGE_HUB:           1n << 21n,
  ADMINISTRATOR:        1n << 22n,
} as const

export type PermissionKey = keyof typeof Permissions

export function hasPermission(permissions: bigint, flag: bigint): boolean {
  if (permissions & Permissions.ADMINISTRATOR) { return true }
  return Boolean(permissions & flag)
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
  position: number
  isDefault: boolean
  permissions: string // stored as string, parse with BigInt()
  createdAt: string
}
