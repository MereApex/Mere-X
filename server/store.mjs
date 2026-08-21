import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { DatabaseSync } from 'node:sqlite'

const workspaceDir = path.resolve(process.cwd(), 'data')
const fileDir = path.join(workspaceDir, 'files')
fs.mkdirSync(fileDir, { recursive: true })

const db = new DatabaseSync(path.join(workspaceDir, 'mere-x.sqlite'))
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;')
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS password_resets (
    token_hash TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    used_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS workspaces (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    version INTEGER NOT NULL DEFAULT 1,
    data TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS shared_conversations (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    messages TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    expires_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS usage_events (
    id TEXT PRIMARY KEY,
    subject TEXT NOT NULL,
    kind TEXT NOT NULL,
    units REAL NOT NULL,
    cost_usd REAL NOT NULL DEFAULT 0,
    metadata TEXT,
    created_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS usage_subject_time ON usage_events(subject, created_at);
  CREATE TABLE IF NOT EXISTS stored_files (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    guest_id TEXT,
    name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS jobs (
    id TEXT PRIMARY KEY,
    owner_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    guest_id TEXT,
    type TEXT NOT NULL,
    status TEXT NOT NULL,
    payload TEXT,
    result TEXT,
    error TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS knowledge_stores (
    owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL,
    store_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    PRIMARY KEY(owner_id, project_id)
  );
`)

const now = () => Date.now()
const normalizeEmail = (email = '') => String(email).trim().toLowerCase()
const tokenHash = (token) => createHash('sha256').update(String(token)).digest('hex')
const jsonParse = (value, fallback = null) => {
  try { return JSON.parse(value) } catch { return fallback }
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const digest = scryptSync(String(password), salt, 64).toString('hex')
  return `${salt}:${digest}`
}

export function verifyPassword(password, stored) {
  const [salt, digest] = String(stored || '').split(':')
  if (!salt || !digest) return false
  const expected = Buffer.from(digest, 'hex')
  const actual = scryptSync(String(password), salt, expected.length)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

function publicUser(row) {
  return row ? { id: row.id, email: row.email, name: row.name, plan: row.plan, createdAt: row.created_at } : null
}

export function createUser({ email, password, name }) {
  const timestamp = now()
  const user = { id: randomUUID(), email: normalizeEmail(email), name: String(name).trim(), plan: 'free', createdAt: timestamp }
  db.prepare('INSERT INTO users (id,email,password_hash,name,plan,created_at,updated_at) VALUES (?,?,?,?,?,?,?)')
    .run(user.id, user.email, hashPassword(password), user.name, user.plan, timestamp, timestamp)
  db.prepare('INSERT INTO workspaces (user_id,version,data,updated_at) VALUES (?,?,?,?)').run(user.id, 1, '{}', timestamp)
  return user
}

export function findUserByEmail(email) {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(email)) || null
}

export function getUser(id) {
  return publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id))
}

export function updateUser(id, updates = {}) {
  const current = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  if (!current) return null
  const email = updates.email ? normalizeEmail(updates.email) : current.email
  const name = updates.name ? String(updates.name).trim() : current.name
  const plan = updates.plan || current.plan
  const passwordHash = updates.password ? hashPassword(updates.password) : current.password_hash
  db.prepare('UPDATE users SET email=?,name=?,plan=?,password_hash=?,updated_at=? WHERE id=?')
    .run(email, name, plan, passwordHash, now(), id)
  return getUser(id)
}

export function createSession(userId, ttlMs = 30 * 24 * 60 * 60 * 1000) {
  const token = randomBytes(32).toString('base64url')
  const timestamp = now()
  db.prepare('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)')
    .run(tokenHash(token), userId, timestamp + ttlMs, timestamp)
  return { token, expiresAt: timestamp + ttlMs }
}

export function getSession(token) {
  if (!token) return null
  const row = db.prepare(`SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id
    WHERE sessions.token_hash=? AND sessions.expires_at>?`).get(tokenHash(token), now())
  return publicUser(row)
}

export function deleteSession(token) {
  if (token) db.prepare('DELETE FROM sessions WHERE token_hash=?').run(tokenHash(token))
}

export function listSessions(userId, currentToken) {
  const currentHash = currentToken ? tokenHash(currentToken) : ''
  return db.prepare('SELECT token_hash,expires_at,created_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY created_at DESC').all(userId, now()).map((row) => ({
    id: row.token_hash.slice(0, 16),
    current: row.token_hash === currentHash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
  }))
}

export function deleteOtherSessions(userId, currentToken) {
  const currentHash = currentToken ? tokenHash(currentToken) : ''
  const result = db.prepare('DELETE FROM sessions WHERE user_id=? AND token_hash<>?').run(userId, currentHash)
  return Number(result.changes || 0)
}

export function changePassword(userId, currentPassword, nextPassword) {
  const row = db.prepare('SELECT password_hash FROM users WHERE id=?').get(userId)
  if (!row || !verifyPassword(currentPassword, row.password_hash)) return false
  updateUser(userId, { password: nextPassword })
  return true
}

export function deleteUser(userId) {
  const files = db.prepare('SELECT storage_path FROM stored_files WHERE owner_id=?').all(userId)
  db.prepare('DELETE FROM users WHERE id=?').run(userId)
  for (const file of files) {
    const resolved = path.resolve(String(file.storage_path || ''))
    if (resolved.startsWith(`${path.resolve(fileDir)}${path.sep}`) && fs.existsSync(resolved)) fs.unlinkSync(resolved)
  }
}

export function cleanupExpired() {
  const timestamp = now()
  db.prepare('DELETE FROM sessions WHERE expires_at<=?').run(timestamp)
  db.prepare('DELETE FROM password_resets WHERE expires_at<=? OR used_at IS NOT NULL').run(timestamp)
  db.prepare('DELETE FROM shared_conversations WHERE expires_at IS NOT NULL AND expires_at<=?').run(timestamp)
}

export function createPasswordReset(userId, ttlMs = 30 * 60 * 1000) {
  const token = randomBytes(28).toString('base64url')
  db.prepare('INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES (?,?,?)')
    .run(tokenHash(token), userId, now() + ttlMs)
  return token
}

export function applyPasswordReset(token, password) {
  const row = db.prepare('SELECT * FROM password_resets WHERE token_hash=? AND expires_at>? AND used_at IS NULL').get(tokenHash(token), now())
  if (!row) return false
  db.exec('BEGIN IMMEDIATE')
  try {
    updateUser(row.user_id, { password })
    db.prepare('UPDATE password_resets SET used_at=? WHERE token_hash=?').run(now(), tokenHash(token))
    db.prepare('DELETE FROM sessions WHERE user_id=?').run(row.user_id)
    db.exec('COMMIT')
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
  return true
}

export function getWorkspace(userId) {
  const row = db.prepare('SELECT version,data,updated_at FROM workspaces WHERE user_id=?').get(userId)
  return row ? { version: row.version, data: jsonParse(row.data, {}), updatedAt: row.updated_at } : { version: 0, data: {}, updatedAt: 0 }
}

export function saveWorkspace(userId, data, expectedVersion) {
  const current = getWorkspace(userId)
  if (Number.isFinite(expectedVersion) && Number(expectedVersion) !== current.version) return { conflict: true, workspace: current }
  const version = current.version + 1
  const timestamp = now()
  db.prepare(`INSERT INTO workspaces (user_id,version,data,updated_at) VALUES (?,?,?,?)
    ON CONFLICT(user_id) DO UPDATE SET version=excluded.version,data=excluded.data,updated_at=excluded.updated_at`)
    .run(userId, version, JSON.stringify(data || {}), timestamp)
  return { conflict: false, workspace: { version, data: data || {}, updatedAt: timestamp } }
}

export function createShare({ ownerId = null, title, messages, ttlMs = 90 * 24 * 60 * 60 * 1000 }) {
  const id = randomBytes(14).toString('base64url')
  const timestamp = now()
  db.prepare('INSERT INTO shared_conversations (id,owner_id,title,messages,created_at,expires_at) VALUES (?,?,?,?,?,?)')
    .run(id, ownerId, title, JSON.stringify(messages), timestamp, timestamp + ttlMs)
  return id
}

export function getShare(id) {
  const row = db.prepare('SELECT title,messages,created_at FROM shared_conversations WHERE id=? AND (expires_at IS NULL OR expires_at>?)').get(id, now())
  return row ? { title: row.title, messages: jsonParse(row.messages, []), createdAt: row.created_at } : null
}

export function recordUsage({ subject, kind, units, costUsd = 0, metadata = null }) {
  db.prepare('INSERT INTO usage_events (id,subject,kind,units,cost_usd,metadata,created_at) VALUES (?,?,?,?,?,?,?)')
    .run(randomUUID(), subject, kind, Number(units) || 0, Number(costUsd) || 0, metadata ? JSON.stringify(metadata) : null, now())
}

export function usageSince(subject, since) {
  const row = db.prepare('SELECT COALESCE(SUM(units),0) AS units,COALESCE(SUM(cost_usd),0) AS cost FROM usage_events WHERE subject=? AND created_at>=?').get(subject, since)
  const byKind = db.prepare('SELECT kind,COALESCE(SUM(units),0) AS units,COUNT(*) AS requests FROM usage_events WHERE subject=? AND created_at>=? GROUP BY kind').all(subject, since)
  return { units: Number(row?.units || 0), costUsd: Number(row?.cost || 0), byKind }
}

export function storeFile({ ownerId = null, guestId = null, name, mimeType, buffer }) {
  const id = randomUUID()
  const ownerFolder = path.join(fileDir, ownerId || `guest-${String(guestId || 'anonymous').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80)}`)
  fs.mkdirSync(ownerFolder, { recursive: true })
  const storagePath = path.join(ownerFolder, id)
  fs.writeFileSync(storagePath, buffer, { flag: 'wx' })
  db.prepare('INSERT INTO stored_files (id,owner_id,guest_id,name,mime_type,storage_path,size,created_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, ownerId, guestId, name, mimeType, storagePath, buffer.length, now())
  return { id, name, mimeType, size: buffer.length, createdAt: now() }
}

export function getStoredFile(id, { ownerId = null, guestId = null } = {}) {
  const row = db.prepare('SELECT * FROM stored_files WHERE id=?').get(id)
  if (!row || (row.owner_id && row.owner_id !== ownerId) || (!row.owner_id && row.guest_id !== guestId)) return null
  if (!fs.existsSync(row.storage_path)) return null
  return { id: row.id, name: row.name, mimeType: row.mime_type, size: row.size, buffer: fs.readFileSync(row.storage_path) }
}

export function createJob({ ownerId = null, guestId = null, type, payload = {} }) {
  const id = randomUUID()
  const timestamp = now()
  db.prepare('INSERT INTO jobs (id,owner_id,guest_id,type,status,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, ownerId, guestId, type, 'queued', JSON.stringify(payload), timestamp, timestamp)
  return getJob(id, { ownerId, guestId })
}

function publicJob(row) {
  return row ? { id: row.id, type: row.type, status: row.status, payload: jsonParse(row.payload, {}), result: jsonParse(row.result, null), error: row.error, createdAt: row.created_at, updatedAt: row.updated_at } : null
}

export function updateJob(id, updates = {}) {
  const current = db.prepare('SELECT * FROM jobs WHERE id=?').get(id)
  if (!current) return null
  db.prepare('UPDATE jobs SET status=?,result=?,error=?,updated_at=? WHERE id=?')
    .run(updates.status || current.status, updates.result === undefined ? current.result : JSON.stringify(updates.result), updates.error === undefined ? current.error : updates.error, now(), id)
  return publicJob(db.prepare('SELECT * FROM jobs WHERE id=?').get(id))
}

export function getJob(id, { ownerId = null, guestId = null } = {}) {
  const row = db.prepare('SELECT * FROM jobs WHERE id=?').get(id)
  if (!row || (row.owner_id && row.owner_id !== ownerId) || (!row.owner_id && row.guest_id !== guestId)) return null
  return publicJob(row)
}

export function listJobs({ ownerId = null, guestId = null } = {}, limit = 20) {
  const rows = ownerId
    ? db.prepare('SELECT * FROM jobs WHERE owner_id=? ORDER BY updated_at DESC LIMIT ?').all(ownerId, Math.min(100, Math.max(1, Number(limit) || 20)))
    : db.prepare('SELECT * FROM jobs WHERE owner_id IS NULL AND guest_id=? ORDER BY updated_at DESC LIMIT ?').all(guestId, Math.min(100, Math.max(1, Number(limit) || 20)))
  return rows.map(publicJob)
}

export function getKnowledgeStore(ownerId, projectId) {
  const row = db.prepare('SELECT * FROM knowledge_stores WHERE owner_id=? AND project_id=?').get(ownerId, String(projectId))
  return row ? { projectId: row.project_id, storeName: row.store_name, displayName: row.display_name, updatedAt: row.updated_at } : null
}

export function saveKnowledgeStore(ownerId, projectId, storeName, displayName) {
  const timestamp = now()
  db.prepare(`INSERT INTO knowledge_stores (owner_id,project_id,store_name,display_name,created_at,updated_at) VALUES (?,?,?,?,?,?)
    ON CONFLICT(owner_id,project_id) DO UPDATE SET store_name=excluded.store_name,display_name=excluded.display_name,updated_at=excluded.updated_at`)
    .run(ownerId, String(projectId), String(storeName), String(displayName), timestamp, timestamp)
  return getKnowledgeStore(ownerId, projectId)
}

cleanupExpired()
