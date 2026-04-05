import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'
import { isAppError } from '../lib/errors.js'

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.code(400).send({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: error.flatten(),
    })
  }

  // Our typed app errors
  if (isAppError(error)) {
    return reply.code(error.statusCode).send({
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
      ...(error.details !== undefined && { details: error.details }),
    })
  }

  // Fastify validation errors (JSON schema)
  if ('validation' in error && error.validation) {
    return reply.code(400).send({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: error.message,
      details: error.validation,
    })
  }

  // 404 from Fastify
  if ('statusCode' in error && error.statusCode === 404) {
    return reply.code(404).send({
      statusCode: 404,
      code: 'NOT_FOUND',
      message: 'Route not found',
    })
  }

  // Unknown — log and return generic 500
  request.log.error(error, 'Unhandled error')
  return reply.code(500).send({
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  })
}
