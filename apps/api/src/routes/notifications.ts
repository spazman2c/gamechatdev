import type { FastifyInstance } from 'fastify'
import { eq, and, desc } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'

export async function notificationRoutes(app: FastifyInstance) {
  // GET /api/notifications — list recent 60, unread count
  app.get('/', { preHandler: requireAuth }, async (req) => {
    const items = await db.query.notifications.findMany({
      where: eq(schema.notifications.userId, req.userId),
      orderBy: desc(schema.notifications.createdAt),
      limit: 60,
    })

    const unreadCount = items.filter((n) => !n.read).length

    return { notifications: items, unreadCount }
  })

  // PATCH /api/notifications/:id/read — mark one read
  app.patch('/:id/read', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const notif = await db.query.notifications.findFirst({
      where: and(
        eq(schema.notifications.id, id),
        eq(schema.notifications.userId, req.userId),
      ),
    })
    if (!notif) { throw Errors.NOT_FOUND('Notification') }

    const [updated] = await db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.id, id))
      .returning()

    return updated
  })

  // PATCH /api/notifications/read-all — mark all read
  app.patch('/read-all', { preHandler: requireAuth }, async (req, reply) => {
    await db
      .update(schema.notifications)
      .set({ read: true })
      .where(eq(schema.notifications.userId, req.userId))

    return reply.code(204).send()
  })

  // DELETE /api/notifications/:id — delete one
  app.delete('/:id', { preHandler: requireAuth }, async (req, reply) => {
    const { id } = req.params as { id: string }

    const notif = await db.query.notifications.findFirst({
      where: and(
        eq(schema.notifications.id, id),
        eq(schema.notifications.userId, req.userId),
      ),
    })
    if (!notif) { throw Errors.NOT_FOUND('Notification') }

    await db.delete(schema.notifications).where(eq(schema.notifications.id, id))
    return reply.code(204).send()
  })

  // DELETE /api/notifications — clear all
  app.delete('/', { preHandler: requireAuth }, async (req, reply) => {
    await db
      .delete(schema.notifications)
      .where(eq(schema.notifications.userId, req.userId))

    return reply.code(204).send()
  })

  // GET /api/notifications/settings
  app.get('/settings', { preHandler: requireAuth }, async (req) => {
    const settings = await db.query.userNotificationSettings.findFirst({
      where: eq(schema.userNotificationSettings.userId, req.userId),
    })

    // Return defaults if no row yet
    return {
      notifDms: settings?.notifDms ?? true,
      notifMentions: settings?.notifMentions ?? true,
      notifHubActivity: settings?.notifHubActivity ?? false,
      notifSounds: settings?.notifSounds ?? true,
      notifDesktop: settings?.notifDesktop ?? false,
    }
  })

  // PATCH /api/notifications/settings
  app.patch('/settings', { preHandler: requireAuth }, async (req) => {
    const body = req.body as Partial<{
      notifDms: boolean
      notifMentions: boolean
      notifHubActivity: boolean
      notifSounds: boolean
      notifDesktop: boolean
    }>

    const [result] = await db
      .insert(schema.userNotificationSettings)
      .values({ userId: req.userId, ...body })
      .onConflictDoUpdate({
        target: schema.userNotificationSettings.userId,
        set: body,
      })
      .returning()

    return result
  })
}
