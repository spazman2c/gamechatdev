import { relations } from 'drizzle-orm'
import {
  users,
  refreshTokens,
  emailVerifications,
  passwordResets,
} from './schema/users'
import {
  userNotes,
  friendships,
  userIgnores,
  userBlocks,
} from './schema/social'
import {
  hubs,
  hubMembers,
  zones,
  invites,
  hubBans,
} from './schema/hubs'
import {
  channels,
  roles,
  memberRoles,
  channelPermissionOverrides,
} from './schema/channels'
import {
  messages,
  messageAttachments,
  reactions,
  dmConversations,
  dmParticipants,
  dmMessages,
} from './schema/messages'
import {
  modActions,
  memberTimeouts,
  channelSummaries,
  wordFilters,
} from './schema/moderation'

// ── Users ──────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  refreshTokens: many(refreshTokens),
  hubMembers: many(hubMembers),
  messages: many(messages),
  dmMessages: many(dmMessages),
  dmParticipants: many(dmParticipants),
  memberRoles: many(memberRoles),
  reactions: many(reactions),
  notesMade: many(userNotes, { relationName: 'notesMade' }),
  notesReceived: many(userNotes, { relationName: 'notesReceived' }),
  friendshipsInitiated: many(friendships, { relationName: 'friendshipsInitiated' }),
  friendshipsReceived: many(friendships, { relationName: 'friendshipsReceived' }),
  ignoring: many(userIgnores, { relationName: 'ignoring' }),
  ignoredBy: many(userIgnores, { relationName: 'ignoredBy' }),
  blocking: many(userBlocks, { relationName: 'blocking' }),
  blockedBy: many(userBlocks, { relationName: 'blockedBy' }),
}))

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}))

// ── Hubs ───────────────────────────────────────────────────────────────
export const hubsRelations = relations(hubs, ({ one, many }) => ({
  owner: one(users, { fields: [hubs.ownerId], references: [users.id] }),
  members: many(hubMembers),
  zones: many(zones),
  channels: many(channels),
  roles: many(roles),
  invites: many(invites),
  bans: many(hubBans),
  modActions: many(modActions),
}))

export const hubMembersRelations = relations(hubMembers, ({ one }) => ({
  hub: one(hubs, { fields: [hubMembers.hubId], references: [hubs.id] }),
  user: one(users, { fields: [hubMembers.userId], references: [users.id] }),
}))

export const zonesRelations = relations(zones, ({ one, many }) => ({
  hub: one(hubs, { fields: [zones.hubId], references: [hubs.id] }),
  channels: many(channels),
}))

export const invitesRelations = relations(invites, ({ one }) => ({
  hub: one(hubs, { fields: [invites.hubId], references: [hubs.id] }),
  creator: one(users, { fields: [invites.createdBy], references: [users.id] }),
}))

export const hubBansRelations = relations(hubBans, ({ one }) => ({
  hub: one(hubs, { fields: [hubBans.hubId], references: [hubs.id] }),
  user: one(users, { fields: [hubBans.userId], references: [users.id] }),
  bannedBy: one(users, { fields: [hubBans.bannedBy], references: [users.id] }),
}))

// ── Channels ───────────────────────────────────────────────────────────
export const channelsRelations = relations(channels, ({ one, many }) => ({
  hub: one(hubs, { fields: [channels.hubId], references: [hubs.id] }),
  zone: one(zones, { fields: [channels.zoneId], references: [zones.id] }),
  messages: many(messages),
  permissionOverrides: many(channelPermissionOverrides),
}))

export const rolesRelations = relations(roles, ({ one, many }) => ({
  hub: one(hubs, { fields: [roles.hubId], references: [hubs.id] }),
  memberRoles: many(memberRoles),
}))

export const memberRolesRelations = relations(memberRoles, ({ one }) => ({
  hub: one(hubs, { fields: [memberRoles.hubId], references: [hubs.id] }),
  user: one(users, { fields: [memberRoles.userId], references: [users.id] }),
  role: one(roles, { fields: [memberRoles.roleId], references: [roles.id] }),
}))

export const channelPermissionOverridesRelations = relations(channelPermissionOverrides, ({ one }) => ({
  channel: one(channels, { fields: [channelPermissionOverrides.channelId], references: [channels.id] }),
  // targetId is polymorphic (role or user) — no single Drizzle relation
}))

// ── Messages ───────────────────────────────────────────────────────────
export const messagesRelations = relations(messages, ({ one, many }) => ({
  channel: one(channels, { fields: [messages.channelId], references: [channels.id] }),
  author: one(users, { fields: [messages.authorId], references: [users.id] }),
  replyTo: one(messages, { fields: [messages.replyToId], references: [messages.id] }),
  attachments: many(messageAttachments),
  reactions: many(reactions),
}))

export const messageAttachmentsRelations = relations(messageAttachments, ({ one }) => ({
  message: one(messages, { fields: [messageAttachments.messageId], references: [messages.id] }),
}))

export const reactionsRelations = relations(reactions, ({ one }) => ({
  message: one(messages, { fields: [reactions.messageId], references: [messages.id] }),
  user: one(users, { fields: [reactions.userId], references: [users.id] }),
}))

// ── DMs ────────────────────────────────────────────────────────────────
export const dmConversationsRelations = relations(dmConversations, ({ many }) => ({
  participants: many(dmParticipants),
  messages: many(dmMessages),
}))

export const dmParticipantsRelations = relations(dmParticipants, ({ one }) => ({
  conversation: one(dmConversations, {
    fields: [dmParticipants.conversationId],
    references: [dmConversations.id],
  }),
  user: one(users, { fields: [dmParticipants.userId], references: [users.id] }),
}))

export const dmMessagesRelations = relations(dmMessages, ({ one }) => ({
  conversation: one(dmConversations, {
    fields: [dmMessages.conversationId],
    references: [dmConversations.id],
  }),
  author: one(users, { fields: [dmMessages.authorId], references: [users.id] }),
  replyTo: one(dmMessages, { fields: [dmMessages.replyToId], references: [dmMessages.id] }),
}))

// ── Moderation ─────────────────────────────────────────────────────────
export const modActionsRelations = relations(modActions, ({ one }) => ({
  hub: one(hubs, { fields: [modActions.hubId], references: [hubs.id] }),
  actor: one(users, { fields: [modActions.actorId], references: [users.id] }),
  target: one(users, { fields: [modActions.targetId], references: [users.id] }),
}))

export const memberTimeoutsRelations = relations(memberTimeouts, ({ one }) => ({
  hub: one(hubs, { fields: [memberTimeouts.hubId], references: [hubs.id] }),
  user: one(users, { fields: [memberTimeouts.userId], references: [users.id] }),
}))

export const channelSummariesRelations = relations(channelSummaries, ({ one }) => ({
  channel: one(channels, { fields: [channelSummaries.channelId], references: [channels.id] }),
}))

export const wordFiltersRelations = relations(wordFilters, ({ one }) => ({
  hub: one(hubs, { fields: [wordFilters.hubId], references: [hubs.id] }),
}))

// ── Social ─────────────────────────────────────────────────────────────
export const userNotesRelations = relations(userNotes, ({ one }) => ({
  user: one(users, {
    fields: [userNotes.userId],
    references: [users.id],
    relationName: 'notesMade',
  }),
  target: one(users, {
    fields: [userNotes.targetId],
    references: [users.id],
    relationName: 'notesReceived',
  }),
}))

export const friendshipsRelations = relations(friendships, ({ one }) => ({
  requester: one(users, {
    fields: [friendships.requesterId],
    references: [users.id],
    relationName: 'friendshipsInitiated',
  }),
  addressee: one(users, {
    fields: [friendships.addresseeId],
    references: [users.id],
    relationName: 'friendshipsReceived',
  }),
}))

export const userIgnoresRelations = relations(userIgnores, ({ one }) => ({
  user: one(users, {
    fields: [userIgnores.userId],
    references: [users.id],
    relationName: 'ignoring',
  }),
  ignored: one(users, {
    fields: [userIgnores.ignoredId],
    references: [users.id],
    relationName: 'ignoredBy',
  }),
}))

export const userBlocksRelations = relations(userBlocks, ({ one }) => ({
  user: one(users, {
    fields: [userBlocks.userId],
    references: [users.id],
    relationName: 'blocking',
  }),
  blocked: one(users, {
    fields: [userBlocks.blockedId],
    references: [users.id],
    relationName: 'blockedBy',
  }),
}))
