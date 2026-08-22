export async function ensureBrowserAccount(evaluate, label = 'UI Smoke') {
  const email = `browser-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@mere.test`
  const password = 'MereBrowser!2468'
  const result = await evaluate(`(async () => {
    const sessionResponse = await fetch('/api/auth/session')
    const session = await sessionResponse.json()
    if (session.authenticated && session.user) return { ok: true, user: session.user, existing: true }
    const startResponse = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: ${JSON.stringify(label)}, email: ${JSON.stringify(email)}, password: ${JSON.stringify(password)} })
    })
    const start = await startResponse.json()
    if (!startResponse.ok || !start.challengeId || !start.previewCode) return { ok: false, status: startResponse.status, error: start.error || 'Local verification preview is unavailable.' }
    const verifyResponse = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: start.challengeId, code: start.previewCode })
    })
    const verified = await verifyResponse.json()
    return { ok: verifyResponse.ok, status: verifyResponse.status, user: verified.user, error: verified.error }
  })()`)
  if (!result?.ok) throw new Error(`Browser test account could not be prepared: ${result?.error || result?.status || 'unknown error'}`)
  return result.user
}
