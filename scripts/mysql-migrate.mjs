import dotenv from 'dotenv'
import { closeDatabase, databaseHealth, initializeDatabase } from '../server/database.mjs'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })

try {
  await initializeDatabase()
  const health = await databaseHealth()
  if (!health.ok || !health.ready) throw new Error('Database did not become ready after migration.')
  console.log(JSON.stringify({ ok: true, migrated: true, ready: health.ready, latencyMs: health.latencyMs }))
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error?.code || null, error: String(error?.message || error).replace(/mysql:\/\/[^\s]+/gi, '[database-url-redacted]') }))
  process.exitCode = 1
} finally {
  await closeDatabase().catch(() => undefined)
}
