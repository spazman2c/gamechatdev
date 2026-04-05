import type { FastifyInstance } from 'fastify'
import { eq, and, desc } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { CreateHubSchema, UpdateHubSchema, CreateZoneSchema, UpdateZoneSchema } from '@nexora/schemas'
import { nanoid } from 'nanoid'

export async function hubRoutes(app: FastifyInstance) {
  // GET /api/hubs — public hub discovery
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const { q, limit = 20, cursor } = req.query as { q?: string; limit?: number; cursor?: string }

    const hubs = await db.query.hubs.findMany({
      where: (h, { eq }) => eq(h.isPublic, true),
      limit: Math.min(Number(limit), 50),
      orderBy: (h, { desc }) => desc(h.memberCount),
      columns: {
        id: true,
        name: true,
        slug: true,
        description: true,
        iconUrl: true,
        atmosphere: true,
        memberCount: true,
        createdAt: true,
      },
    })
    return { hubs }
  })

  // POST /api/hubs — create a new hub
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = CreateHubSchema.parse(req.body)

    const [hub] = await db
      .insert(schema.hubs)
      .values({
        ownerId: req.userId,
        name: body.name,
        description: body.description,
        isPublic: body.isPublic,
        joinPolicy: body.joinPolicy,
        atmosphere: body.atmosphere,
        memberCount: 1,
      })
      .returning()

    if (!hub) { throw Errors.INTERNAL() }

    // Add owner as first member
    await db.insert(schema.hubMembers).values({
      hubId: hub.id,
      userId: req.userId,
    })

    // Create default @everyone role
    await db.insert(schema.roles).values({
      hubId: hub.id,
      name: '@everyone',
      isDefault: true,
      position: 0,
      permissions: 1659, // VIEW_CHANNEL | SEND_MESSAGES | READ_HISTORY | ADD_REACTIONS | EMBED_LINKS | ATTACH_FILES | CONNECT | SPEAK
    })

    // Create a default General zone with a general stream
    const [zone] = await db
      .insert(schema.zones)
      .values({ hubId: hub.id, name: 'General', position: 0 })
      .returning()

    if (zone) {
      await db.insert(schema.channels).values([
        { hubId: hub.id, zoneId: zone.id, name: 'general', type: 'text', position: 0 },
        { hubId: hub.id, zoneId: zone.id, name: 'announcements', type: 'announcement', position: 1 },
        { hubId: hub.id, name: 'Lounge', type: 'voice', position: 0 },
      ])
    }

    return reply.code(201).send(hub)
  })

  // GET /api/hubs/:hubId
  app.get('/:hubId', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }

    const hub = await db.query.hubs.findFirst({
      where: eq(schema.hubs.id, hubId),
      with: {
        zones: { orderBy: (z, { asc }) => asc(z.position) },
        channels: { orderBy: (c, { asc }) => asc(c.position) },
      },
    })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }

    // Verify membership for private hubs
    if (!hub.isPublic) {
      const member = await db.query.hubMembers.findFirst({
        where: and(
          eq(schema.hubMembers.hubId, hubId),
          eq(schema.hubMembers.userId, req.userId),
        ),
      })
      if (!member) { throw Errors.NOT_HUB_MEMBER() }
    }

    const { zones, channels, ...hubData } = hub
    return { hub: hubData, zones, channels }
  })

  // PATCH /api/hubs/:hubId
  app.patch('/:hubId', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }
    const body = UpdateHubSchema.parse(req.body)

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const [updated] = await db
      .update(schema.hubs)
      .set(body)
      .where(eq(schema.hubs.id, hubId))
      .returning()

    return updated
  })

  // DELETE /api/hubs/:hubId
  app.delete('/:hubId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId } = req.params as { hubId: string }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    await db.delete(schema.hubs).where(eq(schema.hubs.id, hubId))
    return reply.code(204).send()
  })

  // GET /api/hubs/:hubId/members
  app.get('/:hubId/members', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }
    const { limit = 100, cursor } = req.query as { limit?: number; cursor?: string }

    const members = await db.query.hubMembers.findMany({
      where: eq(schema.hubMembers.hubId, hubId),
      limit: Math.min(Number(limit), 200),
      with: {
        user: {
          columns: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            presence: true,
          },
        },
      },
    })
    return { members }
  })

  // DELETE /api/hubs/:hubId/members/:userId — kick
  app.delete('/:hubId/members/:targetUserId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, targetUserId } = req.params as { hubId: string; targetUserId: string }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }

    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }
    if (targetUserId === hub.ownerId) {
      throw Errors.FORBIDDEN()
    }

    await db
      .delete(schema.hubMembers)
      .where(
        and(
          eq(schema.hubMembers.hubId, hubId),
          eq(schema.hubMembers.userId, targetUserId),
        ),
      )

    await db.insert(schema.modActions).values({
      hubId,
      actorId: req.userId,
      targetId: targetUserId,
      action: 'kick',
    })

    return reply.code(204).send()
  })

  // ── Zones ──

  // POST /api/hubs/:hubId/zones
  app.post('/:hubId/zones', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId } = req.params as { hubId: string }
    const body = CreateZoneSchema.parse(req.body)

    const [zone] = await db
      .insert(schema.zones)
      .values({ hubId, name: body.name, position: 999 })
      .returning()

    return reply.code(201).send(zone)
  })

  // PATCH /api/hubs/:hubId/zones/:zoneId
  app.patch('/:hubId/zones/:zoneId', { preHandler: requireAuth }, async (req) => {
    const { hubId, zoneId } = req.params as { hubId: string; zoneId: string }
    const body = UpdateZoneSchema.parse(req.body)

    const [updated] = await db
      .update(schema.zones)
      .set(body)
      .where(and(eq(schema.zones.id, zoneId), eq(schema.zones.hubId, hubId)))
      .returning()

    if (!updated) { throw Errors.NOT_FOUND('Zone') }
    return updated
  })

  // DELETE /api/hubs/:hubId/zones/:zoneId
  app.delete('/:hubId/zones/:zoneId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, zoneId } = req.params as { hubId: string; zoneId: string }

    await db
      .delete(schema.zones)
      .where(and(eq(schema.zones.id, zoneId), eq(schema.zones.hubId, hubId)))

    return reply.code(204).send()
  })

  // GET /api/hubs/:hubId/channels
  app.get('/:hubId/channels', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }

    const channels = await db.query.channels.findMany({
      where: eq(schema.channels.hubId, hubId),
      orderBy: (c, { asc }) => asc(c.position),
    })
    return { channels }
  })

}
