import type { FastifyInstance } from 'fastify'
import { createHash } from 'crypto'
import bcrypt from 'bcryptjs'
const { hash, compare } = bcrypt
import { nanoid } from 'nanoid'
import { eq, and, lt } from 'drizzle-orm'
import { db, schema } from '../db/index.js'
import { env } from '../lib/env.js'
import { redis, RedisKeys } from '../lib/redis.js'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../lib/jwt.js'
import { Errors } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import {
  RegisterSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from '@nexora/schemas'
import { sendPasswordResetEmail } from '../services/email.js'

const REFRESH_COOKIE = 'nx_refresh'
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
}

export async function authRoutes(app: FastifyInstance) {
  // POST /api/auth/register
  app.post('/register', {
    config: { rateLimit: { max: 5, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const body = RegisterSchema.parse(req.body)

    // Check uniqueness
    const [existingEmail, existingUsername] = await Promise.all([
      db.query.users.findFirst({ where: eq(schema.users.email, body.email) }),
      db.query.users.findFirst({ where: eq(schema.users.username, body.username) }),
    ])
    if (existingEmail) { throw Errors.EMAIL_TAKEN() }
    if (existingUsername) { throw Errors.USERNAME_TAKEN() }

    const passwordHash = await hash(body.password, 12)
    const [user] = await db
      .insert(schema.users)
      .values({
        username: body.username,
        email: body.email,
        passwordHash,
        displayName: body.displayName ?? body.username,
        emailVerified: true,
      })
      .returning()

    if (!user) { throw Errors.INTERNAL() }

    return reply.code(201).send({
      message: 'Account created successfully.',
      userId: user.id,
    })
  })

  // POST /api/auth/verify-email
  app.post('/verify-email', async (req, reply) => {
    const { token } = req.body as { token?: string }
    if (!token) { throw Errors.TOKEN_INVALID() }

    const verification = await db.query.emailVerifications.findFirst({
      where: eq(schema.emailVerifications.token, token),
    })

    if (!verification || new Date(verification.expiresAt) < new Date()) {
      throw Errors.TOKEN_EXPIRED()
    }

    await Promise.all([
      db
        .update(schema.users)
        .set({ emailVerified: true })
        .where(eq(schema.users.id, verification.userId)),
      db
        .delete(schema.emailVerifications)
        .where(eq(schema.emailVerifications.token, token)),
    ])

    return reply.send({ message: 'Email verified successfully.' })
  })

  // POST /api/auth/login
  app.post('/login', {
    config: { rateLimit: { max: 10, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const body = LoginSchema.parse(req.body)

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, body.email),
    })

    if (!user) { throw Errors.INVALID_CREDENTIALS() }

    const passwordMatch = await compare(body.password, user.passwordHash)
    if (!passwordMatch) { throw Errors.INVALID_CREDENTIALS() }


    const jti = nanoid(21)
    const accessToken = signAccessToken({ sub: user.id, username: user.username })
    const refreshToken = signRefreshToken({ sub: user.id, jti })

    // Store hashed refresh token
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
    await db.insert(schema.refreshTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    reply.setCookie(REFRESH_COOKIE, refreshToken, COOKIE_OPTIONS)

    return reply.send({
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        presence: user.presence,
      },
    })
  })

  // POST /api/auth/refresh
  app.post('/refresh', async (req, reply) => {
    const refreshToken = req.cookies[REFRESH_COOKIE]
    if (!refreshToken) { throw Errors.TOKEN_INVALID() }

    let payload
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      throw Errors.TOKEN_EXPIRED()
    }

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
    const storedToken = await db.query.refreshTokens.findFirst({
      where: and(
        eq(schema.refreshTokens.userId, payload.sub),
        eq(schema.refreshTokens.tokenHash, tokenHash),
      ),
    })

    if (!storedToken) { throw Errors.TOKEN_INVALID() }

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, payload.sub),
    })
    if (!user) { throw Errors.USER_NOT_FOUND() }

    const newJti = nanoid(21)
    const newAccessToken = signAccessToken({ sub: user.id, username: user.username })
    const newRefreshToken = signRefreshToken({ sub: user.id, jti: newJti })
    const newTokenHash = createHash('sha256').update(newRefreshToken).digest('hex')

    // Issue new token first, THEN delete old one.
    // This prevents the race where two simultaneous refreshes cause one to fail
    // because the first rotation already deleted the shared old token.
    await db.insert(schema.refreshTokens).values({
      userId: user.id,
      tokenHash: newTokenHash,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })
    await db.delete(schema.refreshTokens).where(
      eq(schema.refreshTokens.id, storedToken.id),
    )

    // Prune any other expired tokens for this user (housekeeping, non-fatal)
    db.delete(schema.refreshTokens).where(
      and(
        eq(schema.refreshTokens.userId, user.id),
        lt(schema.refreshTokens.expiresAt, new Date()),
      ),
    ).catch(() => {/* ignore */})

    reply.setCookie(REFRESH_COOKIE, newRefreshToken, COOKIE_OPTIONS)

    // Return user data so the client never relies on potentially stale cached user
    return reply.send({
      accessToken: newAccessToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        presence: user.presence,
      },
    })
  })

  // POST /api/auth/logout
  app.post('/logout', { preHandler: requireAuth }, async (req, reply) => {
    const refreshToken = req.cookies[REFRESH_COOKIE]
    if (refreshToken) {
      const tokenHash = createHash('sha256').update(refreshToken).digest('hex')
      await db.delete(schema.refreshTokens).where(
        eq(schema.refreshTokens.tokenHash, tokenHash),
      )
    }
    reply.clearCookie(REFRESH_COOKIE, { path: '/' })
    return reply.send({ message: 'Logged out.' })
  })

  // POST /api/auth/forgot-password
  app.post('/forgot-password', {
    config: { rateLimit: { max: 3, timeWindow: '15 minutes' } },
  }, async (req, reply) => {
    const body = ForgotPasswordSchema.parse(req.body)

    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, body.email),
    })

    // Always return success to prevent email enumeration
    if (user) {
      const resetToken = nanoid(40)
      await db.insert(schema.passwordResets).values({
        userId: user.id,
        token: resetToken,
        expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000),
      })
      try {
        await sendPasswordResetEmail(user.email, user.displayName ?? user.username, resetToken)
      } catch (emailErr) {
        console.warn('[Auth] Failed to send password reset email:', emailErr instanceof Error ? emailErr.message : emailErr)
      }
    }

    return reply.send({
      message: 'If an account with that email exists, a reset link has been sent.',
    })
  })

  // POST /api/auth/reset-password
  app.post('/reset-password', async (req, reply) => {
    const body = ResetPasswordSchema.parse(req.body)

    const reset = await db.query.passwordResets.findFirst({
      where: and(
        eq(schema.passwordResets.token, body.token),
        // eslint-disable-next-line no-console -- using eq, not console
        eq(schema.passwordResets.usedAt, null as unknown as Date),
      ),
    })

    if (!reset || new Date(reset.expiresAt) < new Date()) {
      throw Errors.TOKEN_EXPIRED()
    }

    const passwordHash = await hash(body.password, 12)

    await Promise.all([
      db
        .update(schema.users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(schema.users.id, reset.userId)),
      db
        .update(schema.passwordResets)
        .set({ usedAt: new Date() })
        .where(eq(schema.passwordResets.token, body.token)),
      // Invalidate all refresh tokens for this user
      db.delete(schema.refreshTokens).where(
        eq(schema.refreshTokens.userId, reset.userId),
      ),
    ])

    return reply.send({ message: 'Password reset successfully. Please log in.' })
  })

  // POST /api/auth/change-password
  app.post('/change-password', { preHandler: requireAuth }, async (req, reply) => {
    const body = ChangePasswordSchema.parse(req.body)

    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, req.userId),
    })
    if (!user) { throw Errors.USER_NOT_FOUND() }

    const passwordMatch = await compare(body.currentPassword, user.passwordHash)
    if (!passwordMatch) { throw Errors.INVALID_CREDENTIALS() }

    const newHash = await hash(body.newPassword, 12)
    await db
      .update(schema.users)
      .set({ passwordHash: newHash, updatedAt: new Date() })
      .where(eq(schema.users.id, req.userId))

    return reply.send({ message: 'Password changed successfully.' })
  })
}
