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
  bigint,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users.js'
import { hubs, zones } from './hubs.js'

export const channelTypeEnum = pgEnum('channel_type', [
  'text',
  'announcement',
  'voice',
  'video',
  'stage',
])

export const roomModeEnum = pgEnum('room_mode', [
  'hangout',
  'study',
  'co_work',
  'game_squad',
  'stage_qa',
  'watch_party',
  'music_room',
  'support_room',
])

export const channels = pgTable(
  'channels',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    zoneId: uuid('zone_id').references(() => zones.id, { onDelete: 'set null' }),
    name: varchar('name', { length: 100 }).notNull(),
    type: channelTypeEnum('type').notNull().default('text'),
    topic: text('topic'),
    position: integer('position').notNull().default(0),
    isNsfw: boolean('is_nsfw').notNull().default(false),
    slowmodeDelay: integer('slowmode_delay').notNull().default(0),
    roomMode: roomModeEnum('room_mode'),
    capacity: integer('capacity'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    hubIdx: index('channels_hub_idx').on(table.hubId, table.position),
    zoneIdx: index('channels_zone_idx').on(table.zoneId),
  }),
)

export const roles = pgTable(
  'roles',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 64 }).notNull(),
    color: varchar('color', { length: 7 }),
    position: integer('position').notNull().default(0),
    isDefault: boolean('is_default').notNull().default(false),
    permissions: bigint('permissions', { mode: 'number' }).notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    hubIdx: index('roles_hub_idx').on(table.hubId, table.position),
  }),
)

export const memberRoles = pgTable(
  'member_roles',
  {
    hubId: uuid('hub_id')
      .notNull()
      .references(() => hubs.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.hubId, table.userId, table.roleId] }),
    userIdx: index('member_roles_user_idx').on(table.userId),
  }),
)

export const channelPermissionOverrides = pgTable(
  'channel_permission_overrides',
  {
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    targetId: uuid('target_id').notNull(), // role id or user id
    targetType: varchar('target_type', { length: 8 }).notNull(), // 'role' | 'user'
    allow: bigint('allow', { mode: 'number' }).notNull().default(0),
    deny: bigint('deny', { mode: 'number' }).notNull().default(0),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.channelId, table.targetId, table.targetType] }),
  }),
)
