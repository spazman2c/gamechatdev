import type { FastifyInstance } from 'fastify'
import { eq, and, lt, desc } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { SendMessageSchema, EditMessageSchema } from '@nexora/schemas'
import { getIO } from '../lib/socket.js'
import { createNotification } from '../lib/notify.js'

const PAGE_SIZE = 50

export async function messageRoutes(app: FastifyInstance) {
  // GET /api/messages?channelId=&before=&limit=
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const { channelId, before, limit = PAGE_SIZE } = req.query as {
      channelId?: string
      before?: string
      limit?: number
    }

    if (!channelId) { throw Errors.VALIDATION_ERROR({ channelId: 'channelId is required' }) }

    const msgs = await db.query.messages.findMany({
      where: and(
        eq(schema.messages.channelId, channelId),
        before ? lt(schema.messages.createdAt, new Date(before)) : undefined,
      ),
      orderBy: desc(schema.messages.createdAt),
      limit: Math.min(Number(limit), 100),
      with: {
        attachments: true,
        reactions: true,
        author: {
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

    return { messages: msgs.reverse(), hasMore: msgs.length === Number(limit) }
  })

  // POST /api/messages?channelId=
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const { channelId } = req.query as { channelId?: string }
    if (!channelId) { throw Errors.VALIDATION_ERROR({ channelId: 'channelId is required' }) }

    const body = SendMessageSchema.parse(req.body)

    // Word filter enforcement
    let content = body.content ?? ''
    if (content) {
      const channel = await db.query.channels.findFirst({
        where: eq(schema.channels.id, channelId),
        columns: { hubId: true },
      })
      if (channel?.hubId) {
        const filters = await db.query.wordFilters.findMany({
          where: eq(schema.wordFilters.hubId, channel.hubId),
        })
        for (const filter of filters) {
          const regex = new RegExp(`\\b${filter.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
          if (filter.blockMessage && regex.test(content)) {
            return reply.code(400).send({ error: 'Message contains prohibited content' })
          }
          content = content.replace(regex, '***')
        }
      }
    }

    const [message] = await db
      .insert(schema.messages)
      .values({
        channelId,
        authorId: req.userId,
        content,
        replyToId: body.replyToId,
      })
      .returning()

    if (!message) { throw Errors.INTERNAL() }

    // Save attachments if provided
    if (body.attachmentUrls?.length) {
      await db.insert(schema.messageAttachments).values(
        body.attachmentUrls.map((url: string) => ({
          messageId: message.id,
          url,
          filename: url.split('/').pop() ?? null,
        })),
      )
    }

    // Fetch full message with author for broadcast
    const fullMessage = await db.query.messages.findFirst({
      where: eq(schema.messages.id, message.id),
      with: {
        attachments: true,
        reactions: true,
        author: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true, presence: true },
        },
      },
    })

    getIO()?.to(`channel:${channelId}`).emit('message:new', fullMessage)

    // Detect @username mentions and notify each mentioned user
    if (content) {
      const mentionMatches = content.match(/@([a-zA-Z0-9_]{2,32})/g)
      if (mentionMatches) {
        const usernames = [...new Set(mentionMatches.map((m) => m.slice(1).toLowerCase()))]
        const mentionedUsers = await db.query.users.findMany({
          where: (u, { inArray, sql: s }) =>
            inArray(s`lower(${u.username})`, usernames),
          columns: { id: true, username: true },
        })

        const channel = await db.query.channels.findFirst({
          where: eq(schema.channels.id, channelId),
          columns: { hubId: true },
          with: { hub: { columns: { name: true } } },
        })

        const authorName = fullMessage?.author?.displayName ?? fullMessage?.author?.username ?? 'Someone'

        for (const mentioned of mentionedUsers) {
          if (mentioned.id === req.userId) { continue } // don't notify self
          await createNotification({
            userId: mentioned.id,
            type: 'mention',
            title: `${authorName} mentioned you`,
            body: content.slice(0, 100),
            referenceUrl: channel?.hubId ? `/app/hub/${channel.hubId}` : undefined,
            referenceId: channelId,
          })
        }
      }
    }

    return reply.code(201).send(fullMessage)
  })

  // PATCH /api/messages/:messageId
  app.patch('/:messageId', { preHandler: requireAuth }, async (req) => {
    const { messageId } = req.params as { messageId: string }
    const body = EditMessageSchema.parse(req.body)

    const message = await db.query.messages.findFirst({
      where: eq(schema.messages.id, messageId),
    })
    if (!message) { throw Errors.MESSAGE_NOT_FOUND() }
    if (message.authorId !== req.userId) { throw Errors.CANNOT_EDIT_MESSAGE() }

    const [updated] = await db
      .update(schema.messages)
      .set({ content: body.content, isEdited: true, editedAt: new Date() })
      .where(eq(schema.messages.id, messageId))
      .returning()

    getIO()?.to(`channel:${message.channelId}`).emit('message:edited', updated)
    return updated
  })

  // DELETE /api/messages/:messageId
  app.delete('/:messageId', { preHandler: requireAuth }, async (req, reply) => {
    const { messageId } = req.params as { messageId: string }

    const message = await db.query.messages.findFirst({
      where: eq(schema.messages.id, messageId),
      with: { channel: { with: { hub: true } } },
    })
    if (!message) { throw Errors.MESSAGE_NOT_FOUND() }

    const isAuthor = message.authorId === req.userId
    const isAdmin = message.channel?.hub?.ownerId === req.userId
    if (!isAuthor && !isAdmin) { throw Errors.CANNOT_DELETE_MESSAGE() }

    await db.delete(schema.messages).where(eq(schema.messages.id, messageId))
    getIO()?.to(`channel:${message.channelId}`).emit('message:deleted', { messageId, channelId: message.channelId })
    return reply.code(204).send()
  })

  // POST /api/messages/:messageId/reactions/:emoji
  app.post('/:messageId/reactions/:emoji', { preHandler: requireAuth }, async (req, reply) => {
    const { messageId, emoji } = req.params as { messageId: string; emoji: string }

    await db
      .insert(schema.reactions)
      .values({ messageId, userId: req.userId, emoji: decodeURIComponent(emoji) })
      .onConflictDoNothing()

    return reply.code(204).send()
  })

  // DELETE /api/messages/:messageId/reactions/:emoji
  app.delete('/:messageId/reactions/:emoji', { preHandler: requireAuth }, async (req, reply) => {
    const { messageId, emoji } = req.params as { messageId: string; emoji: string }

    await db
      .delete(schema.reactions)
      .where(
        and(
          eq(schema.reactions.messageId, messageId),
          eq(schema.reactions.userId, req.userId),
          eq(schema.reactions.emoji, decodeURIComponent(emoji)),
        ),
      )

    return reply.code(204).send()
  })
}
