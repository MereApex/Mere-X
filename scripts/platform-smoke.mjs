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

async function requestWithoutSession(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) },
  })
  const type = response.headers.get('content-type') || ''
  const body = type.includes('application/json') ? await response.json() : await response.arrayBuffer()
  return { response, body }
}

async function requestAllowError(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(cookie ? { Cookie: cookie } : {}), ...(options.headers || {}) },
  })
  const type = response.headers.get('content-type') || ''
  const body = type.includes('application/json') ? await response.json() : await response.arrayBuffer()
  return { response, body }
}

async function signupVerified({ name, email: accountEmail, password }) {
  const challenge = (await request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ name, email: accountEmail, password }) })).body
  assert(challenge.challengeId && challenge.previewCode, 'Development signup verification code was not created')
  return (await request('/api/auth/signup', { method: 'POST', body: JSON.stringify({ challengeId: challenge.challengeId, code: challenge.previewCode }) })).body
}

const report = {}
try {
  const protectedChecks = await Promise.all([
    requestWithoutSession('/api/usage'),
    requestWithoutSession('/api/chat', { method: 'POST', body: JSON.stringify({ message: 'UNAUTHENTICATED' }) }),
    requestWithoutSession('/api/files', { method: 'POST', body: JSON.stringify({ name: 'blocked.txt', mimeType: 'text/plain', data: Buffer.from('BLOCKED').toString('base64') }) }),
  ])
  assert(protectedChecks.every(result => result.response.status === 401), 'Private API accepted an unauthenticated request')
  report.privateApi = true

  const signup = await signupVerified({ name: 'Platform Smoke', email, password: originalPassword })
  assert(signup.user?.email === email, 'Signup did not return the new account')
  report.signup = true

  const session = (await request('/api/auth/session')).body
  assert(session.authenticated && session.user?.id, 'Session cookie was not authenticated')
  report.session = true

  const workspace = (await request('/api/workspace', { method: 'PUT', body: JSON.stringify({ version: 1, userId: session.user.id, data: { qa: 'WORKSPACE_OK', projects: [] } }) })).body
  const workspaceRead = (await request('/api/workspace')).body
  assert(workspace.version === 2 && workspaceRead.data?.qa === 'WORKSPACE_OK', 'Workspace persistence failed')
  report.workspace = true

  const upload = (await request('/api/files', { method: 'POST', body: JSON.stringify({ name: 'smoke.txt', mimeType: 'text/plain', data: Buffer.from('FILE_OK').toString('base64') }) })).body
  const download = await request(`/api/files/${upload.file.id}`)
  assert(Buffer.from(download.body).toString() === 'FILE_OK', 'Stored file download did not match')
  report.files = true

  const firstAccountCookie = cookie
  const secondEmail = `isolation-smoke-${Date.now()}@mere.test`
  cookie = ''
  await signupVerified({ name: 'Isolation Smoke', email: secondEmail, password: originalPassword })
  const secondAccountCookie = cookie
  const isolatedWorkspace = (await request('/api/workspace')).body
  assert(!isolatedWorkspace.data?.qa, 'A new account received another account workspace')
  const foreignFile = await requestAllowError(`/api/files/${upload.file.id}`)
  assert(foreignFile.response.status === 404, 'A second account could read the first account file')
  await request('/api/workspace', { method: 'PUT', body: JSON.stringify({ version: isolatedWorkspace.version, userId: isolatedWorkspace.userId, data: { qa: 'SECOND_ACCOUNT' } }) })
  // A tab that still believes it is the first account must never be able to write
  // that account's workspace into whoever is signed in now.
  const staleWrite = await requestAllowError('/api/workspace', { method: 'PUT', body: JSON.stringify({ version: 1, userId: session.user.id, data: { qa: 'STALE_TAB_LEAK' } }) })
  assert(staleWrite.response.status === 409 && staleWrite.body?.code === 'account-changed', 'A stale tab was allowed to write into the signed-in account')
  const untaggedWrite = await requestAllowError('/api/workspace', { method: 'PUT', body: JSON.stringify({ version: 1, data: { qa: 'UNTAGGED_LEAK' } }) })
  assert(untaggedWrite.response.status === 409, 'An untagged workspace write was accepted')
  const secondAfterStale = (await request('/api/workspace')).body
  assert(secondAfterStale.data?.qa === 'SECOND_ACCOUNT', 'A stale tab overwrote the second account workspace')
  report.accountIsolation = true
  cookie = firstAccountCookie
  const restoredFirstWorkspace = (await request('/api/workspace')).body
  assert(restoredFirstWorkspace.data?.qa === 'WORKSPACE_OK', 'Switching accounts changed the first account workspace')
  // Profile photo: stored, served back, private to the account, and removable.
  const onePixelPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  const missingPhoto = await requestAllowError('/api/account/avatar')
  assert(missingPhoto.response.status === 404, 'An account without a photo did not report one missing')
  const rejectedPhoto = await requestAllowError('/api/account/avatar', { method: 'POST', body: JSON.stringify({ mimeType: 'image/png', data: Buffer.from('definitely not a png').toString('base64') }) })
  assert(rejectedPhoto.response.status === 400, 'A file that is not an image was accepted as a profile photo')
  const savedPhoto = (await request('/api/account/avatar', { method: 'POST', body: JSON.stringify({ mimeType: 'image/png', data: onePixelPng.toString('base64') }) })).body
  assert(/^\/api\/account\/avatar\?v=\d+$/.test(savedPhoto.user?.avatar || ''), 'The saved profile photo was not returned on the account')
  const servedPhoto = await request('/api/account/avatar')
  assert(Buffer.from(servedPhoto.body).equals(onePixelPng), 'The stored profile photo did not come back unchanged')
  const clearedPhoto = (await request('/api/account/avatar', { method: 'DELETE' })).body
  assert(clearedPhoto.user?.avatar === null, 'The profile photo was not removed')
  report.profilePhoto = true

  // The account email can only move to an address that proves it is reachable.
  const unverifiedEmail = await requestAllowError('/api/account', { method: 'PATCH', body: JSON.stringify({ email: `moved-${Date.now()}@mere.test` }) })
  assert(unverifiedEmail.response.status === 400 && unverifiedEmail.body?.code === 'email-requires-verification', 'An account email changed without verification')
  const movedEmail = `moved-${Date.now()}@mere.test`
  const emailChallenge = (await request('/api/account/email', { method: 'POST', body: JSON.stringify({ email: movedEmail }) })).body
  assert(emailChallenge.challengeId && emailChallenge.previewCode, 'No confirmation code was issued for the new email address')
  const wrongEmailCode = await requestAllowError('/api/account/email', { method: 'POST', body: JSON.stringify({ challengeId: emailChallenge.challengeId, code: '000000' }) })
  assert(wrongEmailCode.response.status === 400, 'An incorrect email confirmation code was accepted')
  const movedAccount = (await request('/api/account/email', { method: 'POST', body: JSON.stringify({ challengeId: emailChallenge.challengeId, code: emailChallenge.previewCode }) })).body
  assert(movedAccount.user?.email === movedEmail, 'The verified email change was not applied')
  const restore = (await request('/api/account/email', { method: 'POST', body: JSON.stringify({ email }) })).body
  await request('/api/account/email', { method: 'POST', body: JSON.stringify({ challengeId: restore.challengeId, code: restore.previewCode }) })
  report.verifiedEmailChange = true

  const storage = (await request('/api/account/storage')).body
  assert(storage.files === 1 && storage.fileBytes >= 7, 'Account storage summary is not isolated')
  const exported = (await request('/api/account/export')).body
  assert(exported.account?.email === email && exported.workspace?.data?.qa === 'WORKSPACE_OK' && exported.files?.length === 1, 'Account export contained incorrect data')
  cookie = secondAccountCookie
  await request('/api/account', { method: 'DELETE', body: JSON.stringify({ password: originalPassword }) })
  cookie = firstAccountCookie
  report.accountIsolation = true

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
