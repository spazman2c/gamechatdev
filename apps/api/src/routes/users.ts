import type { FastifyInstance } from 'fastify'
import { and, eq, inArray } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { UpdateProfileSchema } from '@nexora/schemas'

export async function userRoutes(app: FastifyInstance) {
  // GET /api/users/me
  app.get('/me', { preHandler: requireAuth }, async (req) => {
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId),
      columns: {
        passwordHash: false,
      },
    })
    if (!user) { throw Errors.USER_NOT_FOUND() }
    return user
  })

  // PATCH /api/users/me
  app.patch('/me', { preHandler: requireAuth }, async (req) => {
    const body = UpdateProfileSchema.parse(req.body)

    const [updated] = await db
      .update(schema.users)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(schema.users.id, req.userId))
      .returning({
        id: schema.users.id,
        username: schema.users.username,
        displayName: schema.users.displayName,
        avatarUrl: schema.users.avatarUrl,
        bio: schema.users.bio,
        presence: schema.users.presence,
        updatedAt: schema.users.updatedAt,
      })

    if (!updated) { throw Errors.USER_NOT_FOUND() }
    return updated
  })

  // GET /api/users/me/hubs — hubs the current user has joined
  app.get('/me/hubs', { preHandler: requireAuth }, async (req) => {
    const members = await db.query.hubMembers.findMany({
      where: eq(schema.hubMembers.userId, req.userId),
      with: {
        hub: {
          columns: {
            id: true,
            name: true,
            slug: true,
            iconUrl: true,
            atmosphere: true,
            memberCount: true,
            ownerId: true,
            isPublic: true,
            joinPolicy: true,
            description: true,
            bannerUrl: true,
            createdAt: true,
          },
        },
      },
    })
    const hubs = members.map((m) => m.hub).filter(Boolean)
    return { hubs }
  })

  // GET /api/users/:userId
  app.get('/:userId', { preHandler: requireAuth }, async (req) => {
    const { userId } = req.params as { userId: string }
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, userId),
      columns: {
        passwordHash: false,
        email: false,
        emailVerified: false,
      },
    })
    if (!user) { throw Errors.USER_NOT_FOUND() }

    // Compute mutual hubs (shared between requester and target)
    let mutualHubs: Array<{ id: string; name: string; iconUrl: string | null }> = []
    if (userId !== req.userId) {
      const targetHubIds = (await db
        .select({ hubId: schema.hubMembers.hubId })
        .from(schema.hubMembers)
        .where(eq(schema.hubMembers.userId, userId))
      ).map(r => r.hubId)

      if (targetHubIds.length > 0) {
        const overlap = await db
          .select({ hubId: schema.hubMembers.hubId })
          .from(schema.hubMembers)
          .where(
            and(
              eq(schema.hubMembers.userId, req.userId),
              inArray(schema.hubMembers.hubId, targetHubIds),
            ),
          )
        const mutualIds = overlap.map(r => r.hubId)
        if (mutualIds.length > 0) {
          mutualHubs = await db
            .select({ id: schema.hubs.id, name: schema.hubs.name, iconUrl: schema.hubs.iconUrl })
            .from(schema.hubs)
            .where(inArray(schema.hubs.id, mutualIds))
        }
      }
    }

    return { ...user, mutualHubs }
  })
}
