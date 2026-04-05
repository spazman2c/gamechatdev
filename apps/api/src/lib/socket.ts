import { Server as SocketServer } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import type { Server as HttpServer } from 'http'
import { redis, redisAvailable, RedisKeys } from './redis.js'
import { verifyAccessToken } from './jwt.js'
import { db, schema } from '../db/index.js'
import { eq } from 'drizzle-orm'

// In-memory fallback for voice room participants when Redis is unavailable
const memRooms = new Map<string, Map<string, string>>()

let _io: SocketServer | null = null

export function getIO(): SocketServer | null {
  return _io
}

// Redis key for voice room participant lists
const roomKey = (channelId: string) => `voice:room:${channelId}`

export function createSocketServer(httpServer: HttpServer) {
  const pubClient = redis
  const subClient = redis.duplicate()

  const io = new SocketServer(httpServer, {
    cors: {
      origin: process.env['CORS_ORIGIN']?.split(',') ?? ['http://localhost:3000'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  _io = io

  if (redisAvailable) {
    io.adapter(createAdapter(pubClient, subClient))
  }

  // ── Auth middleware ──
  io.use(async (socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined
    if (!token) { return next(new Error('Authentication required')) }

    try {
      const payload = verifyAccessToken(token)
      socket.data.userId = payload.sub
      socket.data.username = payload.username
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    const userId: string = socket.data.userId
    const username: string = socket.data.username

    // Track which voice rooms this socket is in (for cleanup on disconnect)
    const activeVoiceRooms = new Set<string>()

    // Set presence
    if (redisAvailable) {
      await redis.set(RedisKeys.presence(userId), 'online', 'EX', RedisKeys.presenceTTL)
    }

    // Heartbeat to keep presence alive
    const heartbeat = setInterval(async () => {
      if (redisAvailable) {
        await redis.expire(RedisKeys.presence(userId), RedisKeys.presenceTTL)
      }
    }, 30_000)

    // ── Text channel rooms ──
    socket.on('channel:join', ({ channelId }: { channelId: string }) => {
      socket.join(`channel:${channelId}`)
    })

    socket.on('channel:leave', ({ channelId }: { channelId: string }) => {
      socket.leave(`channel:${channelId}`)
    })

    // ── DM conversation rooms ──
    socket.on('dm:join', ({ conversationId }: { conversationId: string }) => {
      socket.join(`dm:${conversationId}`)
    })

    socket.on('dm:leave', ({ conversationId }: { conversationId: string }) => {
      socket.leave(`dm:${conversationId}`)
    })

    // ── Hub rooms (for hub-wide events such as voice participant updates) ──
    socket.on('hub:join', async ({ hubId }: { hubId: string }) => {
      socket.join(`hub:${hubId}`)

      // Send a snapshot of all current voice participants for channels in this hub
      const snapshot: Record<string, { userId: string; username: string; displayName: string | null; avatarUrl: string | null }[]> = {}

      const channelIds = redisAvailable
        ? [] // Redis path: iterate keys — skipped for now, mem-rooms covers dev
        : Array.from(memRooms.keys())

      for (const channelId of channelIds) {
        const channel = await db.query.channels.findFirst({
          where: eq(schema.channels.id, channelId),
          columns: { hubId: true },
        })
        if (!channel || channel.hubId !== hubId) { continue }

        const rawEntries = Array.from(memRooms.get(channelId)?.values() ?? [])
        if (rawEntries.length === 0) { continue }
        snapshot[channelId] = rawEntries.map((v) => JSON.parse(v as string))
      }

      socket.emit('voice:snapshot', { rooms: snapshot })
    })

    socket.on('hub:leave', ({ hubId }: { hubId: string }) => {
      socket.leave(`hub:${hubId}`)
    })

    // ── Voice room join/leave (WebRTC signaling room) ──
    socket.on('room:join', async ({ channelId }: { channelId: string }) => {
      // Look up user info for the participant list
      const user = await db.query.users.findFirst({
        where: eq(schema.users.id, userId),
        columns: { id: true, username: true, displayName: true, avatarUrl: true },
      })
      if (!user) { return }

      const participant = {
        userId: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      }

      // Store participant in Redis (or in-memory fallback)
      if (redisAvailable) {
        await redis.hset(roomKey(channelId), userId, JSON.stringify(participant))
      } else {
        if (!memRooms.has(channelId)) { memRooms.set(channelId, new Map()) }
        memRooms.get(channelId)!.set(userId, JSON.stringify(participant))
      }

      // Join the Socket.io room for signaling
      socket.join(`room:${channelId}`)
      activeVoiceRooms.add(channelId)

      // Tell the new joiner who is already in the room
      const rawEntries = redisAvailable
        ? Object.values(await redis.hgetall(roomKey(channelId)))
        : Array.from(memRooms.get(channelId)?.values() ?? [])

      const participants = rawEntries
        .map((v) => JSON.parse(v as string) as typeof participant)
        .filter((p) => p.userId !== userId)

      socket.emit('room:participants', { channelId, participants })

      // Tell everyone else that this user joined
      socket.to(`room:${channelId}`).emit('room:peer-joined', { channelId, participant })

      // Notify the hub room so sidebar voice-participant lists stay in sync
      const voiceChannel = await db.query.channels.findFirst({
        where: eq(schema.channels.id, channelId),
        columns: { hubId: true },
      })
      if (voiceChannel?.hubId) {
        io.to(`hub:${voiceChannel.hubId}`).emit('voice:user_joined', { channelId, participant })
      }
    })

    socket.on('room:leave', async ({ channelId }: { channelId: string }) => {
      await leaveVoiceRoom(channelId)
    })

    async function leaveVoiceRoom(channelId: string) {
      if (!activeVoiceRooms.has(channelId)) { return }
      activeVoiceRooms.delete(channelId)

      if (redisAvailable) {
        await redis.hdel(roomKey(channelId), userId)
        const remaining = await redis.hlen(roomKey(channelId))
        if (remaining === 0) { await redis.del(roomKey(channelId)) }
      } else {
        const room = memRooms.get(channelId)
        if (room) {
          room.delete(userId)
          if (room.size === 0) { memRooms.delete(channelId) }
        }
      }

      socket.leave(`room:${channelId}`)
      socket.to(`room:${channelId}`).emit('room:peer-left', { channelId, userId })

      // Notify the hub room so sidebar voice-participant lists stay in sync
      const voiceChannel = await db.query.channels.findFirst({
        where: eq(schema.channels.id, channelId),
        columns: { hubId: true },
      })
      if (voiceChannel?.hubId) {
        io.to(`hub:${voiceChannel.hubId}`).emit('voice:user_left', { channelId, userId })
      }
    }

    // ── WebRTC signaling relay ──
    // All signaling events are peer-to-peer relayed through the server.
    // The server never inspects SDP or ICE candidates — just forwards them.

    socket.on('webrtc:offer', ({ to, offer }: { to: string; offer: object }) => {
      io.to(`user:${to}`).emit('webrtc:offer', { from: userId, offer })
    })

    socket.on('webrtc:answer', ({ to, answer }: { to: string; answer: object }) => {
      io.to(`user:${to}`).emit('webrtc:answer', { from: userId, answer })
    })

    socket.on('webrtc:ice', ({ to, candidate }: { to: string; candidate: object }) => {
      io.to(`user:${to}`).emit('webrtc:ice', { from: userId, candidate })
    })

    // ── Typing indicators ──
    socket.on('typing:start', async ({ channelId }: { channelId: string }) => {
      if (redisAvailable) {
        await redis.setex(`${RedisKeys.typingUsers(channelId)}:${userId}`, RedisKeys.typingTTL, username)
      }
      socket.to(`channel:${channelId}`).emit('typing:update', { channelId, userId, username, typing: true })
    })

    socket.on('typing:stop', async ({ channelId }: { channelId: string }) => {
      if (redisAvailable) {
        await redis.del(`${RedisKeys.typingUsers(channelId)}:${userId}`)
      }
      socket.to(`channel:${channelId}`).emit('typing:update', { channelId, userId, username, typing: false })
    })

    // ── Presence update ──
    socket.on('presence:update', async ({ status }: { status: string }) => {
      const updates: Promise<unknown>[] = [
        db.update(schema.users).set({ presence: status }).where(eq(schema.users.id, userId)),
      ]
      if (redisAvailable) {
        updates.push(redis.set(RedisKeys.presence(userId), status, 'EX', RedisKeys.presenceTTL))
      }
      await Promise.all(updates)
      socket.broadcast.emit('presence:changed', { userId, status })
    })

    // ── Join a personal room so other sockets can target this user directly ──
    // Used for WebRTC signaling (webrtc:offer forwards to user:${userId})
    socket.join(`user:${userId}`)

    // ── Disconnect ──
    socket.on('disconnect', async () => {
      clearInterval(heartbeat)

      // Leave all voice rooms
      for (const channelId of activeVoiceRooms) {
        await leaveVoiceRoom(channelId)
      }

      // Force offline if no other sockets from this user
      const sockets = await io.fetchSockets()
      const userStillConnected = sockets.some((s) => s.data.userId === userId)
      if (!userStillConnected) {
        const updates: Promise<unknown>[] = [
          db.update(schema.users).set({ presence: 'offline' }).where(eq(schema.users.id, userId)),
        ]
        if (redisAvailable) { updates.push(redis.del(RedisKeys.presence(userId))) }
        await Promise.all(updates)
        io.emit('presence:changed', { userId, status: 'offline' })
      }
    })
  })

  return io
}

export type SocketIO = ReturnType<typeof createSocketServer>
