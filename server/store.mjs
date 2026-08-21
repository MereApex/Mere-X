import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { execute, withTransaction } from './database.mjs'

const now = () => Date.now()
const normalizeEmail = (email = '') => String(email).trim().toLowerCase()
const tokenHash = (token) => createHash('sha256').update(String(token)).digest('hex')
const jsonParse = (value, fallback = null) => {
  if (value === null || value === undefined) return fallback
  if (typeof value === 'object' && !Buffer.isBuffer(value)) return value
  try { return JSON.parse(String(value)) } catch { return fallback }
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
  return row ? { id: row.id, email: row.email, name: row.name, plan: row.plan, createdAt: Number(row.created_at) } : null
}

export async function createUser({ email, password, name }) {
  const timestamp = now()
  const user = { id: randomUUID(), email: normalizeEmail(email), name: String(name).trim(), plan: 'free', createdAt: timestamp }
  await withTransaction(async connection => {
    await connection.execute('INSERT INTO users (id,email,password_hash,name,plan,created_at,updated_at) VALUES (?,?,?,?,?,?,?)', [user.id, user.email, hashPassword(password), user.name, user.plan, timestamp, timestamp])
    await connection.execute('INSERT INTO workspaces (user_id,version,data,updated_at) VALUES (?,?,?,?)', [user.id, 1, '{}', timestamp])
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), user.id, 'account.created', null, timestamp])
  })
  return user
}

export async function findUserByEmail(email) {
  const [rows] = await execute('SELECT * FROM users WHERE email = ? LIMIT 1', [normalizeEmail(email)])
  return rows[0] || null
}

export async function getUser(id) {
  const [rows] = await execute('SELECT * FROM users WHERE id = ? LIMIT 1', [id])
  return publicUser(rows[0])
}

export async function updateUser(id, updates = {}) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute('SELECT * FROM users WHERE id = ? FOR UPDATE', [id])
    const current = rows[0]
    if (!current) return null
    const email = updates.email ? normalizeEmail(updates.email) : current.email
    const name = updates.name ? String(updates.name).trim() : current.name
    const plan = updates.plan || current.plan
    const passwordHash = updates.password ? hashPassword(updates.password) : current.password_hash
    const timestamp = now()
    await connection.execute('UPDATE users SET email=?,name=?,plan=?,password_hash=?,updated_at=? WHERE id=?', [email, name, plan, passwordHash, timestamp, id])
    if (email !== current.email || name !== current.name || plan !== current.plan || passwordHash !== current.password_hash) {
      await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), id, 'account.updated', JSON.stringify({ emailChanged: email !== current.email, nameChanged: name !== current.name, planChanged: plan !== current.plan, passwordChanged: passwordHash !== current.password_hash }), timestamp])
    }
    return publicUser({ ...current, email, name, plan })
  })
}

export async function createSession(userId, ttlMs = 30 * 24 * 60 * 60 * 1000) {
  const token = randomBytes(32).toString('base64url')
  const timestamp = now()
  const expiresAt = timestamp + ttlMs
  await execute('INSERT INTO sessions (token_hash,user_id,expires_at,created_at) VALUES (?,?,?,?)', [tokenHash(token), userId, expiresAt, timestamp])
  return { token, expiresAt }
}

export async function getSession(token) {
  if (!token) return null
  const [rows] = await execute(`SELECT users.* FROM sessions JOIN users ON users.id=sessions.user_id
    WHERE sessions.token_hash=? AND sessions.expires_at>? LIMIT 1`, [tokenHash(token), now()])
  return publicUser(rows[0])
}

export async function deleteSession(token) {
  if (token) await execute('DELETE FROM sessions WHERE token_hash=?', [tokenHash(token)])
}

export async function listSessions(userId, currentToken) {
  const currentHash = currentToken ? tokenHash(currentToken) : ''
  const [rows] = await execute('SELECT token_hash,expires_at,created_at FROM sessions WHERE user_id=? AND expires_at>? ORDER BY created_at DESC', [userId, now()])
  return rows.map(row => ({ id: row.token_hash.slice(0, 16), current: row.token_hash === currentHash, createdAt: Number(row.created_at), expiresAt: Number(row.expires_at) }))
}

export async function deleteOtherSessions(userId, currentToken) {
  const currentHash = currentToken ? tokenHash(currentToken) : ''
  const [result] = await execute('DELETE FROM sessions WHERE user_id=? AND token_hash<>?', [userId, currentHash])
  return Number(result.affectedRows || 0)
}

export async function changePassword(userId, currentPassword, nextPassword) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute('SELECT password_hash FROM users WHERE id=? FOR UPDATE', [userId])
    if (!rows[0] || !verifyPassword(currentPassword, rows[0].password_hash)) return false
    const timestamp = now()
    await connection.execute('UPDATE users SET password_hash=?,updated_at=? WHERE id=?', [hashPassword(nextPassword), timestamp, userId])
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), userId, 'account.password_changed', null, timestamp])
    return true
  })
}

export async function deleteUser(userId) {
  await execute('DELETE FROM users WHERE id=?', [userId])
}

export async function cleanupExpired() {
  const timestamp = now()
  await Promise.all([
    execute('DELETE FROM sessions WHERE expires_at<=?', [timestamp]),
    execute('DELETE FROM password_resets WHERE expires_at<=? OR used_at IS NOT NULL', [timestamp]),
    execute('DELETE FROM shared_conversations WHERE expires_at IS NOT NULL AND expires_at<=?', [timestamp]),
    execute("DELETE FROM jobs WHERE owner_id IS NULL AND updated_at<? AND status IN ('completed','failed','cancelled')", [timestamp - 30 * 24 * 60 * 60 * 1000]),
    execute('DELETE FROM usage_events WHERE created_at<?', [timestamp - 400 * 24 * 60 * 60 * 1000]),
  ])
}

export async function createPasswordReset(userId, ttlMs = 30 * 60 * 1000) {
  const token = randomBytes(28).toString('base64url')
  await execute('INSERT INTO password_resets (token_hash,user_id,expires_at) VALUES (?,?,?)', [tokenHash(token), userId, now() + ttlMs])
  return token
}

export async function applyPasswordReset(token, password) {
  return withTransaction(async connection => {
    const hash = tokenHash(token)
    const [rows] = await connection.execute('SELECT * FROM password_resets WHERE token_hash=? AND expires_at>? AND used_at IS NULL FOR UPDATE', [hash, now()])
    const row = rows[0]
    if (!row) return false
    const timestamp = now()
    await connection.execute('UPDATE users SET password_hash=?,updated_at=? WHERE id=?', [hashPassword(password), timestamp, row.user_id])
    await connection.execute('UPDATE password_resets SET used_at=? WHERE token_hash=?', [timestamp, hash])
    await connection.execute('DELETE FROM sessions WHERE user_id=?', [row.user_id])
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), row.user_id, 'account.password_reset', null, timestamp])
    return true
  })
}

export async function getWorkspace(userId) {
  const [rows] = await execute('SELECT version,data,updated_at FROM workspaces WHERE user_id=?', [userId])
  const row = rows[0]
  return row ? { version: Number(row.version), data: jsonParse(row.data, {}), updatedAt: Number(row.updated_at) } : { version: 0, data: {}, updatedAt: 0 }
}

export async function saveWorkspace(userId, data, expectedVersion) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute('SELECT version,data,updated_at FROM workspaces WHERE user_id=? FOR UPDATE', [userId])
    const row = rows[0]
    const current = row ? { version: Number(row.version), data: jsonParse(row.data, {}), updatedAt: Number(row.updated_at) } : { version: 0, data: {}, updatedAt: 0 }
    if (Number.isFinite(expectedVersion) && Number(expectedVersion) !== current.version) return { conflict: true, workspace: current }
    const version = current.version + 1
    const timestamp = now()
    await connection.execute(`INSERT INTO workspaces (user_id,version,data,updated_at) VALUES (?,?,?,?)
      ON DUPLICATE KEY UPDATE version=VALUES(version),data=VALUES(data),updated_at=VALUES(updated_at)`, [userId, version, JSON.stringify(data || {}), timestamp])
    return { conflict: false, workspace: { version, data: data || {}, updatedAt: timestamp } }
  })
}

export async function createShare({ ownerId = null, title, messages, ttlMs = 90 * 24 * 60 * 60 * 1000 }) {
  const id = randomBytes(14).toString('base64url')
  const timestamp = now()
  await execute('INSERT INTO shared_conversations (id,owner_id,title,messages,created_at,expires_at) VALUES (?,?,?,?,?,?)', [id, ownerId, title, JSON.stringify(messages), timestamp, timestamp + ttlMs])
  return id
}

export async function getShare(id) {
  const [rows] = await execute('SELECT title,messages,created_at FROM shared_conversations WHERE id=? AND (expires_at IS NULL OR expires_at>?) LIMIT 1', [id, now()])
  const row = rows[0]
  return row ? { title: row.title, messages: jsonParse(row.messages, []), createdAt: Number(row.created_at) } : null
}

export async function recordUsage({ subject, kind, units, costUsd = 0, metadata = null }) {
  await execute('INSERT INTO usage_events (id,subject,kind,units,cost_usd,metadata,created_at) VALUES (?,?,?,?,?,?,?)', [randomUUID(), subject, kind, Number(units) || 0, Number(costUsd) || 0, metadata ? JSON.stringify(metadata) : null, now()])
}

export async function usageSince(subject, since) {
  const [summaryRows] = await execute('SELECT COALESCE(SUM(units),0) AS units,COALESCE(SUM(cost_usd),0) AS cost FROM usage_events WHERE subject=? AND created_at>=?', [subject, since])
  const [byKind] = await execute('SELECT kind,COALESCE(SUM(units),0) AS units,COUNT(*) AS requests FROM usage_events WHERE subject=? AND created_at>=? GROUP BY kind', [subject, since])
  return { units: Number(summaryRows[0]?.units || 0), costUsd: Number(summaryRows[0]?.cost || 0), byKind: byKind.map(row => ({ ...row, units: Number(row.units), requests: Number(row.requests) })) }
}

export async function storeFile({ ownerId = null, guestId = null, name, mimeType, buffer }) {
  const id = randomUUID()
  const timestamp = now()
  const checksum = createHash('sha256').update(buffer).digest('hex')
  await execute('INSERT INTO stored_files (id,owner_id,guest_id,name,mime_type,file_data,size,checksum,created_at) VALUES (?,?,?,?,?,?,?,?,?)', [id, ownerId, guestId, name, mimeType, buffer, buffer.length, checksum, timestamp])
  return { id, name, mimeType, size: buffer.length, checksum, createdAt: timestamp }
}

export async function getStoredFile(id, { ownerId = null, guestId = null } = {}) {
  const [rows] = await execute('SELECT * FROM stored_files WHERE id=? LIMIT 1', [id])
  const row = rows[0]
  if (!row || (row.owner_id && row.owner_id !== ownerId) || (!row.owner_id && row.guest_id !== guestId)) return null
  return { id: row.id, name: row.name, mimeType: row.mime_type, size: Number(row.size), checksum: row.checksum, buffer: Buffer.from(row.file_data) }
}

export async function createJob({ ownerId = null, guestId = null, type, payload = {} }) {
  const id = randomUUID()
  const timestamp = now()
  await execute('INSERT INTO jobs (id,owner_id,guest_id,type,status,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', [id, ownerId, guestId, type, 'queued', JSON.stringify(payload), timestamp, timestamp])
  return getJob(id, { ownerId, guestId })
}

function publicJob(row) {
  return row ? { id: row.id, type: row.type, status: row.status, payload: jsonParse(row.payload, {}), result: jsonParse(row.result, null), error: row.error, createdAt: Number(row.created_at), updatedAt: Number(row.updated_at) } : null
}

export async function updateJob(id, updates = {}) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute('SELECT * FROM jobs WHERE id=? FOR UPDATE', [id])
    const current = rows[0]
    if (!current) return null
    const result = updates.result === undefined ? current.result : updates.result === null ? null : JSON.stringify(updates.result)
    const error = updates.error === undefined ? current.error : updates.error
    await connection.execute('UPDATE jobs SET status=?,result=?,error=?,updated_at=? WHERE id=?', [updates.status || current.status, result, error, now(), id])
    const [updated] = await connection.execute('SELECT * FROM jobs WHERE id=?', [id])
    return publicJob(updated[0])
  })
}

export async function getJob(id, { ownerId = null, guestId = null } = {}) {
  const [rows] = await execute('SELECT * FROM jobs WHERE id=? LIMIT 1', [id])
  const row = rows[0]
  if (!row || (row.owner_id && row.owner_id !== ownerId) || (!row.owner_id && row.guest_id !== guestId)) return null
  return publicJob(row)
}

export async function listJobs({ ownerId = null, guestId = null } = {}, limit = 20) {
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20))
  const [rows] = ownerId
    ? await execute(`SELECT * FROM jobs WHERE owner_id=? ORDER BY updated_at DESC LIMIT ${safeLimit}`, [ownerId])
    : await execute(`SELECT * FROM jobs WHERE owner_id IS NULL AND guest_id=? ORDER BY updated_at DESC LIMIT ${safeLimit}`, [guestId])
  return rows.map(publicJob)
}

export async function getKnowledgeStore(ownerId, projectId) {
  const [rows] = await execute('SELECT * FROM knowledge_stores WHERE owner_id=? AND project_id=? LIMIT 1', [ownerId, String(projectId)])
  const row = rows[0]
  return row ? { projectId: row.project_id, storeName: row.store_name, displayName: row.display_name, updatedAt: Number(row.updated_at) } : null
}

export async function saveKnowledgeStore(ownerId, projectId, storeName, displayName) {
  const timestamp = now()
  await execute(`INSERT INTO knowledge_stores (owner_id,project_id,store_name,display_name,created_at,updated_at) VALUES (?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE store_name=VALUES(store_name),display_name=VALUES(display_name),updated_at=VALUES(updated_at)`, [ownerId, String(projectId), String(storeName), String(displayName), timestamp, timestamp])
  return getKnowledgeStore(ownerId, projectId)
}

export async function recordBillingEvent({ id, userId = null, eventType, payload = null }) {
  const [result] = await execute('INSERT IGNORE INTO billing_events (id,user_id,event_type,payload,processed_at) VALUES (?,?,?,?,?)', [String(id), userId, String(eventType), payload ? JSON.stringify(payload) : null, now()])
  return Number(result.affectedRows || 0) === 1
}
