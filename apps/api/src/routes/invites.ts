import type { FastifyInstance } from 'fastify'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { CreateInviteSchema } from '@nexora/schemas'

const EXPIRY_MS: Record<string, number> = {
  '30m':   30 * 60 * 1000,
  '1h':    60 * 60 * 1000,
  '6h':    6 * 60 * 60 * 1000,
  '12h':   12 * 60 * 60 * 1000,
  '1d':    24 * 60 * 60 * 1000,
  '7d':    7 * 24 * 60 * 60 * 1000,
  'never': 0,
}

export async function inviteRoutes(app: FastifyInstance) {
  // GET /api/invites/:code — preview invite info (public)
  app.get('/:code', async (req) => {
    const { code } = req.params as { code: string }
    if (code === 'join') { throw Errors.INVITE_INVALID() } // guard against route collision

    const invite = await db.query.invites.findFirst({
      where: eq(schema.invites.code, code),
      with: { hub: true },
    })

    if (!invite) { throw Errors.INVITE_INVALID() }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw Errors.INVITE_INVALID()
    }
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw Errors.INVITE_MAXED()
    }

    return {
      code: invite.code,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      uses: invite.uses,
      temporary: invite.temporary,
      hub: {
        id: invite.hub.id,
        name: invite.hub.name,
        iconUrl: invite.hub.iconUrl,
        memberCount: invite.hub.memberCount,
        atmosphere: invite.hub.atmosphere,
      },
    }
  })

  // POST /api/invites/:code/join — join hub via invite
  app.post('/:code/join', { preHandler: requireAuth }, async (req, reply) => {
    const { code } = req.params as { code: string }

    const invite = await db.query.invites.findFirst({
      where: eq(schema.invites.code, code),
      with: { hub: true },
    })

    if (!invite) { throw Errors.INVITE_INVALID() }
    if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
      throw Errors.INVITE_INVALID()
    }
    if (invite.maxUses !== null && invite.uses >= invite.maxUses) {
      throw Errors.INVITE_MAXED()
    }

    const ban = await db.query.hubBans.findFirst({
      where: and(
        eq(schema.hubBans.hubId, invite.hubId),
        eq(schema.hubBans.userId, req.userId),
      ),
    })
    if (ban) { throw Errors.HUB_BANNED() }

    const existing = await db.query.hubMembers.findFirst({
      where: and(
        eq(schema.hubMembers.hubId, invite.hubId),
        eq(schema.hubMembers.userId, req.userId),
      ),
    })
    if (existing) { return reply.code(200).send({ hubId: invite.hubId }) }

    await Promise.all([
      db.insert(schema.hubMembers).values({ hubId: invite.hubId, userId: req.userId }),
      db.update(schema.invites).set({ uses: invite.uses + 1 }).where(eq(schema.invites.code, code)),
      db.update(schema.hubs)
        .set({ memberCount: (invite.hub?.memberCount ?? 0) + 1 })
        .where(eq(schema.hubs.id, invite.hubId)),
    ])

    return reply.code(200).send({ hubId: invite.hubId })
  })

  // POST /api/invites — create an invite
  app.post('/', { preHandler: requireAuth }, async (req, reply) => {
    const { hubId } = req.body as { hubId?: string }
    if (!hubId) { throw Errors.VALIDATION_ERROR({ hubId: 'hubId is required' }) }

    // Must be a member
    const member = await db.query.hubMembers.findFirst({
      where: and(
        eq(schema.hubMembers.hubId, hubId),
        eq(schema.hubMembers.userId, req.userId),
      ),
    })
    if (!member) { throw Errors.FORBIDDEN() }

    const body = CreateInviteSchema.parse(req.body)

    const expiresAt =
      body.expiresIn === 'never'
        ? null
        : new Date(Date.now() + (EXPIRY_MS[body.expiresIn] ?? 0))

    const code = nanoid(8).toLowerCase()

    const [invite] = await db
      .insert(schema.invites)
      .values({
        code,
        hubId,
        createdBy: req.userId,
        maxUses: body.maxUses ?? null,
        expiresAt,
        temporary: body.temporary ?? false,
      })
      .returning()

    return reply.code(201).send(invite)
  })

  // GET /api/invites/hub/:hubId — list invites for a hub (owner only)
  app.get('/hub/:hubId', { preHandler: requireAuth }, async (req) => {
    const { hubId } = req.params as { hubId: string }

    const hub = await db.query.hubs.findFirst({ where: eq(schema.hubs.id, hubId) })
    if (!hub) { throw Errors.HUB_NOT_FOUND() }
    if (hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    const invites = await db.query.invites.findMany({
      where: eq(schema.invites.hubId, hubId),
      orderBy: (t, { desc }) => desc(t.createdAt),
    })

    return { invites }
  })

  // DELETE /api/invites/:code — revoke invite (owner only)
  app.delete('/:code', { preHandler: requireAuth }, async (req, reply) => {
    const { code } = req.params as { code: string }

    const invite = await db.query.invites.findFirst({
      where: eq(schema.invites.code, code),
      with: { hub: true },
    })

    if (!invite) { throw Errors.INVITE_INVALID() }
    if (invite.hub.ownerId !== req.userId) { throw Errors.FORBIDDEN() }

    await db.delete(schema.invites).where(eq(schema.invites.code, code))

    return reply.code(204).send()
  })
}
