import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
  jsonb,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { hubs } from './hubs'

export const modActions = pgTable(
  'mod_actions',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
    targetId: uuid('target_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 32 }).notNull(),
    // 'kick' | 'ban' | 'unban' | 'timeout' | 'delete_message' | 'warn'
    reason: text('reason'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    hubIdx: index('mod_actions_hub_idx').on(table.hubId, table.createdAt),
    targetIdx: index('mod_actions_target_idx').on(table.targetId),
  }),
)

export const memberTimeouts = pgTable(
  'member_timeouts',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    reason: text('reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    hubUserIdx: index('timeouts_hub_user_idx').on(table.hubId, table.userId),
  }),
)

export const wordFilters = pgTable(
  'word_filters',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    word: varchar('word', { length: 100 }).notNull(),
    // If true, block entire message; if false, replace word with ***
    blockMessage: boolean('block_message').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    hubWordIdx: uniqueIndex('word_filters_hub_word_idx').on(table.hubId, table.word),
  }),
)

export const channelSummaries = pgTable(
  'channel_summaries',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    channelId: uuid('channel_id').notNull(),
    summaryText: text('summary_text').notNull(),
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    messageCount: integer('message_count'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    channelIdx: index('summaries_channel_idx').on(table.channelId, table.createdAt),
  }),
)
