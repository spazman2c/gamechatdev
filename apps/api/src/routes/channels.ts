import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { CreateChannelSchema, UpdateChannelSchema } from '@nexora/schemas'

export async function channelRoutes(app: FastifyInstance) {
  // POST /api/channels — create channel in a hub
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const body = CreateChannelSchema.parse(req.body)
    const { hubId } = req.body as { hubId?: string }
    if (!hubId) { throw Errors.VALIDATION_ERROR({ hubId: 'hubId is required' }) }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const [channel] = await db
      .insert(schema.channels)
      .values({ hubId, ...body })
      .returning()

    return reply.code(201).send(channel)
  })

  // GET /api/channels/:channelId
  app.get('/:channelId', { preHandler: requireAuth }, async (req) => {
    const { channelId } = req.params as { channelId: string }
    const channel = await db.query.channels.findFirst({
      where: eq(schema.channels.id, channelId),
    })
    if (!channel) { throw Errors.CHANNEL_NOT_FOUND() }
    return channel
  })

  // PATCH /api/channels/:channelId
  app.patch('/:channelId', { preHandler: requireAuth }, async (req) => {
    const { channelId } = req.params as { channelId: string }
    const body = UpdateChannelSchema.parse(req.body)

    const channel = await db.query.channels.findFirst({
      where: eq(schema.channels.id, channelId),
      with: { hub: true },
    })
    if (!channel) { throw Errors.CHANNEL_NOT_FOUND() }
    if (channel.hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const [updated] = await db
      .update(schema.channels)
      .set(body)
      .where(eq(schema.channels.id, channelId))
      .returning()

    return updated
  })

  // DELETE /api/channels/:channelId
  app.delete('/:channelId', { preHandler: requireAuth }, async (req, reply) => {
    const { channelId } = req.params as { channelId: string }

    const channel = await db.query.channels.findFirst({
      where: eq(schema.channels.id, channelId),
      with: { hub: true },
    })
    if (!channel) { throw Errors.CHANNEL_NOT_FOUND() }
    if (channel.hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    await db.delete(schema.channels).where(eq(schema.channels.id, channelId))
    return reply.code(204).send()
  })

  // GET /api/channels/:channelId/pins
  app.get('/:channelId/pins', { preHandler: requireAuth }, async (req) => {
    const { channelId } = req.params as { channelId: string }
    const pins = await db.query.messages.findMany({
      where: and(
        eq(schema.messages.channelId, channelId),
        eq(schema.messages.isPinned, true),
      ),
      orderBy: (m, { desc }) => desc(m.createdAt),
      with: {
        attachments: true,
        reactions: true,
      },
    })
    return { pins }
  })

  // POST /api/channels/:channelId/messages/:messageId/pin
  app.post('/:channelId/messages/:messageId/pin', { preHandler: requireAuth }, async (req, reply) => {
    const { channelId, messageId } = req.params as { channelId: string; messageId: string }

    await db
      .update(schema.messages)
      .set({ isPinned: true })
      .where(
        and(
          eq(schema.messages.id, messageId),
          eq(schema.messages.channelId, channelId),
        ),
      )

    return reply.code(204).send()
  })
}
