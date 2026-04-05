import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users.js'

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    // dm_message | mention | friend_request | hub_invite | system
    type: varchar('type', { length: 32 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body'),
    referenceUrl: text('reference_url'),
    referenceId: varchar('reference_id', { length: 64 }),
    read: boolean('read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    userIdx: index('notifications_user_idx').on(table.userId),
    userCreatedIdx: index('notifications_user_created_idx').on(table.userId, table.createdAt),
  }),
)

export const userNotificationSettings = pgTable('user_notification_settings', {
  userId: uuid('user_id').primaryKey().references(() => users.id, { onDelete: 'cascade' }),
  notifDms: boolean('notif_dms').notNull().default(true),
  notifMentions: boolean('notif_mentions').notNull().default(true),
  notifHubActivity: boolean('notif_hub_activity').notNull().default(false),
  notifSounds: boolean('notif_sounds').notNull().default(true),
  notifDesktop: boolean('notif_desktop').notNull().default(false),
})
