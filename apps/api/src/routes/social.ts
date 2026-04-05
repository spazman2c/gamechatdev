import type { FastifyInstance } from 'fastify'
import { and, eq, or } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'

const NoteSchema = z.object({
  note: z.string().max(256),
})

export async function socialRoutes(app: FastifyInstance) {
  // GET /api/social/friends — list accepted friends
  app.get('/friends', { preHandler: requireAuth }, async (req) => {
    const userId = req.userId

    const rows = await db.query.friendships.findMany({
      where: and(
        or(
          eq(schema.friendships.requesterId, userId),
          eq(schema.friendships.addresseeId, userId),
        ),
        eq(schema.friendships.status, 'accepted'),
      ),
      with: {
        requester: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true, presence: true },
        },
        addressee: {
          columns: { id: true, username: true, displayName: true, avatarUrl: true, presence: true },
        },
      },
    })

    const friends = rows.map((f) =>
      f.requesterId === userId ? f.addressee : f.requester,
    )

    return { friends }
  })

  // GET /api/social/:targetId — relationship summary for calling user
  app.get('/:targetId', { preHandler: requireAuth }, async (req) => {
    const { targetId } = req.params as { targetId: string }
    const userId = req.userId

    // Note
    const noteRow = await db.query.userNotes.findFirst({
      where: and(
        eq(schema.userNotes.userId, userId),
        eq(schema.userNotes.targetId, targetId),
      ),
    })

    // Friendship (either direction)
    const friendshipRow = await db.query.friendships.findFirst({
      where: or(
        and(eq(schema.friendships.requesterId, userId), eq(schema.friendships.addresseeId, targetId)),
        and(eq(schema.friendships.requesterId, targetId), eq(schema.friendships.addresseeId, userId)),
      ),
    })

    // Ignore
    const ignoreRow = await db.query.userIgnores.findFirst({
      where: and(
        eq(schema.userIgnores.userId, userId),
        eq(schema.userIgnores.ignoredId, targetId),
      ),
    })

    // Block
    const blockRow = await db.query.userBlocks.findFirst({
      where: and(
        eq(schema.userBlocks.userId, userId),
        eq(schema.userBlocks.blockedId, targetId),
      ),
    })

    return {
      note: noteRow?.note ?? '',
      friendship: friendshipRow
        ? {
            status: friendshipRow.status,
            isRequester: friendshipRow.requesterId === userId,
          }
        : null,
      isIgnored: !!ignoreRow,
      isBlocked: !!blockRow,
    }
  })

  // PUT /api/social/:targetId/note — upsert note
  app.put('/:targetId/note', { preHandler: requireAuth }, async (req, reply) => {
    const { targetId } = req.params as { targetId: string }
    const body = NoteSchema.parse(req.body)
    const userId = req.userId

    await db
      .insert(schema.userNotes)
      .values({ userId, targetId, note: body.note })
      .onConflictDoUpdate({
        target: [schema.userNotes.userId, schema.userNotes.targetId],
        set: { note: body.note, updatedAt: new Date() },
      })

    return reply.code(204).send()
  })

  // POST /api/social/:targetId/friend — send or accept friend request
  app.post('/:targetId/friend', { preHandler: requireAuth }, async (req, reply) => {
    const { targetId } = req.params as { targetId: string }
    const userId = req.userId

    if (userId === targetId) { throw Errors.FORBIDDEN() }

    // Check if addressee already sent us a request (reverse pending)
    const reverseRow = await db.query.friendships.findFirst({
      where: and(
        eq(schema.friendships.requesterId, targetId),
        eq(schema.friendships.addresseeId, userId),
        eq(schema.friendships.status, 'pending'),
      ),
    })

    if (reverseRow) {
      // Accept it
      await db
        .update(schema.friendships)
        .set({ status: 'accepted', updatedAt: new Date() })
        .where(eq(schema.friendships.id, reverseRow.id))
      return reply.code(200).send({ status: 'accepted' })
    }

    // Insert new request (ignore if already exists)
    await db
      .insert(schema.friendships)
      .values({ requesterId: userId, addresseeId: targetId, status: 'pending' })
      .onConflictDoNothing()

    return reply.code(201).send({ status: 'pending' })
  })

  // DELETE /api/social/:targetId/friend — remove friendship (both directions)
  app.delete('/:targetId/friend', { preHandler: requireAuth }, async (req, reply) => {
    const { targetId } = req.params as { targetId: string }
    const userId = req.userId

    await db
      .delete(schema.friendships)
      .where(
        or(
          and(eq(schema.friendships.requesterId, userId), eq(schema.friendships.addresseeId, targetId)),
          and(eq(schema.friendships.requesterId, targetId), eq(schema.friendships.addresseeId, userId)),
        ),
      )

    return reply.code(204).send()
  })

  // POST /api/social/:targetId/ignore
  app.post('/:targetId/ignore', { preHandler: requireAuth }, async (req, reply) => {
    const { targetId } = req.params as { targetId: string }
    const userId = req.userId

    if (userId === targetId) { throw Errors.FORBIDDEN() }

    await db
      .insert(schema.userIgnores)
      .values({ userId, ignoredId: targetId })
      .onConflictDoNothing()

    return reply.code(204).send()
  })

  // DELETE /api/social/:targetId/ignore
  app.delete('/:targetId/ignore', { preHandler: requireAuth }, async (req, reply) => {
    const { targetId } = req.params as { targetId: string }
    const userId = req.userId

    await db
      .delete(schema.userIgnores)
      .where(and(eq(schema.userIgnores.userId, userId), eq(schema.userIgnores.ignoredId, targetId)))

    return reply.code(204).send()
  })

  // POST /api/social/:targetId/block
  app.post('/:targetId/block', { preHandler: requireAuth }, async (req, reply) => {
    const { targetId } = req.params as { targetId: string }
    const userId = req.userId

    if (userId === targetId) { throw Errors.FORBIDDEN() }

    await db
      .insert(schema.userBlocks)
      .values({ userId, blockedId: targetId })
      .onConflictDoNothing()

    // Also remove any friendship
    await db
      .delete(schema.friendships)
      .where(
        or(
          and(eq(schema.friendships.requesterId, userId), eq(schema.friendships.addresseeId, targetId)),
          and(eq(schema.friendships.requesterId, targetId), eq(schema.friendships.addresseeId, userId)),
        ),
      )

    return reply.code(204).send()
  })

  // DELETE /api/social/:targetId/block
  app.delete('/:targetId/block', { preHandler: requireAuth }, async (req, reply) => {
    const { targetId } = req.params as { targetId: string }
    const userId = req.userId

    await db
      .delete(schema.userBlocks)
      .where(and(eq(schema.userBlocks.userId, userId), eq(schema.userBlocks.blockedId, targetId)))

    return reply.code(204).send()
  })
}
