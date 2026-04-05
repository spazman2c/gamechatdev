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
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './users'
import { channels } from './channels'

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    channelId: uuid('channel_id')
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    content: text('content'),
    replyToId: uuid('reply_to_id'), // self-ref, added via alter post-create
    isPinned: boolean('is_pinned').notNull().default(false),
    isEdited: boolean('is_edited').notNull().default(false),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    channelCreatedIdx: index('messages_channel_created_idx').on(
      table.channelId,
      table.createdAt,
    ),
    authorIdx: index('messages_author_idx').on(table.authorId),
    pinnedIdx: index('messages_pinned_idx').on(table.channelId, table.isPinned),
  }),
)

export const messageAttachments = pgTable('message_attachments', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  messageId: uuid('message_id')
    .notNull()
    .references(() => messages.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  filename: text('filename'),
  contentType: text('content_type'),
  sizeBytes: integer('size_bytes'),
  width: integer('width'),
  height: integer('height'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
})

export const reactions = pgTable(
  'reactions',
  {
    messageId: uuid('message_id')
      .notNull()
      .references(() => messages.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    emoji: varchar('emoji', { length: 32 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.messageId, table.userId, table.emoji] }),
    messageIdx: index('reactions_message_idx').on(table.messageId),
  }),
)

export const dmMessages = pgTable(
  'dm_messages',
  {
    id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => dmConversations.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id').references(() => users.id, { onDelete: 'set null' }),
    content: text('content'),
    replyToId: uuid('reply_to_id'),
    isEdited: boolean('is_edited').notNull().default(false),
    editedAt: timestamp('edited_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => ({
    convCreatedIdx: index('dm_messages_conv_created_idx').on(table.conversationId, table.createdAt),
    authorIdx: index('dm_messages_author_idx').on(table.authorId),
  }),
)

export const dmConversations = pgTable('dm_conversations', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  isGroup: boolean('is_group').notNull().default(false),
  name: varchar('name', { length: 100 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
})

export const dmParticipants = pgTable(
  'dm_participants',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => dmConversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().default(sql`now()`),
    lastReadAt: timestamp('last_read_at', { withTimezone: true }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.conversationId, table.userId] }),
    userIdx: index('dm_participants_user_idx').on(table.userId),
  }),
)
