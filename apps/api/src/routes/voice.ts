import type { FastifyInstance } from 'fastify'

interface IceServer {
  urls: string | string[]
  username?: string
  credential?: string
}
import { eq, and } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { requireAuth } from '../middleware/auth.js'
import { Errors } from '../lib/errors.js'
import { env } from '../lib/env.js'

export async function voiceRoutes(app: FastifyInstance) {
  // GET /api/voice/ice-config — return ICE server configuration
  // Client calls this before creating RTCPeerConnection
  app.get('/ice-config', { preHandler: requireAuth }, async () => {
    const iceServers: IceServer[] = [
      // Public Google STUN — works for most NAT scenarios
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]

    // If a TURN server is configured, include it
    if (env.TURN_URL && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
      iceServers.push({
        urls: env.TURN_URL,
        username: env.TURN_USERNAME,
        credential: env.TURN_CREDENTIAL,
      })
    }

    return { iceServers }
  })

  // POST /api/voice/join — verify hub membership before allowing voice join
  app.post('/join', { preHandler: requireAuth }, async (req, reply) => {
    const { channelId } = req.body as { channelId?: string }
    if (!channelId) { throw Errors.VALIDATION_ERROR({ channelId: 'channelId is required' }) }

    const channel = await db.query.channels.findFirst({
      where: eq(schema.channels.id, channelId),
    })
    if (!channel) { throw Errors.CHANNEL_NOT_FOUND() }
    if (channel.type !== 'voice' && channel.type !== 'video' && channel.type !== 'stage') {
      throw Errors.WRONG_CHANNEL_TYPE()
    }

    // Verify hub membership
    const member = await db.query.hubMembers.findFirst({
      where: and(
        eq(schema.hubMembers.hubId, channel.hubId),
        eq(schema.hubMembers.userId, req.userId),
      ),
    })
    if (!member) { throw Errors.NOT_HUB_MEMBER() }

    // Return ICE config + confirmation — actual room join happens via Socket.io
    const iceServers: IceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ]

    if (env.TURN_URL && env.TURN_USERNAME && env.TURN_CREDENTIAL) {
      iceServers.push({
        urls: env.TURN_URL,
        username: env.TURN_USERNAME,
        credential: env.TURN_CREDENTIAL,
      })
    }

    return reply.send({ channelId, iceServers })
  })
}
