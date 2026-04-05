import type { FastifyError } from 'fastify'

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export const Errors = {
  // Auth
  INVALID_CREDENTIALS:    () => new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
  EMAIL_NOT_VERIFIED:     () => new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in'),
  TOKEN_EXPIRED:          () => new AppError(401, 'TOKEN_EXPIRED', 'Token has expired'),
  TOKEN_INVALID:          () => new AppError(401, 'TOKEN_INVALID', 'Token is invalid'),
  UNAUTHORIZED:           () => new AppError(401, 'UNAUTHORIZED', 'Authentication required'),
  FORBIDDEN:              () => new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'),

  // Users
  USER_NOT_FOUND:         () => new AppError(404, 'USER_NOT_FOUND', 'User not found'),
  USERNAME_TAKEN:         () => new AppError(409, 'USERNAME_TAKEN', 'This username is already taken'),
  EMAIL_TAKEN:            () => new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists'),

  // Hubs
  HUB_NOT_FOUND:          () => new AppError(404, 'HUB_NOT_FOUND', 'Hub not found'),
  NOT_HUB_MEMBER:         () => new AppError(403, 'NOT_HUB_MEMBER', 'You are not a member of this hub'),
  ALREADY_HUB_MEMBER:     () => new AppError(409, 'ALREADY_HUB_MEMBER', 'You are already a member of this hub'),
  HUB_BANNED:             () => new AppError(403, 'HUB_BANNED', 'You have been banned from this hub'),
  INVITE_INVALID:         () => new AppError(404, 'INVITE_INVALID', 'Invite link is invalid or has expired'),
  INVITE_MAXED:           () => new AppError(410, 'INVITE_MAXED', 'This invite link has reached its maximum uses'),

  // Channels
  CHANNEL_NOT_FOUND:      () => new AppError(404, 'CHANNEL_NOT_FOUND', 'Channel not found'),
  WRONG_CHANNEL_TYPE:     () => new AppError(400, 'WRONG_CHANNEL_TYPE', 'This action is not supported for this channel type'),

  // Messages
  MESSAGE_NOT_FOUND:      () => new AppError(404, 'MESSAGE_NOT_FOUND', 'Message not found'),
  CANNOT_EDIT_MESSAGE:    () => new AppError(403, 'CANNOT_EDIT_MESSAGE', 'You can only edit your own messages'),
  CANNOT_DELETE_MESSAGE:  () => new AppError(403, 'CANNOT_DELETE_MESSAGE', 'You do not have permission to delete this message'),

  // Generic
  VALIDATION_ERROR:       (details: unknown) => new AppError(400, 'VALIDATION_ERROR', 'Request validation failed', details),
  NOT_FOUND:              (resource: string) => new AppError(404, 'NOT_FOUND', `${resource} not found`),
  CONFLICT:               (msg: string) => new AppError(409, 'CONFLICT', msg),
  INTERNAL:               () => new AppError(500, 'INTERNAL_ERROR', 'An unexpected error occurred'),
}

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError
}

export function toFastifyError(err: unknown): FastifyError {
  if (isAppError(err)) {
    return Object.assign(err, { statusCode: err.statusCode })
  }
  throw err
}
