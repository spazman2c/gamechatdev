import type { FastifyInstance } from 'fastify'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { requireAuth } from '../middleware/auth.js'
import { env } from '../lib/env.js'
import { Errors } from '../lib/errors.js'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/ogg',
  'application/pdf',
  'text/plain',
  'application/zip',
]

const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50MB

const PresignSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().min(1).max(MAX_SIZE_BYTES),
})

function getS3Client() {
  if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY_ID || !env.S3_SECRET_ACCESS_KEY || !env.S3_BUCKET) {
    return null
  }
  return new S3Client({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // needed for R2 / Minio
  })
}

export async function uploadRoutes(app: FastifyInstance) {
  // POST /api/uploads/presign — get a presigned PUT URL
  app.post('/presign', { preHandler: requireAuth }, async (req, reply) => {
    const s3 = getS3Client()
    if (!s3 || !env.S3_BUCKET) {
      return reply.code(503).send({ error: 'File uploads are not configured on this server' })
    }

    const body = PresignSchema.parse(req.body)

    if (!ALLOWED_TYPES.includes(body.contentType)) {
      throw Errors.VALIDATION_ERROR({ contentType: 'File type not allowed' })
    }

    const ext = body.filename.includes('.') ? `.${body.filename.split('.').pop()}` : ''
    const key = `uploads/${req.userId}/${randomUUID()}${ext}`

    const command = new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
      ContentType: body.contentType,
      ContentLength: body.sizeBytes,
      Metadata: {
        uploadedBy: req.userId,
        originalName: body.filename,
      },
    })

    const presignedUrl = await getSignedUrl(s3, command, { expiresIn: 300 }) // 5min

    // The public URL for the file after upload
    const publicUrl = env.S3_ENDPOINT
      ? `${env.S3_ENDPOINT}/${env.S3_BUCKET}/${key}`
      : `https://${env.S3_BUCKET}.s3.${env.S3_REGION}.amazonaws.com/${key}`

    return reply.send({
      presignedUrl,
      publicUrl,
      key,
    })
  })
}
