import { config } from 'dotenv'
config()
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.string().default('production'),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().default(''),

  // Redis (optional — app degrades gracefully without it)
  REDIS_URL: z.string().optional(),

  // JWT
  JWT_ACCESS_SECRET: z.string().default('changeme-access-secret'),
  JWT_REFRESH_SECRET: z.string().default('changeme-refresh-secret'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // TURN server (optional — for WebRTC behind strict firewalls)
  TURN_URL: z.string().optional(),
  TURN_USERNAME: z.string().optional(),
  TURN_CREDENTIAL: z.string().optional(),

  // Email (SMTP)
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().email().default('noreply@nexora.app'),

  // App
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),

  // Storage (S3-compatible)
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default('auto'),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
})

function parseEnv() {
  const result = EnvSchema.safeParse(process.env)
  if (!result.success) {
    // Log but don't exit — let the app start and fail on first use
    console.error('[env] Validation warnings:')
    for (const issue of result.error.issues) {
      console.error(`  ${issue.path.join('.')}: ${issue.message}`)
    }
    return EnvSchema.parse({ ...process.env })
  }
  console.warn('[env] Loaded:', Object.keys(result.data).filter(k => !k.includes('SECRET') && !k.includes('PASS')).join(', '))
  return result.data
}

export const env = parseEnv()
export type Env = z.infer<typeof EnvSchema>
