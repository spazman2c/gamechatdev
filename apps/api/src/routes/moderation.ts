import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'

const AddWordFilterSchema = z.object({
  word: z.string().min(1).max(100),
  blockMessage: z.boolean().optional().default(false),
})

const BanSchema = z.object({
  reason: z.string().max(500).optional(),
})

const TimeoutSchema = z.object({
  durationMinutes: z.number().int().min(1).max(40320), // max 28 days
  reason: z.string().max(500).optional(),
})

const WordFilterSchema = z.object({
  words: z.array(z.string().min(1).max(50)).max(100),
})

export async function moderationRoutes(app: FastifyInstance) {
  // POST /api/hubs/:hubId/bans/:targetUserId
  app.post('/:hubId/bans/:targetUserId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, targetUserId } = req.params as { hubId: string; targetUserId: string }
    const body = BanSchema.parse(req.body)

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }
    if (targetUserId === hub.ownerId) { throw Errors.FORBIDDEN() }

    // Remove from members first
    await db
      .delete(schema.hubMembers)
      .where(and(eq(schema.hubMembers.hubId, hubId), eq(schema.hubMembers.userId, targetUserId)))

    // Add ban
    await db
      .insert(schema.hubBans)
      .values({ hubId, userId: targetUserId, reason: body.reason ?? null, bannedBy: req.userId })
      .onConflictDoNothing()

    await db.insert(schema.modActions).values({
      hubId,
      actorId: req.userId,
      targetId: targetUserId,
      action: 'ban',
      reason: body.reason ?? null,
    })

    return reply.code(204).send()
  })

  // DELETE /api/hubs/:hubId/bans/:targetUserId — unban
  app.delete('/:hubId/bans/:targetUserId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, targetUserId } = req.params as { hubId: string; targetUserId: string }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    await db
      .delete(schema.hubBans)
      .where(and(eq(schema.hubBans.hubId, hubId), eq(schema.hubBans.userId, targetUserId)))

    await db.insert(schema.modActions).values({
      hubId,
      actorId: req.userId,
      targetId: targetUserId,
      action: 'unban',
    })

    return reply.code(204).send()
  })

  // GET /api/hubs/:hubId/bans
  app.get('/:hubId/bans', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const bans = await db.query.hubBans.findMany({
      where: eq(schema.hubBans.hubId, hubId),
      with: {
        user: { columns: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
      orderBy: (b, { desc }) => desc(b.createdAt),
    })
    return { bans }
  })

  // POST /api/hubs/:hubId/timeouts/:targetUserId
  app.post('/:hubId/timeouts/:targetUserId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, targetUserId } = req.params as { hubId: string; targetUserId: string }
    const body = TimeoutSchema.parse(req.body)

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }
    if (targetUserId === hub.ownerId) { throw Errors.FORBIDDEN() }

    const expiresAt = new Date(Date.now() + body.durationMinutes * 60 * 1000)

    await db
      .insert(schema.memberTimeouts)
      .values({ hubId, userId: targetUserId, expiresAt, reason: body.reason ?? null })

    await db.insert(schema.modActions).values({
      hubId,
      actorId: req.userId,
      targetId: targetUserId,
      action: 'timeout',
      reason: body.reason ?? null,
      metadata: { durationMinutes: body.durationMinutes, expiresAt: expiresAt.toISOString() },
    })

    return reply.code(204).send()
  })

  // GET /api/hubs/:hubId/word-filters
  app.get('/:hubId/word-filters', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const filters = await db.query.wordFilters.findMany({
      where: eq(schema.wordFilters.hubId, hubId),
      orderBy: (wf, { asc }) => asc(wf.word),
    })
    return { filters }
  })

  // POST /api/hubs/:hubId/word-filters
  app.post('/:hubId/word-filters', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId } = req.params as { hubId: string }
    const body = AddWordFilterSchema.parse(req.body)

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const [filter] = await db
      .insert(schema.wordFilters)
      .values({ hubId, word: body.word.toLowerCase(), blockMessage: body.blockMessage })
      .onConflictDoNothing()
      .returning()

    return reply.code(201).send(filter ?? { hubId, word: body.word.toLowerCase() })
  })

  // DELETE /api/hubs/:hubId/word-filters/:filterId
  app.delete('/:hubId/word-filters/:filterId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, filterId } = req.params as { hubId: string; filterId: string }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    await db
      .delete(schema.wordFilters)
      .where(and(eq(schema.wordFilters.id, filterId), eq(schema.wordFilters.hubId, hubId)))

    return reply.code(204).send()
  })

  // PATCH /api/hubs/:hubId/slowmode — set slow mode on a channel
  app.patch('/:hubId/channels/:channelId/slowmode', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, channelId } = req.params as { hubId: string; channelId: string }
    const { delay } = req.body as { delay?: number }

    if (typeof delay !== 'number' || delay < 0 || delay > 21600) {
      throw Errors.VALIDATION_ERROR({ delay: 'Must be 0–21600 seconds' })
    }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    await db
      .update(schema.channels)
      .set({ slowmodeDelay: delay })
      .where(and(eq(schema.channels.id, channelId), eq(schema.channels.hubId, hubId)))

    return reply.code(204).send()
  })

  // GET /api/hubs/:hubId/mod-log
  app.get('/:hubId/mod-log', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }
    const { limit = 50 } = req.query as { limit?: number }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const actions = await db.query.modActions.findMany({
      where: eq(schema.modActions.hubId, hubId),
      orderBy: (m, { desc }) => desc(m.createdAt),
      limit: Math.min(Number(limit), 100),
    })

    return { actions }
  })
}
