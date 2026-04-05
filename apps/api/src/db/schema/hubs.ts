import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  integer,
  timestamp,
  index,
  primaryKey,
  pgEnum,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users.js'

export const joinPolicyEnum = pgEnum('join_policy', [
  'open',
  'invite_only',
  'email_confirmed',
  'phone_confirmed',
  'mutual_vouch',
  'waitlist',
  'age_gated',
])

export const atmosphereEnum = pgEnum('atmosphere', [
  'studio',
  'arcade',
  'lounge',
  'guild',
  'orbit',
])

export const hubs = pgTable(
  'hubs',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    slug: varchar('slug', { length: 100 }).unique(),
    description: text('description'),
    iconUrl: text('icon_url'),
    bannerUrl: text('banner_url'),
    atmosphere: atmosphereEnum('atmosphere').notNull().default('orbit'),
    isPublic: boolean('is_public').notNull().default(true),
    joinPolicy: joinPolicyEnum('join_policy').notNull().default('open'),
    memberCount: integer('member_count').notNull().default(0),
    // Extended settings
    verificationLevel: integer('verification_level').notNull().default(0),
    contentFilter: integer('content_filter').notNull().default(0),
    isCommunity: boolean('is_community').notNull().default(false),
    bannerColor: varchar('banner_color', { length: 7 }),
    systemChannelId: uuid('system_channel_id'), // soft ref to channels (no FK to avoid circular)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    slugIdx: index('hubs_slug_idx').on(table.slug),
    ownerIdx: index('hubs_owner_idx').on(table.ownerId),
    publicIdx: index('hubs_public_idx').on(table.isPublic),
  }),
)

export const hubMembers = pgTable(
  'hub_members',
  {
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().default(sql`now()`),
    nickname: varchar('nickname', { length: 32 }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.hubId, table.userId] }),
    userIdx: index('hub_members_user_idx').on(table.userId),
  }),
)

export const zones = pgTable(
  'zones',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    hubIdx: index('zones_hub_idx').on(table.hubId, table.position),
  }),
)

export const invites = pgTable(
  'invites',
  {
    code: varchar('code', { length: 12 }).primaryKey(),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    uses: integer('uses').notNull().default(0),
    maxUses: integer('max_uses'),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    temporary: boolean('temporary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    hubIdx: index('invites_hub_idx').on(table.hubId),
  }),
)

export const hubBans = pgTable(
  'hub_bans',
  {
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    reason: text('reason'),
    bannedBy: uuid('banned_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.hubId, table.userId] }),
  }),
)

export const hubEmoji = pgTable(
  'hub_emoji',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 32 }).notNull(),
    url: text('url').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    hubIdx: index('hub_emoji_hub_idx').on(table.hubId),
    nameIdx: uniqueIndex('hub_emoji_name_idx').on(table.hubId, table.name),
  }),
)

export const hubStickers = pgTable(
  'hub_stickers',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 32 }).notNull(),
    description: varchar('description', { length: 100 }),
    url: text('url').notNull(),
    createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    hubIdx: index('hub_stickers_hub_idx').on(table.hubId),
  }),
)
