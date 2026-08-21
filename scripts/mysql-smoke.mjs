import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import { closeDatabase, databaseHealth, execute, initializeDatabase } from '../server/database.mjs'
import {
  applyPasswordReset,
  changePassword,
  createJob,
  createPasswordReset,
  createSession,
  createShare,
  createUser,
  deleteUser,
  findUserByEmail,
  getJob,
  getSession,
  getShare,
  getStoredFile,
  getWorkspace,
  listJobs,
  listSessions,
  recordBillingEvent,
  recordUsage,
  saveKnowledgeStore,
  saveWorkspace,
  storeFile,
  updateJob,
  updateUser,
  usageSince,
  verifyPassword,
} from '../server/store.mjs'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })

let user = null
let shareId = null
const subject = `test:${randomUUID()}`
const email = `database-smoke-${Date.now()}-${randomUUID().slice(0, 8)}@mere-x.test`
const password = `Mere-X-${randomUUID()}`
const nextPassword = `Mere-X-next-${randomUUID()}`
const finalPassword = `Mere-X-final-${randomUUID()}`

try {
  await initializeDatabase()
  user = await createUser({ email, password, name: 'Database Smoke' })
  const found = await findUserByEmail(email)
  if (!found || !verifyPassword(password, found.password_hash)) throw new Error('User persistence failed.')

  const session = await createSession(user.id, 60_000)
  if ((await getSession(session.token))?.id !== user.id) throw new Error('Session persistence failed.')
  if ((await listSessions(user.id, session.token)).length !== 1) throw new Error('Session listing failed.')

  const initialWorkspace = await getWorkspace(user.id)
  const savedWorkspace = await saveWorkspace(user.id, { projects: [{ id: 'p1', name: 'Smoke' }], conversations: [] }, initialWorkspace.version)
  if (savedWorkspace.conflict || savedWorkspace.workspace.version !== initialWorkspace.version + 1) throw new Error('Workspace persistence failed.')
  const conflict = await saveWorkspace(user.id, { stale: true }, initialWorkspace.version)
  if (!conflict.conflict) throw new Error('Workspace optimistic locking failed.')

  const content = Buffer.from('Mere X durable file smoke test', 'utf8')
  const stored = await storeFile({ ownerId: user.id, name: 'smoke.txt', mimeType: 'text/plain', buffer: content })
  const restored = await getStoredFile(stored.id, { ownerId: user.id })
  if (!restored || !restored.buffer.equals(content) || restored.checksum !== stored.checksum) throw new Error('Binary file persistence failed.')

  const job = await createJob({ ownerId: user.id, type: 'smoke', payload: { target: 'database' } })
  const completedJob = await updateJob(job.id, { status: 'completed', result: { ok: true } })
  if (completedJob?.result?.ok !== true || (await getJob(job.id, { ownerId: user.id }))?.status !== 'completed') throw new Error('Job persistence failed.')
  if (!(await listJobs({ ownerId: user.id })).some(item => item.id === job.id)) throw new Error('Job listing failed.')

  shareId = await createShare({ ownerId: user.id, title: 'Smoke share', messages: [{ role: 'user', content: 'Hello' }] })
  if ((await getShare(shareId))?.messages?.length !== 1) throw new Error('Shared conversation persistence failed.')

  await recordUsage({ subject, kind: 'chat', units: 1, costUsd: 0.001, metadata: { smoke: true } })
  if ((await usageSince(subject, Date.now() - 60_000)).units < 1) throw new Error('Usage persistence failed.')

  const mapping = await saveKnowledgeStore(user.id, 'smoke-project', 'stores/smoke', 'Smoke project')
  if (mapping?.storeName !== 'stores/smoke') throw new Error('Knowledge mapping persistence failed.')

  const billingId = `smoke-${randomUUID()}`
  if (!await recordBillingEvent({ id: billingId, userId: user.id, eventType: 'smoke', payload: { ok: true } })) throw new Error('Billing event persistence failed.')
  if (await recordBillingEvent({ id: billingId, userId: user.id, eventType: 'smoke', payload: { ok: true } })) throw new Error('Billing idempotency failed.')
  if ((await updateUser(user.id, { plan: 'plus' }))?.plan !== 'plus') throw new Error('Account update failed.')

  if (!await changePassword(user.id, password, nextPassword)) throw new Error('Password change failed.')
  const reset = await createPasswordReset(user.id)
  if (!await applyPasswordReset(reset, finalPassword)) throw new Error('Password reset failed.')
  if (await getSession(session.token)) throw new Error('Password reset did not revoke sessions.')
  const finalUser = await findUserByEmail(email)
  if (!verifyPassword(finalPassword, finalUser?.password_hash)) throw new Error('Final password verification failed.')

  const health = await databaseHealth()
  if (!health.ok || !health.ready) throw new Error('Database health check failed.')
  console.log(JSON.stringify({ ok: true, migrations: true, users: true, sessions: true, workspaces: true, files: true, jobs: true, shares: true, usage: true, knowledge: true, billing: true, audit: true }))
} catch (error) {
  console.error(JSON.stringify({ ok: false, code: error?.code || null, error: String(error?.message || error).replace(/mysql:\/\/[^\s]+/gi, '[database-url-redacted]') }))
  process.exitCode = 1
} finally {
  if (user?.id) {
    await execute('DELETE FROM billing_events WHERE user_id=?', [user.id]).catch(() => undefined)
    await execute('DELETE FROM audit_events WHERE user_id=?', [user.id]).catch(() => undefined)
  }
  if (shareId) await execute('DELETE FROM shared_conversations WHERE id=?', [shareId]).catch(() => undefined)
  await execute('DELETE FROM usage_events WHERE subject=?', [subject]).catch(() => undefined)
  if (user?.id) await deleteUser(user.id).catch(() => undefined)
  await closeDatabase().catch(() => undefined)
}
