const baseUrl = process.env.MERE_API_URL || 'http://127.0.0.1:8787'
const email = `platform-smoke-${Date.now()}@mere.test`
const originalPassword = 'MereSmoke!2468'
const nextPassword = 'MereSmoke!8642'
let cookie = ''

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) },
  })
  const setCookie = response.headers.get('set-cookie')
  const session = setCookie?.match(/mere_session=([^;,]+)/)?.[1]
  if (session !== undefined) cookie = session ? `mere_session=${session}` : ''
  const type = response.headers.get('content-type') || ''
  const body = type.includes('application/json') ? await response.json() : await response.arrayBuffer()
  if (!response.ok) throw new Error(`${path} returned ${response.status}: ${body?.error || 'request failed'}`)
  return { response, body }
}

async function signupVerified({ name, email: accountEmail, password }) {
  const challenge = (await request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email: accountEmail, password }) })).body
  assert(challenge.challengeId && challenge.previewCode, 'Development signup verification code was not created')
  return (await request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ challengeId: challenge.challengeId, code: challenge.previewCode }) })).body
}

const report = {}
try {
  const signup = await signupVerified({ name: 'Platform Smoke', email, password: originalPassword })
  assert(signup.user?.email === email, 'Signup did not return the new account')
  report.signup = true

  const session = (await request('/api/auth/session')).body
  assert(session.authenticated && session.user?.id, 'Session cookie was not authenticated')
  report.session = true

  const workspace = (await request('/api/workspace', { method: 'PUT', body: JSON.stringify({ version: 1, data: { qa: 'WORKSPACE_OK', projects: [] } }) })).body
  const workspaceRead = (await request('/api/workspace')).body
  assert(workspace.version === 2 && workspaceRead.data?.qa === 'WORKSPACE_OK', 'Workspace persistence failed')
  report.workspace = true

  const upload = (await request('/api/files', { method: 'POST', body: JSON.stringify({ name: 'smoke.txt', mimeType: 'text/plain', data: Buffer.from('FILE_OK').toString('base64') }) })).body
  const download = await request(`/api/files/${upload.file.id}`)
  assert(Buffer.from(download.body).toString() === 'FILE_OK', 'Stored file download did not match')
  report.files = true

  const share = (await request('/api/share', { method: 'POST', body: JSON.stringify({ title: 'Smoke conversation', messages: [{ id: 1, role: 'user', content: 'SHARE_OK' }] }) })).body
  const shared = (await request(`/api/share/${share.id}`)).body
  assert(shared.messages?.[0]?.content === 'SHARE_OK', 'Durable share could not be read')
  report.sharing = true

  const usage = (await request('/api/usage')).body
  assert(usage.window?.resetAt && usage.state, 'Usage summary is incomplete')
  report.usage = usage.state

  const billingConfig = (await request('/api/billing/config')).body
  const billingState = (await request('/api/billing/subscription')).body
  const billingHistory = (await request('/api/billing/history')).body
  assert(typeof billingConfig.enabled === 'boolean' && billingConfig.currency, 'Billing configuration is incomplete')
  assert(billingState.subscription === null && Array.isArray(billingHistory.transactions), 'Billing account state is incomplete')
  report.billing = true

  const sessions = (await request('/api/account/sessions')).body
  assert(sessions.sessions?.some(item => item.current), 'Current session was not identified')
  report.sessionManagement = true

  const passwordChange = (await request('/api/account/password', { method: 'POST', body: JSON.stringify({ currentPassword: originalPassword, password: nextPassword }) })).body
  assert(passwordChange.challengeId && passwordChange.previewCode, 'Development password-change verification code was not created')
  await request('/api/account/password', { method: 'POST', body: JSON.stringify({ challengeId: passwordChange.challengeId, code: passwordChange.previewCode }) })
  await request('/api/auth/signout', { method: 'POST' })
  const signin = (await request('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email, password: nextPassword, remember: false }) })).body
  assert(signin.user?.email === email, 'Sign-in with the updated password failed')
  report.passwordChange = true

  await request('/api/account', { method: 'DELETE', body: JSON.stringify({ password: nextPassword }) })
  const deletedSession = (await request('/api/auth/session')).body
  assert(!deletedSession.authenticated, 'Deleted account remained authenticated')
  report.accountDeletion = true

  const resetEmail = `reset-smoke-${Date.now()}@mere.test`
  cookie = ''
  await signupVerified({ name: 'Reset Smoke', email: resetEmail, password: originalPassword })
  const forgot = (await request('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: resetEmail }) })).body
  assert(forgot.challengeId && forgot.previewCode, 'Development reset verification code was not created')
  await request('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ challengeId: forgot.challengeId, code: forgot.previewCode, password: nextPassword }) })
  cookie = ''
  await request('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email: resetEmail, password: nextPassword }) })
  await request('/api/account', { method: 'DELETE', body: JSON.stringify({ password: nextPassword }) })
  report.passwordReset = true

  console.log(JSON.stringify({ ok: true, ...report }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message, ...report }, null, 2))
  process.exitCode = 1
}
