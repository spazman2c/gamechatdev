import type { FastifyRequest, FastifyReply } from 'fastify'
import { verifyAccessToken, extractBearerToken } from '../lib/jwt.js'
import { Errors } from '../lib/errors.js'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'

declare module 'fastify' {
  interface FastifyRequest {
    userId: string
    username: string
  }
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const token = extractBearerToken(req.headers.authorization)
  if (!token) {
    return reply.code(401).send(Errors.UNAUTHORIZED())
  }

  try {
    const payload = verifyAccessToken(token)
    req.userId = payload.sub
    req.username = payload.username
  } catch {
    return reply.code(401).send(Errors.TOKEN_INVALID())
  }
}

export async function optionalAuth(req: FastifyRequest, _reply: FastifyReply) {
  const token = extractBearerToken(req.headers.authorization)
  if (!token) { return }

  try {
    const payload = verifyAccessToken(token)
    req.userId = payload.sub
    req.username = payload.username
  } catch {
    // Silently fail — optional auth
  }
}

/** Require the authenticated user to be a member of hub in params.hubId */
export async function requireHubMember(req: FastifyRequest, reply: FastifyReply) {
  const { hubId } = req.params as { hubId?: string }
  if (!hubId || !req.userId) {
    return reply.code(403).send(Errors.NOT_HUB_MEMBER())
  }

  const member = await db.query.hubMembers.findFirst({
    where: (m, { and, eq }) => and(eq(m.hubId, hubId), eq(m.userId, req.userId)),
  })

  if (!member) {
    return reply.code(403).send(Errors.NOT_HUB_MEMBER())
  }
}
