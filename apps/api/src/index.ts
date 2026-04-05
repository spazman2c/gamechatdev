import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import rateLimit from '@fastify/rate-limit'
import multipart from '@fastify/multipart'
import { env } from './lib/env.js'
import { redis, redisAvailable, connectRedis } from './lib/redis.js'
import { createSocketServer } from './lib/socket.js'
import { errorHandler } from './middleware/error-handler.js'
import { authRoutes } from './routes/auth.js'
import { userRoutes } from './routes/users.js'
import { hubRoutes } from './routes/hubs.js'
import { channelRoutes } from './routes/channels.js'
import { messageRoutes } from './routes/messages.js'
import { inviteRoutes } from './routes/invites.js'
import { dmRoutes } from './routes/dms.js'
import { voiceRoutes } from './routes/voice.js'
import { roleRoutes } from './routes/roles.js'
import { moderationRoutes } from './routes/moderation.js'
import { uploadRoutes } from './routes/uploads.js'
import { socialRoutes } from './routes/social.js'
import { notificationRoutes } from './routes/notifications.js'
import { runStartupMigrations } from './db/migrate-startup.js'
import { createServer } from 'http'

const server = Fastify({
  logger: {
    level: env.NODE_ENV === 'production' ? 'info' : 'warn',
    ...(env.NODE_ENV === 'development'
      ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
      : {}),
  },
  trustProxy: true,
  ajv: {
    customOptions: { coerceTypes: true, removeAdditional: 'all' },
  },
})

async function bootstrap() {
  // ── Run startup DB migrations ──
  await runStartupMigrations()

  // ── Try Redis (non-fatal) ──
  await connectRedis()

  // ── Plugins ──
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim())
  const corsOrigin = allowedOrigins.includes('*') ? true : allowedOrigins
  console.warn('[CORS] Allowed origins:', JSON.stringify(allowedOrigins))

  await server.register(cors, {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })

  await server.register(cookie, {
    secret: env.JWT_REFRESH_SECRET,
    parseOptions: {},
  })

  await server.register(rateLimit, {
    global: true,
    max: 200,
    timeWindow: '1 minute',
    // Only pass Redis to rate limiter if it's available
    ...(redisAvailable ? { redis } : {}),
    keyGenerator: (req) => (req as { userId?: string }).userId ?? req.ip,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      code: 'RATE_LIMITED',
      message: `Too many requests. Retry after ${context.after}.`,
      retryAfter: context.after,
    }),
  })

  await server.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10 MB
      files: 10,
    },
  })

  // ── Error handler ──
  server.setErrorHandler(errorHandler)

  // ── Health check ──
  server.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    redis: redisAvailable,
    version: process.env['npm_package_version'] ?? '0.1.0',
  }))

  // ── Routes ──
  await server.register(authRoutes,       { prefix: '/api/auth' })
  await server.register(userRoutes,       { prefix: '/api/users' })
  await server.register(hubRoutes,        { prefix: '/api/hubs' })
  await server.register(channelRoutes,    { prefix: '/api/channels' })
  await server.register(messageRoutes,    { prefix: '/api/messages' })
  await server.register(inviteRoutes,     { prefix: '/api/invites' })
  await server.register(dmRoutes,         { prefix: '/api/dms' })
  await server.register(voiceRoutes,      { prefix: '/api/voice' })
  await server.register(roleRoutes,       { prefix: '/api/hubs' })
  await server.register(moderationRoutes, { prefix: '/api/hubs' })
  await server.register(uploadRoutes,     { prefix: '/api/uploads' })
  await server.register(socialRoutes,          { prefix: '/api/social' })
  await server.register(notificationRoutes,    { prefix: '/api/notifications' })

  // ── 404 handler ──
  server.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ statusCode: 404, code: 'NOT_FOUND', message: 'Route not found' })
  })

  // ── Socket.io (attach to same HTTP server as Fastify) ──
  await server.ready()
  createSocketServer(server.server)

  // ── Start ──
  await server.listen({ port: env.PORT, host: '0.0.0.0' })
  console.warn(`[Nexora API] Listening on port ${env.PORT} (${env.NODE_ENV})`)
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err instanceof Error ? err.stack : err)
  process.exit(1)
})

// Graceful shutdown
const shutdown = async () => {
  await server.close()
  if (redisAvailable) { await redis.quit() }
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
