import { db, schema } from '../db/index.js'
import { eq, and, gte, count } from 'drizzle-orm'
import { getIO } from './socket.js'
import { createNotification } from './notify.js'

export type AutomodAction = 'delete' | 'delete_warn' | 'timeout' | 'kick' | 'ban'

export interface AutomodResult {
  blocked: true
  action: AutomodAction
  ruleId: string
  ruleName: string
  reason: string
  timeoutMinutes: number
}

export interface AutomodContext {
  hubId: string
  channelId: string
  userId: string
  content: string
}

type RuleConfig = Record<string, unknown>

export async function runAutomod(ctx: AutomodContext): Promise<AutomodResult | null> {
  const settings = await db.query.hubAutomodSettings.findFirst({
    where: eq(schema.hubAutomodSettings.hubId, ctx.hubId),
  })
  if (!settings?.enabled) { return null }

  const rules = await db.query.hubAutomodRules.findMany({
    where: and(
      eq(schema.hubAutomodRules.hubId, ctx.hubId),
      eq(schema.hubAutomodRules.enabled, true),
    ),
  })
  if (rules.length === 0) { return null }

  const memberRoleRows = await db.query.memberRoles.findMany({
    where: and(
      eq(schema.memberRoles.userId, ctx.userId),
      eq(schema.memberRoles.hubId, ctx.hubId),
    ),
    columns: { roleId: true },
  })
  const memberRoleIds = memberRoleRows.map((mr) => mr.roleId)

  for (const rule of rules) {
    const exemptRoles = (rule.exemptRoleIds as string[]) ?? []
    const exemptChannels = (rule.exemptChannelIds as string[]) ?? []
    if (exemptChannels.includes(ctx.channelId)) { continue }
    if (memberRoleIds.some((id) => exemptRoles.includes(id))) { continue }

    const config = (rule.config as RuleConfig) ?? {}
    let triggered = false
    let reason = ''

    switch (rule.type) {
      case 'blocked_words': {
        const words = (config.words as string[]) ?? []
        const useRegex = (config.use_regex as boolean) ?? false
        for (const word of words) {
          try {
            const pattern = useRegex
              ? word
              : word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
            const regex = new RegExp(pattern, 'gi')
            if (regex.test(ctx.content)) {
              triggered = true
              reason = `Message contains a blocked word or phrase`
              break
            }
          } catch {
            // Invalid regex pattern — skip
          }
        }
        break
      }

      case 'spam': {
        const maxMessages = (config.max_messages as number) ?? 5
        const intervalSeconds = (config.interval_seconds as number) ?? 5
        const since = new Date(Date.now() - intervalSeconds * 1000)
        const [row] = await db
          .select({ cnt: count() })
          .from(schema.messages)
          .where(
            and(
              eq(schema.messages.channelId, ctx.channelId),
              eq(schema.messages.authorId, ctx.userId),
              gte(schema.messages.createdAt, since),
            ),
          )
        const recentCount = Number(row?.cnt ?? 0)
        if (recentCount >= maxMessages) {
          triggered = true
          reason = `Sending messages too fast (${recentCount + 1}/${maxMessages} in ${intervalSeconds}s)`
        }
        break
      }

      case 'mention_spam': {
        const maxMentions = (config.max_mentions as number) ?? 5
        const mentionMatches = ctx.content.match(/@[a-zA-Z0-9_]+/g) ?? []
        const uniqueMentions = new Set(mentionMatches).size
        if (uniqueMentions > maxMentions) {
          triggered = true
          reason = `Too many mentions in one message (${uniqueMentions}/${maxMentions})`
        }
        break
      }

      case 'link_filter': {
        const mode = (config.mode as string) ?? 'block_all'
        const domains = (config.domains as string[]) ?? []
        const urlRegex = /https?:\/\/[^\s]+/gi
        const urls = ctx.content.match(urlRegex) ?? []
        if (urls.length > 0) {
          if (mode === 'block_all') {
            triggered = true
            reason = `Links are not allowed in this server`
          } else if (mode === 'block_list') {
            for (const url of urls) {
              try {
                const hostname = new URL(url).hostname.replace(/^www\./, '')
                if (domains.some((d) => hostname === d || hostname.endsWith(`.${d}`))) {
                  triggered = true
                  reason = `Message contains a link to a blocked domain (${hostname})`
                  break
                }
              } catch { /* malformed URL */ }
            }
          } else if (mode === 'allow_list' && domains.length > 0) {
            for (const url of urls) {
              try {
                const hostname = new URL(url).hostname.replace(/^www\./, '')
                const isAllowed = domains.some((d) => hostname === d || hostname.endsWith(`.${d}`))
                if (!isAllowed) {
                  triggered = true
                  reason = `Links to non-approved domains are not allowed`
                  break
                }
              } catch {
                triggered = true
                reason = `Message contains an unrecognized link`
                break
              }
            }
          }
        }
        break
      }

      case 'mass_caps': {
        const minLength = (config.min_length as number) ?? 10
        const percent = (config.percent as number) ?? 70
        const letters = ctx.content.replace(/[^a-zA-Z]/g, '')
        if (letters.length >= minLength) {
          const capsCount = (letters.match(/[A-Z]/g) ?? []).length
          const capsPercent = (capsCount / letters.length) * 100
          if (capsPercent >= percent) {
            triggered = true
            reason = `Message is ${Math.round(capsPercent)}% capital letters (limit: ${percent}%)`
          }
        }
        break
      }

      case 'duplicate': {
        const timeframeSec = (config.timeframe_seconds as number) ?? 30
        const maxDuplicates = (config.max_duplicates as number) ?? 3
        const since = new Date(Date.now() - timeframeSec * 1000)
        const recentMessages = await db.query.messages.findMany({
          where: and(
            eq(schema.messages.channelId, ctx.channelId),
            eq(schema.messages.authorId, ctx.userId),
            gte(schema.messages.createdAt, since),
          ),
          columns: { content: true },
          limit: 30,
        })
        const dupeCount = recentMessages.filter(
          (m) => m.content?.trim().toLowerCase() === ctx.content.trim().toLowerCase(),
        ).length
        if (dupeCount >= maxDuplicates) {
          triggered = true
          reason = `Duplicate message sent too many times (${dupeCount + 1} times in ${timeframeSec}s)`
        }
        break
      }

      case 'new_account': {
        const minAgeDays = (config.min_age_days as number) ?? 7
        const user = await db.query.users.findFirst({
          where: eq(schema.users.id, ctx.userId),
          columns: { createdAt: true },
        })
        if (user) {
          const ageDays = (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24)
          if (ageDays < minAgeDays) {
            triggered = true
            reason = `Account is too new to send messages here (${Math.floor(ageDays)}d old, min: ${minAgeDays}d)`
          }
        }
        break
      }
    }

    if (triggered) {
      return {
        blocked: true,
        action: rule.action as AutomodAction,
        ruleId: rule.id,
        ruleName: rule.name,
        reason,
        timeoutMinutes: rule.timeoutMinutes,
      }
    }
  }

  return null
}

export async function executeAutomodAction(params: {
  hubId: string
  channelId: string
  userId: string
  result: AutomodResult
  logChannelId?: string | null
}): Promise<void> {
  const { hubId, channelId, userId, result, logChannelId } = params

  // Log to mod_actions
  await db.insert(schema.modActions).values({
    hubId,
    actorId: null,
    targetId: userId,
    action: `automod_${result.action}`,
    reason: `[${result.ruleName}] ${result.reason}`,
    metadata: { ruleId: result.ruleId, ruleName: result.ruleName, channelId },
  })

  // Execute the action against the member
  if (result.action === 'delete_warn') {
    await createNotification({
      userId,
      type: 'system',
      title: 'AutoMod Warning',
      body: `Your message was removed: ${result.reason}`,
    })
  } else if (result.action === 'timeout') {
    const expiresAt = new Date(Date.now() + result.timeoutMinutes * 60 * 1000)
    await db.insert(schema.memberTimeouts).values({
      hubId,
      userId,
      expiresAt,
      reason: `[AutoMod] ${result.reason}`,
    })
    await createNotification({
      userId,
      type: 'system',
      title: 'You have been timed out',
      body: `Reason: ${result.reason} (${result.timeoutMinutes} minutes)`,
    })
  } else if (result.action === 'kick') {
    await db.delete(schema.hubMembers).where(
      and(eq(schema.hubMembers.hubId, hubId), eq(schema.hubMembers.userId, userId)),
    )
    getIO()?.to(`user:${userId}`).emit('hub:kicked', { hubId, reason: result.reason })
  } else if (result.action === 'ban') {
    await db
      .insert(schema.hubBans)
      .values({ hubId, userId, reason: `[AutoMod] ${result.reason}`, bannedBy: null })
      .onConflictDoNothing()
    await db.delete(schema.hubMembers).where(
      and(eq(schema.hubMembers.hubId, hubId), eq(schema.hubMembers.userId, userId)),
    )
    getIO()?.to(`user:${userId}`).emit('hub:banned', { hubId, reason: result.reason })
  }

  // Send log message to configured log channel
  if (logChannelId) {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: { username: true, displayName: true },
    })
    const userName = user?.displayName ?? user?.username ?? 'Unknown'
    const actionLabel: Record<string, string> = {
      delete: 'Deleted message',
      delete_warn: 'Deleted message + warned user',
      timeout: `Timed out for ${result.timeoutMinutes}min`,
      kick: 'Kicked from server',
      ban: 'Banned from server',
    }
    const logContent = `[AutoMod] Rule **${result.ruleName}** triggered for **${userName}** — ${result.reason} | Action: ${actionLabel[result.action] ?? result.action}`

    const [logMsg] = await db
      .insert(schema.messages)
      .values({ channelId: logChannelId, authorId: null, content: logContent })
      .returning()

    if (logMsg) {
      getIO()?.to(`channel:${logChannelId}`).emit('message:new', {
        ...logMsg,
        createdAt: logMsg.createdAt.toISOString(),
        attachments: [],
        reactions: [],
        author: null,
      })
    }
  }
}
