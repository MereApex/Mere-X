import { createHash, createHmac, randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'
import { execute, withTransaction } from './database.mjs'

const now = () => Date.now()
const productionRuntime = () => process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT)
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

function challengeHash(id, code) {
  const configured = String(process.env.AUTH_CODE_SECRET || '')
  if (productionRuntime() && configured.length < 32) throw new Error('AUTH_CODE_SECRET must contain at least 32 characters.')
  const secret = configured || 'mere-x-local-email-code-secret-do-not-use-in-production'
  return createHmac('sha256', secret).update(`${id}:${String(code)}`).digest('hex')
}

function validChallengeCode(row, code) {
  const actual = Buffer.from(challengeHash(row.id, code), 'hex')
  const expected = Buffer.from(String(row.code_hash || ''), 'hex')
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

function verificationCode() {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}

export async function createUser({ email, password, name }) {
  const timestamp = now()
  const user = { id: randomUUID(), email: normalizeEmail(email), name: String(name).trim(), plan: 'free', createdAt: timestamp }
  await withTransaction(async connection => {
    await connection.execute('INSERT INTO users (id,email,password_hash,name,plan,email_verified_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', [user.id, user.email, hashPassword(password), user.name, user.plan, timestamp, timestamp, timestamp])
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
    execute('DELETE FROM email_challenges WHERE expires_at<=? OR consumed_at IS NOT NULL', [timestamp]),
    execute('DELETE FROM shared_conversations WHERE expires_at IS NOT NULL AND expires_at<=?', [timestamp]),
    execute("DELETE FROM jobs WHERE owner_id IS NULL AND updated_at<? AND status IN ('completed','failed','cancelled')", [timestamp - 30 * 24 * 60 * 60 * 1000]),
    execute('DELETE FROM usage_events WHERE created_at<?', [timestamp - 400 * 24 * 60 * 60 * 1000]),
  ])
  await expireEndedBillingAccess(timestamp)
}

export async function createSignupChallenge({ email, password, name, ttlMs = 10 * 60 * 1000 }) {
  const id = randomUUID()
  const code = verificationCode()
  const normalizedEmail = normalizeEmail(email)
  const timestamp = now()
  await withTransaction(async connection => {
    await connection.execute("DELETE FROM email_challenges WHERE email=? AND purpose='signup' AND consumed_at IS NULL", [normalizedEmail])
    await connection.execute(`INSERT INTO email_challenges (id,email,purpose,code_hash,name,password_hash,attempts,expires_at,created_at)
      VALUES (?,?,'signup',?,?,?,?,?,?)`, [id, normalizedEmail, challengeHash(id, code), String(name).trim(), hashPassword(password), 0, timestamp + ttlMs, timestamp])
  })
  return { id, code, expiresAt: timestamp + ttlMs }
}

export async function consumeSignupChallenge({ id, code }) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute("SELECT * FROM email_challenges WHERE id=? AND purpose='signup' FOR UPDATE", [String(id)])
    const challenge = rows[0]
    if (!challenge || challenge.consumed_at !== null || Number(challenge.expires_at) <= now() || Number(challenge.attempts) >= 5) return null
    if (!validChallengeCode(challenge, code)) {
      await connection.execute('UPDATE email_challenges SET attempts=attempts+1 WHERE id=?', [challenge.id])
      return null
    }
    const [existing] = await connection.execute('SELECT id FROM users WHERE email=? LIMIT 1', [challenge.email])
    if (existing[0]) throw Object.assign(new Error('An account with this email already exists.'), { code: 'ER_DUP_ENTRY' })
    const timestamp = now()
    const user = { id: randomUUID(), email: challenge.email, name: challenge.name, plan: 'free', created_at: timestamp }
    await connection.execute('INSERT INTO users (id,email,password_hash,name,plan,email_verified_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', [user.id, user.email, challenge.password_hash, user.name, user.plan, timestamp, timestamp, timestamp])
    await connection.execute('INSERT INTO workspaces (user_id,version,data,updated_at) VALUES (?,?,?,?)', [user.id, 1, '{}', timestamp])
    await connection.execute('UPDATE email_challenges SET consumed_at=? WHERE id=?', [timestamp, challenge.id])
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), user.id, 'account.created', JSON.stringify({ method: 'email_code' }), timestamp])
    return publicUser(user)
  })
}

export async function createPasswordResetChallenge({ userId, email, ttlMs = 10 * 60 * 1000 }) {
  const id = randomUUID()
  const code = verificationCode()
  const normalizedEmail = normalizeEmail(email)
  const timestamp = now()
  await withTransaction(async connection => {
    await connection.execute("DELETE FROM email_challenges WHERE email=? AND purpose='password_reset' AND consumed_at IS NULL", [normalizedEmail])
    await connection.execute(`INSERT INTO email_challenges (id,email,purpose,code_hash,name,password_hash,attempts,expires_at,created_at)
      VALUES (?,?,'password_reset',?,NULL,NULL,0,?,?)`, [id, normalizedEmail, challengeHash(id, code), timestamp + ttlMs, timestamp])
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), userId, 'account.password_reset_requested', null, timestamp])
  })
  return { id, code, expiresAt: timestamp + ttlMs }
}

export async function applyPasswordResetCode({ id, code, password }) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute("SELECT * FROM email_challenges WHERE id=? AND purpose='password_reset' FOR UPDATE", [String(id)])
    const challenge = rows[0]
    if (!challenge || challenge.consumed_at !== null || Number(challenge.expires_at) <= now() || Number(challenge.attempts) >= 5) return false
    if (!validChallengeCode(challenge, code)) {
      await connection.execute('UPDATE email_challenges SET attempts=attempts+1 WHERE id=?', [challenge.id])
      return false
    }
    const [users] = await connection.execute('SELECT id FROM users WHERE email=? LIMIT 1 FOR UPDATE', [challenge.email])
    const user = users[0]
    if (!user) return false
    const timestamp = now()
    await connection.execute('UPDATE users SET password_hash=?,updated_at=? WHERE id=?', [hashPassword(password), timestamp, user.id])
    await connection.execute('UPDATE email_challenges SET consumed_at=? WHERE id=?', [timestamp, challenge.id])
    await connection.execute('DELETE FROM sessions WHERE user_id=?', [user.id])
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), user.id, 'account.password_reset', JSON.stringify({ method: 'email_code' }), timestamp])
    return true
  })
}

export async function createPasswordChangeChallenge({ userId, currentPassword, password, ttlMs = 10 * 60 * 1000 }) {
  return withTransaction(async connection => {
    const [users] = await connection.execute('SELECT id,email,password_hash FROM users WHERE id=? FOR UPDATE', [userId])
    const user = users[0]
    if (!user || !verifyPassword(currentPassword, user.password_hash)) return null
    const id = randomUUID()
    const code = verificationCode()
    const timestamp = now()
    await connection.execute("DELETE FROM email_challenges WHERE email=? AND purpose='password_change' AND consumed_at IS NULL", [user.email])
    await connection.execute(`INSERT INTO email_challenges (id,email,purpose,code_hash,name,password_hash,attempts,expires_at,created_at)
      VALUES (?,?,'password_change',?,NULL,?,0,?,?)`, [id, user.email, challengeHash(id, code), hashPassword(password), timestamp + ttlMs, timestamp])
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), userId, 'account.password_change_requested', null, timestamp])
    return { id, code, email: user.email, expiresAt: timestamp + ttlMs }
  })
}

export async function applyPasswordChangeCode({ id, code, userId }) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute("SELECT * FROM email_challenges WHERE id=? AND purpose='password_change' FOR UPDATE", [String(id)])
    const challenge = rows[0]
    if (!challenge || challenge.consumed_at !== null || Number(challenge.expires_at) <= now() || Number(challenge.attempts) >= 5) return false
    const [users] = await connection.execute('SELECT id,email FROM users WHERE id=? FOR UPDATE', [userId])
    const user = users[0]
    if (!user || normalizeEmail(user.email) !== normalizeEmail(challenge.email)) return false
    if (!validChallengeCode(challenge, code)) {
      await connection.execute('UPDATE email_challenges SET attempts=attempts+1 WHERE id=?', [challenge.id])
      return false
    }
    const timestamp = now()
    await connection.execute('UPDATE users SET password_hash=?,updated_at=? WHERE id=?', [challenge.password_hash, timestamp, user.id])
    await connection.execute('UPDATE email_challenges SET consumed_at=? WHERE id=?', [timestamp, challenge.id])
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), user.id, 'account.password_changed', JSON.stringify({ method: 'email_code' }), timestamp])
    return true
  })
}

export async function signInWithGoogleIdentity({ subject, email, name, authoritativeEmail }) {
  const provider = 'google'
  const normalizedEmail = normalizeEmail(email)
  return withTransaction(async connection => {
    const [identityRows] = await connection.execute(`SELECT users.* FROM auth_identities
      JOIN users ON users.id=auth_identities.user_id WHERE auth_identities.provider=? AND auth_identities.provider_subject=? LIMIT 1 FOR UPDATE`, [provider, String(subject)])
    if (identityRows[0]) return { user: publicUser(identityRows[0]), created: false }
    const [emailRows] = await connection.execute('SELECT * FROM users WHERE email=? LIMIT 1 FOR UPDATE', [normalizedEmail])
    let userRow = emailRows[0]
    if (userRow && !authoritativeEmail) return { conflict: true }
    const timestamp = now()
    let created = false
    if (!userRow) {
      created = true
      userRow = { id: randomUUID(), email: normalizedEmail, name: String(name || normalizedEmail.split('@')[0]).trim().slice(0, 100), plan: 'free', created_at: timestamp }
      await connection.execute('INSERT INTO users (id,email,password_hash,name,plan,email_verified_at,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', [userRow.id, userRow.email, hashPassword(randomBytes(32).toString('base64url')), userRow.name, userRow.plan, timestamp, timestamp, timestamp])
      await connection.execute('INSERT INTO workspaces (user_id,version,data,updated_at) VALUES (?,?,?,?)', [userRow.id, 1, '{}', timestamp])
    }
    await connection.execute('INSERT INTO auth_identities (provider,provider_subject,user_id,provider_email,created_at) VALUES (?,?,?,?,?)', [provider, String(subject), userRow.id, normalizedEmail, timestamp])
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), userRow.id, created ? 'account.created' : 'account.identity_linked', JSON.stringify({ method: 'google' }), timestamp])
    return { user: publicUser(userRow), created }
  })
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

function publicBillingSubscription(row) {
  return row ? {
    id: row.id,
    userId: row.user_id,
    subscriptionId: row.provider_subscription_id,
    plan: row.plan_key,
    billingCycle: row.billing_cycle,
    quantity: Number(row.quantity || 1),
    status: row.status,
    payerId: row.payer_id || undefined,
    accessExpiresAt: row.access_expires_at === null ? null : Number(row.access_expires_at),
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  } : null
}

export async function getBillingProduct(environment, productKey = 'mere-x-membership') {
  const [rows] = await execute('SELECT * FROM billing_products WHERE environment=? AND product_key=? LIMIT 1', [environment, productKey])
  return rows[0] || null
}

export async function upsertBillingProduct({ environment, productKey = 'mere-x-membership', providerProductId, status = 'ACTIVE', payload = null }) {
  const timestamp = now()
  await execute(`INSERT INTO billing_products (environment,product_key,provider_product_id,status,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE provider_product_id=VALUES(provider_product_id),status=VALUES(status),payload=VALUES(payload),updated_at=VALUES(updated_at)`, [environment, productKey, providerProductId, status, payload ? JSON.stringify(payload) : null, timestamp, timestamp])
  return getBillingProduct(environment, productKey)
}

export async function getBillingPlan(environment, planKey, billingCycle) {
  const [rows] = await execute('SELECT * FROM billing_plans WHERE environment=? AND plan_key=? AND billing_cycle=? LIMIT 1', [environment, planKey, billingCycle])
  return rows[0] || null
}

export async function getBillingPlanByProviderId(providerPlanId) {
  const [rows] = await execute('SELECT * FROM billing_plans WHERE provider_plan_id=? LIMIT 1', [providerPlanId])
  return rows[0] || null
}

export async function upsertBillingPlan({ environment, planKey, billingCycle, currency, unitAmount, providerPlanId, status, payload = null }) {
  const timestamp = now()
  await execute(`INSERT INTO billing_plans (environment,plan_key,billing_cycle,currency,unit_amount,provider_plan_id,status,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE currency=VALUES(currency),unit_amount=VALUES(unit_amount),provider_plan_id=VALUES(provider_plan_id),status=VALUES(status),payload=VALUES(payload),updated_at=VALUES(updated_at)`, [environment, planKey, billingCycle, currency, unitAmount, providerPlanId, status, payload ? JSON.stringify(payload) : null, timestamp, timestamp])
  return getBillingPlan(environment, planKey, billingCycle)
}

export async function createBillingSubscription({ userId, providerSubscriptionId, providerPlanId, planKey, billingCycle, quantity = 1, status = 'APPROVAL_PENDING', payload = null }) {
  const timestamp = now()
  const id = randomUUID()
  await execute(`INSERT INTO billing_subscriptions (id,user_id,provider_subscription_id,provider_plan_id,plan_key,billing_cycle,quantity,status,payload,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE payload=VALUES(payload),updated_at=VALUES(updated_at)`, [id, userId, providerSubscriptionId, providerPlanId, planKey, billingCycle, quantity, status, payload ? JSON.stringify(payload) : null, timestamp, timestamp])
  return getBillingSubscriptionByProviderId(providerSubscriptionId)
}

export async function getBillingSubscriptionByProviderId(providerSubscriptionId) {
  const [rows] = await execute('SELECT * FROM billing_subscriptions WHERE provider_subscription_id=? LIMIT 1', [providerSubscriptionId])
  return publicBillingSubscription(rows[0])
}

export async function getCurrentBillingSubscription(userId) {
  const [rows] = await execute(`SELECT * FROM billing_subscriptions WHERE user_id=?
    ORDER BY FIELD(status,'ACTIVE','APPROVED','APPROVAL_PENDING','SUSPENDED','CANCELLED','EXPIRED'),updated_at DESC LIMIT 1`, [userId])
  return publicBillingSubscription(rows[0])
}

export async function syncBillingSubscription({ providerSubscriptionId, status, payerId, accessExpiresAt, cancelAtPeriodEnd, payload = null, planKey = null, billingCycle = null, quantity = null }) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute('SELECT * FROM billing_subscriptions WHERE provider_subscription_id=? FOR UPDATE', [providerSubscriptionId])
    const current = rows[0]
    if (!current) return null
    const nextStatus = String(status || current.status).toUpperCase()
    const nextPlan = planKey || current.plan_key
    const nextCycle = billingCycle || current.billing_cycle
    const nextQuantity = quantity === null ? Number(current.quantity) : Math.max(1, Number(quantity) || 1)
    const nextExpiry = accessExpiresAt === undefined ? current.access_expires_at : accessExpiresAt
    const nextCancel = cancelAtPeriodEnd === undefined ? Boolean(current.cancel_at_period_end) : Boolean(cancelAtPeriodEnd)
    const timestamp = now()
    await connection.execute(`UPDATE billing_subscriptions SET plan_key=?,billing_cycle=?,quantity=?,status=?,payer_id=?,access_expires_at=?,cancel_at_period_end=?,payload=?,updated_at=? WHERE id=?`, [nextPlan, nextCycle, nextQuantity, nextStatus, payerId === undefined ? current.payer_id : payerId, nextExpiry, nextCancel ? 1 : 0, payload ? JSON.stringify(payload) : current.payload, timestamp, current.id])
    if (nextStatus === 'ACTIVE') {
      await connection.execute('UPDATE users SET plan=?,updated_at=? WHERE id=?', [nextPlan, timestamp, current.user_id])
    } else if (['CANCELLED', 'EXPIRED', 'SUSPENDED'].includes(nextStatus) && nextExpiry !== null && Number(nextExpiry) <= timestamp) {
      const [otherRows] = await connection.execute("SELECT COUNT(*) AS total FROM billing_subscriptions WHERE user_id=? AND id<>? AND status='ACTIVE'", [current.user_id, current.id])
      if (!Number(otherRows[0]?.total || 0)) await connection.execute("UPDATE users SET plan='free',updated_at=? WHERE id=?", [timestamp, current.user_id])
    }
    await connection.execute('INSERT INTO audit_events (id,user_id,action,metadata,created_at) VALUES (?,?,?,?,?)', [randomUUID(), current.user_id, 'billing.subscription_synced', JSON.stringify({ subscriptionId: providerSubscriptionId, status: nextStatus, plan: nextPlan, cycle: nextCycle }), timestamp])
    const [updated] = await connection.execute('SELECT * FROM billing_subscriptions WHERE id=?', [current.id])
    return publicBillingSubscription(updated[0])
  })
}

export async function recordBillingTransaction({ id, subscriptionId = null, userId = null, providerTransactionId = null, eventType, status, amount = null, currency = null, payload = null }) {
  const [result] = await execute(`INSERT IGNORE INTO billing_transactions (id,subscription_id,user_id,provider_transaction_id,event_type,status,amount,currency,payload,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`, [String(id), subscriptionId, userId, providerTransactionId, String(eventType), String(status), amount, currency, payload ? JSON.stringify(payload) : null, now()])
  return Number(result.affectedRows || 0) === 1
}

export async function listBillingTransactions(userId, limit = 30) {
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 30))
  const [rows] = await execute(`SELECT id,event_type,status,amount,currency,created_at FROM billing_transactions WHERE user_id=? ORDER BY created_at DESC LIMIT ${safeLimit}`, [userId])
  return rows.map(row => ({ id: row.id, type: row.event_type, status: row.status, amount: row.amount === null ? null : Number(row.amount), currency: row.currency, createdAt: Number(row.created_at) }))
}

export async function expireEndedBillingAccess(timestamp = now()) {
  return withTransaction(async connection => {
    const [rows] = await connection.execute(`SELECT DISTINCT user_id FROM billing_subscriptions WHERE status IN ('CANCELLED','EXPIRED','SUSPENDED') AND access_expires_at IS NOT NULL AND access_expires_at<=?`, [timestamp])
    let downgraded = 0
    for (const row of rows) {
      const [activeRows] = await connection.execute("SELECT COUNT(*) AS total FROM billing_subscriptions WHERE user_id=? AND status='ACTIVE'", [row.user_id])
      if (Number(activeRows[0]?.total || 0)) continue
      const [result] = await connection.execute("UPDATE users SET plan='free',updated_at=? WHERE id=? AND plan<>'free'", [timestamp, row.user_id])
      downgraded += Number(result.affectedRows || 0)
    }
    return downgraded
  })
}
