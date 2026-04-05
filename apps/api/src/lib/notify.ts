/**
 * Server-side notification helper.
 * Creates a DB record and pushes `notification:new` to the recipient's socket room.
 */
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'
import { getIO } from './socket.js'

export type NotifType = 'dm_message' | 'mention' | 'friend_request' | 'hub_invite' | 'system'

interface CreateNotifParams {
  userId: string
  type: NotifType
  title: string
  body?: string
  referenceUrl?: string
  referenceId?: string
}

export async function createNotification(params: CreateNotifParams) {
  const { userId, type, title, body, referenceUrl, referenceId } = params

  // Fetch user's settings (defaults to all-enabled if no row yet)
  const settings = await db.query.userNotificationSettings.findFirst({
    where: eq(schema.userNotificationSettings.userId, userId),
  })

  if (type === 'dm_message' && settings?.notifDms === false) { return }
  if (type === 'mention' && settings?.notifMentions === false) { return }
  if (type === 'hub_invite' && settings?.notifHubActivity === false) { return }

  const [notif] = await db
    .insert(schema.notifications)
    .values({
      userId,
      type,
      title,
      body: body ?? null,
      referenceUrl: referenceUrl ?? null,
      referenceId: referenceId ?? null,
    })
    .returning()

  if (!notif) { return }

  // Push to the recipient's personal socket room
  getIO()?.to(`user:${userId}`).emit('notification:new', notif)
}
