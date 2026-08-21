import dotenv from 'dotenv'
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import { closeDatabase, initializeDatabase, withTransaction } from '../server/database.mjs'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })

const sourcePath = path.resolve(process.env.LEGACY_SQLITE_PATH || 'data/mere-x.sqlite')
const legacyFileRoot = path.resolve('data/files')
const report = {}

function rows(database, table) {
  try { return database.prepare(`SELECT * FROM ${table}`).all() }
  catch { return [] }
}

function safeLegacyFile(storagePath) {
  const resolved = path.resolve(String(storagePath || ''))
  return resolved.startsWith(`${legacyFileRoot}${path.sep}`) && fs.existsSync(resolved) ? resolved : null
}

if (!fs.existsSync(sourcePath)) {
  console.log(JSON.stringify({ ok: true, imported: false, reason: 'No legacy SQLite database found.' }))
  process.exit(0)
}

const legacy = new DatabaseSync(sourcePath, { readOnly: true })

try {
  await initializeDatabase()
  const source = {
    users: rows(legacy, 'users'),
    sessions: rows(legacy, 'sessions'),
    password_resets: rows(legacy, 'password_resets'),
    workspaces: rows(legacy, 'workspaces'),
    shared_conversations: rows(legacy, 'shared_conversations'),
    usage_events: rows(legacy, 'usage_events'),
    stored_files: rows(legacy, 'stored_files'),
    jobs: rows(legacy, 'jobs'),
    knowledge_stores: rows(legacy, 'knowledge_stores'),
  }

  await withTransaction(async connection => {
    for (const row of source.users) {
      const [result] = await connection.execute(`INSERT INTO users (id,email,password_hash,name,plan,created_at,updated_at) VALUES (?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE email=IF(VALUES(updated_at)>updated_at,VALUES(email),email),password_hash=IF(VALUES(updated_at)>updated_at,VALUES(password_hash),password_hash),name=IF(VALUES(updated_at)>updated_at,VALUES(name),name),plan=IF(VALUES(updated_at)>updated_at,VALUES(plan),plan),updated_at=GREATEST(updated_at,VALUES(updated_at))`, [row.id, row.email, row.password_hash, row.name, row.plan, row.created_at, row.updated_at])
      report.users = (report.users || 0) + Number(result.affectedRows > 0)
    }
    for (const row of source.sessions) {
      const [result] = await connection.execute('INSERT IGNORE INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)', [row.token_hash, row.user_id, row.expires_at, row.created_at])
      report.sessions = (report.sessions || 0) + Number(result.affectedRows || 0)
    }
    for (const row of source.password_resets) {
      const [result] = await connection.execute('INSERT IGNORE INTO password_resets (token_hash,user_id,expires_at,used_at) VALUES (?,?,?,?)', [row.token_hash, row.user_id, row.expires_at, row.used_at ?? null])
      report.passwordResets = (report.passwordResets || 0) + Number(result.affectedRows || 0)
    }
    for (const row of source.workspaces) {
      const [result] = await connection.execute(`INSERT INTO workspaces (user_id,version,data,updated_at) VALUES (?,?,?,?)
        ON DUPLICATE KEY UPDATE data=IF(VALUES(updated_at)>updated_at,VALUES(data),data),version=GREATEST(version,VALUES(version)),updated_at=GREATEST(updated_at,VALUES(updated_at))`, [row.user_id, row.version, row.data, row.updated_at])
      report.workspaces = (report.workspaces || 0) + Number(result.affectedRows > 0)
    }
    for (const row of source.shared_conversations) {
      const [result] = await connection.execute('INSERT IGNORE INTO shared_conversations (id,owner_id,title,messages,created_at,expires_at) VALUES (?,?,?,?,?,?)', [row.id, row.owner_id ?? null, row.title, row.messages, row.created_at, row.expires_at ?? null])
      report.shares = (report.shares || 0) + Number(result.affectedRows || 0)
    }
    for (const row of source.usage_events) {
      const [result] = await connection.execute('INSERT IGNORE INTO usage_events (id,subject,kind,units,cost_usd,metadata,created_at) VALUES (?,?,?,?,?,?,?)', [row.id, row.subject, row.kind, row.units, row.cost_usd, row.metadata ?? null, row.created_at])
      report.usageEvents = (report.usageEvents || 0) + Number(result.affectedRows || 0)
    }
    for (const row of source.stored_files) {
      const filePath = safeLegacyFile(row.storage_path)
      if (!filePath) {
        report.skippedFiles = (report.skippedFiles || 0) + 1
        continue
      }
      const data = fs.readFileSync(filePath)
      const checksum = createHash('sha256').update(data).digest('hex')
      const [result] = await connection.execute('INSERT IGNORE INTO stored_files (id,owner_id,guest_id,name,mime_type,file_data,size,checksum,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [row.id, row.owner_id ?? null, row.guest_id ?? null, row.name, row.mime_type, data, data.length, checksum, row.created_at])
      report.files = (report.files || 0) + Number(result.affectedRows || 0)
    }
    for (const row of source.jobs) {
      const [result] = await connection.execute(`INSERT INTO jobs (id,owner_id,guest_id,type,status,payload,result,error,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE status=IF(VALUES(updated_at)>updated_at,VALUES(status),status),payload=IF(VALUES(updated_at)>updated_at,VALUES(payload),payload),result=IF(VALUES(updated_at)>updated_at,VALUES(result),result),error=IF(VALUES(updated_at)>updated_at,VALUES(error),error),updated_at=GREATEST(updated_at,VALUES(updated_at))`, [row.id, row.owner_id ?? null, row.guest_id ?? null, row.type, row.status, row.payload ?? null, row.result ?? null, row.error ?? null, row.created_at, row.updated_at])
      report.jobs = (report.jobs || 0) + Number(result.affectedRows > 0)
    }
    for (const row of source.knowledge_stores) {
      const [result] = await connection.execute(`INSERT INTO knowledge_stores (owner_id,project_id,store_name,display_name,created_at,updated_at) VALUES (?,?,?,?,?,?)
        ON DUPLICATE KEY UPDATE store_name=IF(VALUES(updated_at)>updated_at,VALUES(store_name),store_name),display_name=IF(VALUES(updated_at)>updated_at,VALUES(display_name),display_name),updated_at=GREATEST(updated_at,VALUES(updated_at))`, [row.owner_id, row.project_id, row.store_name, row.display_name, row.created_at, row.updated_at])
      report.knowledgeStores = (report.knowledgeStores || 0) + Number(result.affectedRows > 0)
    }
  })

  console.log(JSON.stringify({ ok: true, imported: true, report }))
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error?.code || null, error: String(error?.message || error).replace(/mysql:\/\/[^\s]+/gi, '[database-url-redacted]') }))
  process.exitCode = 1
} finally {
  legacy.close()
  await closeDatabase().catch(() => undefined)
}
