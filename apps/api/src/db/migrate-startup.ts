/**
 * Startup migration — runs safe ALTER TABLE / CREATE TABLE IF NOT EXISTS statements
 * so new schema changes are applied on deploy without data loss.
 */
import { db } from './index.js'
import { sql } from 'drizzle-orm'

const MIGRATIONS = [
  // Hub extended settings columns
  `ALTER TABLE hubs ADD COLUMN IF NOT EXISTS verification_level integer NOT NULL DEFAULT 0`,
  `ALTER TABLE hubs ADD COLUMN IF NOT EXISTS content_filter integer NOT NULL DEFAULT 0`,
  `ALTER TABLE hubs ADD COLUMN IF NOT EXISTS is_community boolean NOT NULL DEFAULT false`,
  `ALTER TABLE hubs ADD COLUMN IF NOT EXISTS banner_color varchar(7)`,
  `ALTER TABLE hubs ADD COLUMN IF NOT EXISTS system_channel_id uuid`,

  // hub_emoji table
  `CREATE TABLE IF NOT EXISTS hub_emoji (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id uuid NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    name varchar(32) NOT NULL,
    url text NOT NULL,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS hub_emoji_hub_idx ON hub_emoji(hub_id)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS hub_emoji_name_idx ON hub_emoji(hub_id, name)`,

  // hub_stickers table
  `CREATE TABLE IF NOT EXISTS hub_stickers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    hub_id uuid NOT NULL REFERENCES hubs(id) ON DELETE CASCADE,
    name varchar(32) NOT NULL,
    description varchar(100),
    url text NOT NULL,
    created_by uuid REFERENCES users(id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS hub_stickers_hub_idx ON hub_stickers(hub_id)`,
]

export async function runStartupMigrations() {
  console.log('[db] Running startup migrations…')
  for (const stmt of MIGRATIONS) {
    try {
      await db.execute(sql.raw(stmt))
    } catch (err: unknown) {
      // Log but don't crash — idempotent statements should be safe
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[db] Migration warning: ${msg.slice(0, 120)}`)
    }
  }
  console.log('[db] Startup migrations complete.')
}
