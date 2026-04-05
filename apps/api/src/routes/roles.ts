import type { FastifyInstance } from 'fastify'
import { eq, and, inArray } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { getIO } from '../lib/socket.js'
import {
  canDo,
  getUserHighestRolePosition,
  getUserHubPermissions,
} from '../lib/permissions.js'
import { Permissions } from '@nexora/types'

// ── Helpers ────────────────────────────────────────────────────────────────

function serializeRole(role: {
  id: string
  hubId: string
  name: string
  color: string | null
  icon: string | null
  position: number
  isDefault: boolean
  hoist: boolean
  mentionable: boolean
  permissions: number
  createdAt: Date
}) {
  return {
    ...role,
    permissions: role.permissions.toString(),
    createdAt: role.createdAt.toISOString(),
  }
}

async function broadcastRolesUpdate(hubId: string) {
  const io = getIO()
  if (!io) { return }
  const roles = await db.query.roles.findMany({
    where: eq(schema.roles.hubId, hubId),
    orderBy: (r, { asc }) => asc(r.position),
  })
  io.to(`hub:${hubId}`).emit('hub:roles_updated', { roles: roles.map(serializeRole) })
}

/**
 * Asserts the requester can manage roles at all.
 * Returns the requester's highest role position for further checks.
 */
async function assertCanManageRoles(userId: string, hubId: string): Promise<number> {
  const allowed = await canDo(userId, hubId, Permissions.MANAGE_ROLES)
  if (!allowed) { throw Errors.FORBIDDEN() }
  return getUserHighestRolePosition(userId, hubId)
}

/**
 * Asserts the requester can manage a specific role (their position must be
 * strictly higher than the target role's position, unless they're the owner).
 */
async function assertCanManageRole(
  userId: string,
  hubId: string,
  targetRolePosition: number,
): Promise<void> {
  const myPosition = await assertCanManageRoles(userId, hubId)
  if (myPosition !== Infinity && myPosition <= targetRolePosition) {
    throw Errors.FORBIDDEN()
  }
}

// ── Schemas ────────────────────────────────────────────────────────────────

const CreateRoleSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  icon: z.string().max(64).optional().nullable(),
  permissions: z.string().regex(/^\d+$/).optional().default('0'),
  hoist: z.boolean().optional().default(false),
  mentionable: z.boolean().optional().default(false),
})

const UpdateRoleSchema = z.object({
  name: z.string().min(1).max(64).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  icon: z.string().max(64).optional().nullable(),
  permissions: z.string().regex(/^\d+$/).optional(),
  hoist: z.boolean().optional(),
  mentionable: z.boolean().optional(),
})

const ReorderSchema = z.object({
  // Array of { id, position } pairs
  order: z.array(z.object({ id: z.string().uuid(), position: z.number().int().min(0) })).min(1),
})

// ── Routes ─────────────────────────────────────────────────────────────────

export async function roleRoutes(app: FastifyInstance) {
  // GET /api/hubs/:hubId/roles
  app.get('/:hubId/roles', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }

    // Must be a hub member
    const member = await db.query.hubMembers.findFirst({
      where: and(eq(schema.hubMembers.hubId, hubId), eq(schema.hubMembers.userId, req.userId)),
    })
    if (!member) { throw Errors.NOT_HUB_MEMBER() }

    const roles = await db.query.roles.findMany({
      where: eq(schema.roles.hubId, hubId),
      orderBy: (r, { asc }) => asc(r.position),
    })
    return { roles: roles.map(serializeRole) }
  })

  // POST /api/hubs/:hubId/roles
  app.post('/:hubId/roles', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId } = req.params as { hubId: string }
    const body = CreateRoleSchema.parse(req.body)

    await assertCanManageRoles(req.userId, hubId)

    // New roles go to position 1 (above @everyone which is always 0)
    // Find the current max and put it just below
    const existing = await db.query.roles.findMany({
      where: eq(schema.roles.hubId, hubId),
      columns: { position: true },
      orderBy: (r, { desc }) => desc(r.position),
    })
    const maxPos = existing[0]?.position ?? 0
    const position = maxPos + 1

    const [role] = await db
      .insert(schema.roles)
      .values({
        hubId,
        name: body.name,
        color: body.color ?? null,
        icon: body.icon ?? null,
        permissions: Number(body.permissions),
        hoist: body.hoist,
        mentionable: body.mentionable,
        position,
      })
      .returning()

    await broadcastRolesUpdate(hubId)
    return reply.code(201).send(serializeRole(role!))
  })

  // PATCH /api/hubs/:hubId/roles/reorder — MUST be before /:roleId
  app.patch('/:hubId/roles/reorder', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId } = req.params as { hubId: string }
    const { order } = ReorderSchema.parse(req.body)

    const myPosition = await assertCanManageRoles(req.userId, hubId)

    // Verify all roles belong to this hub and requester outranks them all
    const roleIds = order.map((o) => o.id)
    const roles = await db.query.roles.findMany({
      where: and(eq(schema.roles.hubId, hubId), inArray(schema.roles.id, roleIds)),
      columns: { id: true, position: true, isDefault: true },
    })

    if (roles.length !== roleIds.length) { throw Errors.NOT_FOUND('One or more roles') }

    for (const role of roles) {
      if (role.isDefault) { throw Errors.FORBIDDEN() } // @everyone position is fixed
      if (myPosition !== Infinity && myPosition <= role.position) { throw Errors.FORBIDDEN() }
    }

    // Apply the reorder in a transaction
    await db.transaction(async (tx) => {
      for (const { id, position } of order) {
        await tx
          .update(schema.roles)
          .set({ position })
          .where(and(eq(schema.roles.id, id), eq(schema.roles.hubId, hubId)))
      }
    })

    await broadcastRolesUpdate(hubId)
    return reply.code(204).send()
  })

  // PATCH /api/hubs/:hubId/roles/:roleId
  app.patch('/:hubId/roles/:roleId', { preHandler: requireAuth }, async (req) => {
    const { hubId, roleId } = req.params as { hubId: string; roleId: string }
    const body = UpdateRoleSchema.parse(req.body)

    const role = await db.query.roles.findFirst({
      where: and(eq(schema.roles.id, roleId), eq(schema.roles.hubId, hubId)),
      columns: { position: true },
    })
    if (!role) { throw Errors.NOT_FOUND('Role') }

    await assertCanManageRole(req.userId, hubId, role.position)

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) { updateData.name = body.name }
    if (body.color !== undefined) { updateData.color = body.color }
    if (body.icon !== undefined) { updateData.icon = body.icon }
    if (body.hoist !== undefined) { updateData.hoist = body.hoist }
    if (body.mentionable !== undefined) { updateData.mentionable = body.mentionable }
    if (body.permissions !== undefined) {
      // Prevent non-owners from granting ADMINISTRATOR or MANAGE_ROLES they don't have
      const requesterPerms = await getUserHubPermissions(req.userId, hubId)
      const isOwner = requesterPerms === Permissions.ADMINISTRATOR && (await db.query.hubs.findFirst({
        where: eq(schema.hubs.id, hubId),
        columns: { ownerId: true },
      }))?.ownerId === req.userId

      if (!isOwner) {
        const newPerms = BigInt(body.permissions)
        // Can only grant permissions they already have
        if ((newPerms & ~requesterPerms) !== 0n) { throw Errors.FORBIDDEN() }
      }
      updateData.permissions = Number(body.permissions)
    }

    const [updated] = await db
      .update(schema.roles)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updateData as any)
      .where(and(eq(schema.roles.id, roleId), eq(schema.roles.hubId, hubId)))
      .returning()

    if (!updated) { throw Errors.NOT_FOUND('Role') }

    await broadcastRolesUpdate(hubId)
    return serializeRole(updated)
  })

  // DELETE /api/hubs/:hubId/roles/:roleId
  app.delete('/:hubId/roles/:roleId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, roleId } = req.params as { hubId: string; roleId: string }

    const role = await db.query.roles.findFirst({
      where: and(eq(schema.roles.id, roleId), eq(schema.roles.hubId, hubId)),
      columns: { position: true, isDefault: true },
    })
    if (!role) { throw Errors.NOT_FOUND('Role') }
    if (role.isDefault) { throw Errors.FORBIDDEN() } // Can't delete @everyone

    await assertCanManageRole(req.userId, hubId, role.position)

    await db.delete(schema.roles).where(eq(schema.roles.id, roleId))

    await broadcastRolesUpdate(hubId)
    return reply.code(204).send()
  })

  // GET /api/hubs/:hubId/roles/:roleId/members
  app.get('/:hubId/roles/:roleId/members', { preHandler: requireAuth }, async (req) => {
    const { hubId, roleId } = req.params as { hubId: string; roleId: string }

    const member = await db.query.hubMembers.findFirst({
      where: and(eq(schema.hubMembers.hubId, hubId), eq(schema.hubMembers.userId, req.userId)),
    })
    if (!member) { throw Errors.NOT_HUB_MEMBER() }

    const role = await db.query.roles.findFirst({
      where: and(eq(schema.roles.id, roleId), eq(schema.roles.hubId, hubId)),
      columns: { id: true },
    })
    if (!role) { throw Errors.NOT_FOUND('Role') }

    const assignments = await db.query.memberRoles.findMany({
      where: and(eq(schema.memberRoles.hubId, hubId), eq(schema.memberRoles.roleId, roleId)),
      with: {
        user: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true },
        },
      },
    })

    return {
      members: assignments.map((a) => ({
        ...a.user,
        assignedAt: a.assignedAt.toISOString(),
      })),
    }
  })

  // GET /api/hubs/:hubId/members/:memberId/roles
  app.get('/:hubId/members/:memberId/roles', { preHandler: requireAuth }, async (req) => {
    const { hubId, memberId } = req.params as { hubId: string; memberId: string }

    const member = await db.query.hubMembers.findFirst({
      where: and(eq(schema.hubMembers.hubId, hubId), eq(schema.hubMembers.userId, req.userId)),
    })
    if (!member) { throw Errors.NOT_HUB_MEMBER() }

    const assignments = await db.query.memberRoles.findMany({
      where: and(eq(schema.memberRoles.hubId, hubId), eq(schema.memberRoles.userId, memberId)),
      with: { role: true },
    })

    return {
      roles: assignments.map((a) => serializeRole(a.role)),
    }
  })

  // POST /api/hubs/:hubId/members/:targetUserId/roles/:roleId — assign role
  app.post('/:hubId/members/:targetUserId/roles/:roleId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, targetUserId, roleId } = req.params as {
      hubId: string
      targetUserId: string
      roleId: string
    }

    const role = await db.query.roles.findFirst({
      where: and(eq(schema.roles.id, roleId), eq(schema.roles.hubId, hubId)),
      columns: { position: true, isDefault: true },
    })
    if (!role) { throw Errors.NOT_FOUND('Role') }
    if (role.isDefault) { throw Errors.FORBIDDEN() } // @everyone auto-applied

    await assertCanManageRole(req.userId, hubId, role.position)

    // Target must be a hub member
    const targetMember = await db.query.hubMembers.findFirst({
      where: and(eq(schema.hubMembers.hubId, hubId), eq(schema.hubMembers.userId, targetUserId)),
    })
    if (!targetMember) { throw Errors.NOT_HUB_MEMBER() }

    // Ensure requester outranks target's highest role too
    const targetHighest = await getUserHighestRolePosition(targetUserId, hubId)
    const myPosition = await getUserHighestRolePosition(req.userId, hubId)
    if (myPosition !== Infinity && myPosition <= targetHighest) { throw Errors.FORBIDDEN() }

    await db
      .insert(schema.memberRoles)
      .values({ hubId, userId: targetUserId, roleId })
      .onConflictDoNothing()

    // Emit member role update
    getIO()?.to(`hub:${hubId}`).emit('hub:member_roles_updated', { userId: targetUserId })

    return reply.code(204).send()
  })

  // DELETE /api/hubs/:hubId/members/:targetUserId/roles/:roleId — remove role
  app.delete('/:hubId/members/:targetUserId/roles/:roleId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, targetUserId, roleId } = req.params as {
      hubId: string
      targetUserId: string
      roleId: string
    }

    const role = await db.query.roles.findFirst({
      where: and(eq(schema.roles.id, roleId), eq(schema.roles.hubId, hubId)),
      columns: { position: true, isDefault: true },
    })
    if (!role) { throw Errors.NOT_FOUND('Role') }
    if (role.isDefault) { throw Errors.FORBIDDEN() }

    await assertCanManageRole(req.userId, hubId, role.position)

    const targetHighest = await getUserHighestRolePosition(targetUserId, hubId)
    const myPosition = await getUserHighestRolePosition(req.userId, hubId)
    if (myPosition !== Infinity && myPosition <= targetHighest) { throw Errors.FORBIDDEN() }

    await db.delete(schema.memberRoles).where(
      and(
        eq(schema.memberRoles.hubId, hubId),
        eq(schema.memberRoles.userId, targetUserId),
        eq(schema.memberRoles.roleId, roleId),
      ),
    )

    getIO()?.to(`hub:${hubId}`).emit('hub:member_roles_updated', { userId: targetUserId })

    return reply.code(204).send()
  })
}
