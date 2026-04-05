import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { canDo } from '../lib/permissions.js'
import { Permissions } from '@nexora/types'

const SettingsPatchSchema = z.object({
  enabled: z.boolean().optional(),
  logChannelId: z.string().uuid().nullable().optional(),
})

const RuleCreateSchema = z.object({
  name: z.string().min(1).max(64),
  type: z.enum(['blocked_words', 'spam', 'mention_spam', 'link_filter', 'mass_caps', 'duplicate', 'new_account']),
  enabled: z.boolean().default(true),
  action: z.enum(['delete', 'delete_warn', 'timeout', 'kick', 'ban']).default('delete'),
  timeoutMinutes: z.number().int().min(1).max(10080).default(10),
  exemptRoleIds: z.array(z.string().uuid()).default([]),
  exemptChannelIds: z.array(z.string().uuid()).default([]),
  config: z.record(z.unknown()).default({}),
})

const RulePatchSchema = RuleCreateSchema.partial()

async function assertCanManageAutomod(userId: string, hubId: string) {
  const hub = await db.query.hubs.findFirst({
    where: eq(schema.hubs.id, hubId),
    columns: { ownerId: true },
  })
  if (!hub) { throw Errors.HUB_NOT_FOUND() }
  const isOwner = hub.ownerId === userId
  if (!isOwner) {
    const allowed = await canDo(userId, hubId, Permissions.MANAGE_HUB)
    if (!allowed) { throw Errors.FORBIDDEN() }
  }
}

function serializeRule(rule: {
  id: string
  hubId: string
  name: string
  type: string
  enabled: boolean
  action: string
  timeoutMinutes: number
  exemptRoleIds: string[] | null
  exemptChannelIds: string[] | null
  config: unknown
  createdAt: Date
}) {
  return {
    ...rule,
    exemptRoleIds: rule.exemptRoleIds ?? [],
    exemptChannelIds: rule.exemptChannelIds ?? [],
    createdAt: rule.createdAt.toISOString(),
  }
}

export async function automodRoutes(app: FastifyInstance) {
  // GET /api/hubs/:hubId/automod — get settings + all rules
  app.get('/:hubId/automod', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }
    await assertCanManageAutomod(req.userId, hubId)

    const [settings, rules] = await Promise.all([
      db.query.hubAutomodSettings.findFirst({
        where: eq(schema.hubAutomodSettings.hubId, hubId),
      }),
      db.query.hubAutomodRules.findMany({
        where: eq(schema.hubAutomodRules.hubId, hubId),
        orderBy: (r, { asc }) => asc(r.createdAt),
      }),
    ])

    return {
      settings: settings ?? { hubId, enabled: false, logChannelId: null },
      rules: rules.map(serializeRule),
    }
  })

  // PATCH /api/hubs/:hubId/automod — upsert master settings
  app.patch('/:hubId/automod', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }
    const body = SettingsPatchSchema.parse(req.body)
    await assertCanManageAutomod(req.userId, hubId)

    const updateData: Record<string, unknown> = {}
    if (body.enabled !== undefined) { updateData.enabled = body.enabled }
    if (body.logChannelId !== undefined) { updateData.logChannelId = body.logChannelId }

    const [result] = await db
      .insert(schema.hubAutomodSettings)
      .values({ hubId, ...updateData })
      .onConflictDoUpdate({
        target: schema.hubAutomodSettings.hubId,
        set: updateData,
      })
      .returning()

    return result
  })

  // POST /api/hubs/:hubId/automod/rules — create a rule
  app.post('/:hubId/automod/rules', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId } = req.params as { hubId: string }
    const body = RuleCreateSchema.parse(req.body)
    await assertCanManageAutomod(req.userId, hubId)

    const [rule] = await db
      .insert(schema.hubAutomodRules)
      .values({
        hubId,
        name: body.name,
        type: body.type,
        enabled: body.enabled,
        action: body.action,
        timeoutMinutes: body.timeoutMinutes,
        exemptRoleIds: body.exemptRoleIds,
        exemptChannelIds: body.exemptChannelIds,
        config: body.config,
      })
      .returning()

    return reply.code(201).send(serializeRule(rule!))
  })

  // PATCH /api/hubs/:hubId/automod/rules/:ruleId — update a rule
  app.patch('/:hubId/automod/rules/:ruleId', { preHandler: requireAuth }, async (req) => {
    const { hubId, ruleId } = req.params as { hubId: string; ruleId: string }
    const body = RulePatchSchema.parse(req.body)
    await assertCanManageAutomod(req.userId, hubId)

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) { updateData.name = body.name }
    if (body.type !== undefined) { updateData.type = body.type }
    if (body.enabled !== undefined) { updateData.enabled = body.enabled }
    if (body.action !== undefined) { updateData.action = body.action }
    if (body.timeoutMinutes !== undefined) { updateData.timeoutMinutes = body.timeoutMinutes }
    if (body.exemptRoleIds !== undefined) { updateData.exemptRoleIds = body.exemptRoleIds }
    if (body.exemptChannelIds !== undefined) { updateData.exemptChannelIds = body.exemptChannelIds }
    if (body.config !== undefined) { updateData.config = body.config }

    const [updated] = await db
      .update(schema.hubAutomodRules)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .set(updateData as any)
      .where(and(eq(schema.hubAutomodRules.id, ruleId), eq(schema.hubAutomodRules.hubId, hubId)))
      .returning()

    if (!updated) { throw Errors.NOT_FOUND('AutoMod rule') }
    return serializeRule(updated)
  })

  // DELETE /api/hubs/:hubId/automod/rules/:ruleId — delete a rule
  app.delete('/:hubId/automod/rules/:ruleId', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId, ruleId } = req.params as { hubId: string; ruleId: string }
    await assertCanManageAutomod(req.userId, hubId)

    await db.delete(schema.hubAutomodRules).where(
      and(eq(schema.hubAutomodRules.id, ruleId), eq(schema.hubAutomodRules.hubId, hubId)),
    )
    return reply.code(204).send()
  })
}
