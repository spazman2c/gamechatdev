import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema/index.js'
import { env } from '../lib/env.js'

const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 2_000,
})

export const db = drizzle(pool, { schema, logger: env.NODE_ENV === 'development' })

export type DB = typeof db
export { schema }
