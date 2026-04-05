import { db, schema } from '../db/index.js'
import { eq, and } from 'drizzle-orm'
import { Permissions } from '@nexora/types'

/**
 * Returns the effective permission bitfield for a user in a hub.
 * Combines @everyone role + all explicitly assigned roles.
 * Hub owner always gets ADMINISTRATOR.
 */
export async function getUserHubPermissions(userId: string, hubId: string): Promise<bigint> {
  const hub = await db.query.hubs.findFirst({
    where: eq(schema.hubs.id, hubId),
    columns: { ownerId: true },
  })
  if (!hub) { return 0n }
  if (hub.ownerId === userId) { return Permissions.ADMINISTRATOR }

  const [everyoneRole, memberRoles] = await Promise.all([
    db.query.roles.findFirst({
      where: and(eq(schema.roles.hubId, hubId), eq(schema.roles.isDefault, true)),
      columns: { permissions: true },
    }),
    db.query.memberRoles.findMany({
      where: and(eq(schema.memberRoles.hubId, hubId), eq(schema.memberRoles.userId, userId)),
      with: { role: { columns: { permissions: true } } },
    }),
  ])

  let combined = BigInt(everyoneRole?.permissions ?? 0)
  for (const mr of memberRoles) {
    combined |= BigInt(mr.role.permissions)
  }
  return combined
}

/**
 * Returns the highest role position this user holds in the hub.
 * Hub owner returns Infinity so they can always manage any role.
 */
export async function getUserHighestRolePosition(userId: string, hubId: string): Promise<number> {
  const hub = await db.query.hubs.findFirst({
    where: eq(schema.hubs.id, hubId),
    columns: { ownerId: true },
  })
  if (!hub) { return -1 }
  if (hub.ownerId === userId) { return Infinity }

  const memberRoles = await db.query.memberRoles.findMany({
    where: and(eq(schema.memberRoles.hubId, hubId), eq(schema.memberRoles.userId, userId)),
    with: { role: { columns: { position: true } } },
  })

  if (memberRoles.length === 0) { return 0 }
  return Math.max(...memberRoles.map((mr) => mr.role.position))
}

/** True if user is the hub owner OR has the given permission flag. */
export async function canDo(userId: string, hubId: string, flag: bigint): Promise<boolean> {
  const perms = await getUserHubPermissions(userId, hubId)
  if ((perms & Permissions.ADMINISTRATOR) === Permissions.ADMINISTRATOR) { return true }
  return (perms & flag) === flag
}
