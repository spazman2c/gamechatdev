import type { FastifyInstance } from 'fastify'
import { eq, and, lt, desc } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { SendMessageSchema } from '@nexora/schemas'
import { getIO } from '../lib/socket.js'

const PAGE_SIZE = 50

export async function dmRoutes(app: FastifyInstance) {
  // GET /api/dms — list conversations for current user
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const participants = await db.query.dmParticipants.findMany({
      where: eq(schema.dmParticipants.userId, req.userId),
      with: {
        conversation: {
          with: {
            participants: {
              with: {
                user: {
                  columns: { id: true, username: true, displayName: true, avatarUrl: true, presence: true },
                },
              },
            },
          },
        },
      },
    })
    return { conversations: participants.map((p) => p.conversation) }
  })

  // POST /api/dms — start or find DM with another user
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const { userId } = req.body as { userId?: string }
    if (!userId) { throw Errors.VALIDATION_ERROR({ userId: 'userId is required' }) }
    if (userId === req.userId) { throw Errors.VALIDATION_ERROR({ userId: 'Cannot DM yourself' }) }

    // Find existing 1:1 conversation between these two users
    const myConvs = await db.query.dmParticipants.findMany({
      where: eq(schema.dmParticipants.userId, req.userId),
      columns: { conversationId: true },
    })
    const myConvIds = myConvs.map((p) => p.conversationId)

    if (myConvIds.length > 0) {
      const theirParticipation = await db.query.dmParticipants.findFirst({
        where: (p, { and, eq, inArray }) =>
          and(
            eq(p.userId, userId),
            inArray(p.conversationId, myConvIds),
          ),
        with: { conversation: true },
      })

      if (theirParticipation && !theirParticipation.conversation.isGroup) {
        return reply.send(theirParticipation.conversation)
      }
    }

    // Create new conversation
    const [conversation] = await db
      .insert(schema.dmConversations)
      .values({ isGroup: false })
      .returning()

    if (!conversation) { throw Errors.INTERNAL() }

    await db.insert(schema.dmParticipants).values([
      { conversationId: conversation.id, userId: req.userId },
      { conversationId: conversation.id, userId },
    ])

    return reply.code(201).send(conversation)
  })

  // GET /api/dms/:conversationId/messages
  app.get('/:conversationId/messages', { preHandler: requireAuth }, async (req) => {
    const { conversationId } = req.params as { conversationId: string }
    const { before, limit = PAGE_SIZE } = req.query as { before?: string; limit?: number }

    const participant = await db.query.dmParticipants.findFirst({
      where: and(
        eq(schema.dmParticipants.conversationId, conversationId),
        eq(schema.dmParticipants.userId, req.userId),
      ),
    })
    if (!participant) { throw Errors.FORBIDDEN() }

    const msgs = await db.query.dmMessages.findMany({
      where: and(
        eq(schema.dmMessages.conversationId, conversationId),
        before ? lt(schema.dmMessages.createdAt, new Date(before)) : undefined,
      ),
      orderBy: desc(schema.dmMessages.createdAt),
      limit: Math.min(Number(limit), 100),
      with: {
        author: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true, presence: true },
        },
      },
    })

    return { messages: msgs.reverse(), hasMore: msgs.length === Math.min(Number(limit), 100) }
  })

  // POST /api/dms/:conversationId/messages
  app.post('/:conversationId/messages', { preHandler: requireAuth }, async (req, reply) => {
    const { conversationId } = req.params as { conversationId: string }
    const body = SendMessageSchema.parse(req.body)

    const participant = await db.query.dmParticipants.findFirst({
      where: and(
        eq(schema.dmParticipants.conversationId, conversationId),
        eq(schema.dmParticipants.userId, req.userId),
      ),
    })
    if (!participant) { throw Errors.FORBIDDEN() }

    const [msg] = await db
      .insert(schema.dmMessages)
      .values({
        conversationId,
        authorId: req.userId,
        content: body.content ?? null,
        replyToId: body.replyToId ?? null,
      })
      .returning()

    if (!msg) { throw Errors.INTERNAL() }

    const author = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId),
      columns: { id: true, username: true, displayName: true, avatarUrl: true, presence: true },
    })

    const fullMessage = { ...msg, author }

    // Broadcast to all conversation participants via Socket.io
    const io = getIO()
    if (io) {
      io.to(`dm:${conversationId}`).emit('dm:message:new', fullMessage)
    }

    return reply.code(201).send(fullMessage)
  })

  // PATCH /api/dms/:conversationId/messages/:messageId
  app.patch('/:conversationId/messages/:messageId', { preHandler: requireAuth }, async (req) => {
    const { conversationId, messageId } = req.params as { conversationId: string; messageId: string }
    const { content } = req.body as { content?: string }
    if (!content?.trim()) { throw Errors.VALIDATION_ERROR({ content: 'Content is required' }) }

    const msg = await db.query.dmMessages.findFirst({
      where: and(
        eq(schema.dmMessages.id, messageId),
        eq(schema.dmMessages.conversationId, conversationId),
      ),
    })
    if (!msg) { throw Errors.NOT_FOUND('Message') }
    if (msg.authorId !== req.userId) { throw Errors.FORBIDDEN() }

    const [updated] = await db
      .update(schema.dmMessages)
      .set({ content, isEdited: true, editedAt: new Date() })
      .where(eq(schema.dmMessages.id, messageId))
      .returning()

    const io = getIO()
    if (io) {
      io.to(`dm:${conversationId}`).emit('dm:message:edited', updated)
    }

    return updated
  })

  // DELETE /api/dms/:conversationId/messages/:messageId
  app.delete('/:conversationId/messages/:messageId', { preHandler: requireAuth }, async (req, reply) => {
    const { conversationId, messageId } = req.params as { conversationId: string; messageId: string }

    const msg = await db.query.dmMessages.findFirst({
      where: and(
        eq(schema.dmMessages.id, messageId),
        eq(schema.dmMessages.conversationId, conversationId),
      ),
    })
    if (!msg) { throw Errors.NOT_FOUND('Message') }
    if (msg.authorId !== req.userId) { throw Errors.FORBIDDEN() }

    await db.delete(schema.dmMessages).where(eq(schema.dmMessages.id, messageId))

    const io = getIO()
    if (io) {
      io.to(`dm:${conversationId}`).emit('dm:message:deleted', { messageId, conversationId })
    }

    return reply.code(204).send()
  })
}
