/**
 * Schema push script — run via: npx tsx src/db/push.ts
 * Uses drizzle-kit's JS API directly so ESM imports resolve correctly.
 */
import { config } from 'dotenv'
config()

import { pushSchema } from 'drizzle-kit/api'
import * as schema from './schema/index.js'

async function main() {
  const dbUrl = process.env['DATABASE_URL']
  if (!dbUrl) {
    console.error('DATABASE_URL is not set')
    process.exit(1)
  }

  console.log('Pushing schema to database…')

  const { hasDataLoss, warnings, statementsToExecute } = await pushSchema(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema as any,
    {
      dialect: 'postgresql',
      url: dbUrl,
    } as unknown as Parameters<typeof pushSchema>[1],
  )

  if (warnings.length) {
    console.warn('Warnings:')
    for (const w of warnings) { console.warn(' -', w) }
  }

  if (hasDataLoss) {
    console.error('⚠ This push would cause data loss. Aborting.')
    process.exit(1)
  }

  console.log(`Executing ${statementsToExecute.length} statement(s)…`)
  for (const stmt of statementsToExecute) {
    console.log(' >', stmt.slice(0, 80))
  }

  console.log('✓ Schema pushed successfully')
}

main().catch((err) => {
  console.error('Push failed:', err)
  process.exit(1)
})
