import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'

const CreateRoleSchema = z.object({
  name: z.string().min(1).max(64),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
  permissions: z.string().optional().default('0'), // bigint as string
})

const UpdateRoleSchema = CreateRoleSchema.partial().extend({
  position: z.number().int().min(0).optional(),
})

export async function roleRoutes(app: FastifyInstance) {
  // GET /api/hubs/:hubId/roles
  app.get('/:hubId/roles', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }
    const roles = await db.query.roles.findMany({
      where: eq(schema.roles.hubId, hubId),
      orderBy: (r, { asc }) => asc(r.position),
    })
    return { roles }
  })

  // POST /api/hubs/:hubId/roles
  app.post('/:hubId/roles', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId } = req.params as { hubId: string }
    const body = CreateRoleSchema.parse(req.body)

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const [role] = await db
      .insert(schema.roles)
      .values({
        hubId,
        name: body.name,
        color: body.color ?? null,
        permissions: BigInt(body.permissions),
        position: 999,
      })
      .returning()

    return reply.code(201).send(role)
  })

  // PATCH /api/hubs/:hubId/roles/:roleId
  app.patch('/:hubId/roles/:roleId', { preHandler: requireAuth }, async (req) => {
    const { hubId, roleId } = req.params as { hubId: string; roleId: string }
    const body = UpdateRoleSchema.parse(req.body)

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) { updateData.name = body.name }
    if (body.color !== undefined) { updateData.color = body.color }
    if (body.position !== undefined) { updateData.position = body.position }
    if (body.permissions !== undefined) { updateData.permissions = BigInt(body.permissions) }

    const [updated] = await db
      .update(schema.roles)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updateData as any)
      .where(and(eq(schema.roles.id, roleId), eq(schema.roles.hubId, hubId)))
      .returning()

    if (!updated) { throw Errors.NOT_FOUND('Role') }
    return updated
  })

  // DELETE /api/hubs/:hubId/roles/:roleId
  app.delete('/:hubId/roles/:roleId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, roleId } = req.params as { hubId: string; roleId: string }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const role = await db.query.roles.findFirst({
      where: and(eq(schema.roles.id, roleId), eq(schema.roles.hubId, hubId)),
    })
    if (!role) { throw Errors.NOT_FOUND('Role') }
    if (role.isDefault) { throw Errors.FORBIDDEN() } // Can't delete @everyone

    await db.delete(schema.roles).where(eq(schema.roles.id, roleId))
    return reply.code(204).send()
  })

  // POST /api/hubs/:hubId/members/:userId/roles/:roleId — assign role
  app.post('/:hubId/members/:targetUserId/roles/:roleId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, targetUserId, roleId } = req.params as {
      hubId: string
      targetUserId: string
      roleId: string
    }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    await db
      .insert(schema.memberRoles)
      .values({ hubId, userId: targetUserId, roleId })
      .onConflictDoNothing()

    return reply.code(204).send()
  })

  // DELETE /api/hubs/:hubId/members/:userId/roles/:roleId — remove role
  app.delete('/:hubId/members/:targetUserId/roles/:roleId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, targetUserId, roleId } = req.params as {
      hubId: string
      targetUserId: string
      roleId: string
    }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    await db.delete(schema.memberRoles).where(
      and(
        eq(schema.memberRoles.hubId, hubId),
        eq(schema.memberRoles.userId, targetUserId),
        eq(schema.memberRoles.roleId, roleId),
      ),
    )
    return reply.code(204).send()
  })
}
