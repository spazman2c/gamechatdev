import ioredis from 'ioredis'
import { env } from './env.js'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Redis = (ioredis as any).default ?? ioredis

export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: 1,
  lazyConnect: true,
  enableReadyCheck: false,
  retryStrategy: () => null, // don't retry — fail fast in dev
})

export let redisAvailable = false

redis.on('error', () => {
  // Silently swallow — we handle unavailability at startup
})

redis.on('connect', () => {
  redisAvailable = true
  console.warn('[Redis] Connected')
})

export async function connectRedis(): Promise<boolean> {
  try {
    await redis.connect()
    await redis.ping()
    redisAvailable = true
    return true
  } catch {
    console.warn('[Redis] Not available — running without Redis (in-memory fallbacks active)')
    redisAvailable = false
    return false
  }
}

// Key helpers
export const RedisKeys = {
  presence: (userId: string) => `presence:${userId}`,
  presenceTTL: 65,

  refreshToken: (tokenId: string) => `rt:${tokenId}`,

  emailVerify: (token: string) => `ev:${token}`,
  emailVerifyTTL: 60 * 60 * 24, // 24h

  passwordReset: (token: string) => `pr:${token}`,
  passwordResetTTL: 60 * 60 * 2, // 2h

  rateLimit: (key: string) => `rl:${key}`,

  typingUsers: (channelId: string) => `typing:${channelId}`,
  typingTTL: 8,
}
