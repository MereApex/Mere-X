import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { getSession, recordUsage, usageSince } from './store.mjs'

export const SESSION_COOKIE = 'mere_session'
export const GUEST_COOKIE = 'mere_guest'

export const plans = {
  guest: { id: 'guest', label: 'Preview', windowUnits: 60, heavyDailyUnits: 28, mediaMonthlyUnits: 14, agenticMonthlyUnits: 0, monthlyCostCap: 0.15 },
  free: { id: 'free', label: 'Free', windowUnits: 120, heavyDailyUnits: 70, mediaMonthlyUnits: 42, agenticMonthlyUnits: 50, monthlyCostCap: 0.75 },
  plus: { id: 'plus', label: 'Plus', windowUnits: 720, heavyDailyUnits: 420, mediaMonthlyUnits: 700, agenticMonthlyUnits: 520, monthlyCostCap: 8.5 },
  pro: { id: 'pro', label: 'Pro', windowUnits: 2600, heavyDailyUnits: 1800, mediaMonthlyUnits: 2100, agenticMonthlyUnits: 2200, monthlyCostCap: 24 },
  team: { id: 'team', label: 'Team', windowUnits: 1200, heavyDailyUnits: 720, mediaMonthlyUnits: 800, agenticMonthlyUnits: 800, monthlyCostCap: 10 },
  enterprise: { id: 'enterprise', label: 'Enterprise', windowUnits: 10000, heavyDailyUnits: 10000, mediaMonthlyUnits: 20000, agenticMonthlyUnits: 20000, monthlyCostCap: 500 },
}

export const usageWeights = {
  chat: 1,
  research: 5,
  image: 14,
  export: 1,
  file: 2,
  deepResearch: 50,
  agent: 100,
  computer: 120,
  video: 200,
  voice: 2,
}

const conservativeCostUsd = {
  chat: 0.008,
  research: 0.04,
  image: 0.16,
  export: 0.002,
  file: 0.004,
  deepResearch: 0.7,
  agent: 1.1,
  computer: 1.25,
  video: 1.3,
  voice: 0.08,
}

const heavyKinds = new Set(['image', 'deepResearch', 'agent', 'computer', 'video'])
const mediaKinds = new Set(['image', 'video'])
const agenticKinds = new Set(['deepResearch', 'agent', 'computer'])

function unitsForKinds(summary, kinds) {
  return summary.byKind.filter(item => kinds.has(item.kind)).reduce((sum, item) => sum + Number(item.units || 0), 0)
}

const capabilityLabels = {
  chat: 'Chat',
  research: 'Research',
  image: 'Image creation',
  export: 'Document export',
  file: 'File analysis',
  deepResearch: 'Deep Research',
  agent: 'Autonomous Agent',
  computer: 'Computer Workspace',
  video: 'Video Studio',
  voice: 'Live voice',
}

// Whether a plan could ever afford one request of this kind, on a completely
// unused account. A plan whose caps are smaller than a single request does not
// include the capability at all, and saying "try again later" about it would be
// false: waiting never helps.
export function planIncludes(planId, kind, multiplier = 1) {
  const plan = plans[planId] || plans.guest
  const units = (usageWeights[kind] || 1) * Math.max(0.25, Number(multiplier) || 1)
  const cost = (conservativeCostUsd[kind] || 0.01) * Math.max(0.25, Number(multiplier) || 1)
  if (units > plan.windowUnits) return false
  if (cost > plan.monthlyCostCap) return false
  if (heavyKinds.has(kind) && units > plan.heavyDailyUnits) return false
  if (mediaKinds.has(kind) && units > plan.mediaMonthlyUnits) return false
  if (agenticKinds.has(kind) && units > plan.agenticMonthlyUnits) return false
  return true
}

export function planCapabilities(planId) {
  return Object.fromEntries(Object.keys(usageWeights).map(kind => [kind, {
    label: capabilityLabels[kind] || kind,
    included: planIncludes(planId, kind),
  }]))
}

export function parseCookies(header = '') {
  return String(header).split(';').reduce((cookies, part) => {
    const index = part.indexOf('=')
    if (index <= 0) return cookies
    const key = part.slice(0, index).trim()
    try { cookies[key] = decodeURIComponent(part.slice(index + 1).trim()) } catch { /* Ignore malformed cookies. */ }
    return cookies
  }, {})
}

function cookieOptions(maxAgeSeconds) {
  return [
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    process.env.NODE_ENV === 'production' ? 'Secure' : '',
    Number.isFinite(maxAgeSeconds) ? `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}` : '',
  ].filter(Boolean).join('; ')
}

// Several cookies are written on the same response (a new session plus the guest
// cookie it replaces), so every write must append rather than overwrite the header.
function appendCookie(res, cookie) {
  const existing = res.getHeader('Set-Cookie')
  if (!existing) return res.setHeader('Set-Cookie', cookie)
  res.setHeader('Set-Cookie', Array.isArray(existing) ? [...existing, cookie] : [existing, cookie])
}

export function setSessionCookie(res, token, expiresAt) {
  appendCookie(res, `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions((expiresAt - Date.now()) / 1000)}`)
  // The signed-in account owns its data from here on. Dropping the guest
  // identifier stops browser-scoped work from being shared between the accounts
  // that sign in on this device.
  appendCookie(res, `${GUEST_COOKIE}=; ${cookieOptions(0)}`)
}

export function clearSessionCookie(res) {
  appendCookie(res, `${SESSION_COOKIE}=; ${cookieOptions(0)}`)
  // Signing out starts a fresh browser identity so the next visitor on this
  // device never inherits the previous one's guest scope.
  appendCookie(res, `${GUEST_COOKIE}=${randomBytes(18).toString('base64url')}; ${cookieOptions(31536000)}`)
}

export async function resolveIdentity(req, res) {
  const cookies = parseCookies(req.headers.cookie)
  const user = await getSession(cookies[SESSION_COOKIE])
  let guestId = user ? null : cookies[GUEST_COOKIE]
  if (!user && !guestId) {
    guestId = randomBytes(18).toString('base64url')
    appendCookie(res, `${GUEST_COOKIE}=${guestId}; ${cookieOptions(31536000)}`)
  }
  req.identity = {
    user,
    guestId,
    subject: user ? `user:${user.id}` : `guest:${guestId || req.ip || 'anonymous'}`,
    sessionToken: user ? cookies[SESSION_COOKIE] : undefined,
  }
  return req.identity
}

export function requireUser(req, res, next) {
  if (!req.identity?.user) return res.status(401).json({ error: 'Sign in to use this feature.' })
  next()
}

function nextWindowReset(timestamp = Date.now()) {
  return timestamp + 5 * 60 * 60 * 1000
}

export async function usageSummary(identity, timestamp = Date.now()) {
  const plan = plans[identity?.user?.plan] || plans.guest
  const [rolling, daily, monthly] = await Promise.all([
    usageSince(identity.subject, timestamp - 5 * 60 * 60 * 1000),
    usageSince(identity.subject, timestamp - 24 * 60 * 60 * 1000),
    usageSince(identity.subject, timestamp - 30 * 24 * 60 * 60 * 1000),
  ])
  const heavyUsed = unitsForKinds(daily, heavyKinds)
  const mediaUsed = unitsForKinds(monthly, mediaKinds)
  const agenticUsed = unitsForKinds(monthly, agenticKinds)
  const ratio = Math.max(rolling.units / plan.windowUnits, heavyUsed / plan.heavyDailyUnits, mediaUsed / Math.max(1, plan.mediaMonthlyUnits), agenticUsed / Math.max(1, plan.agenticMonthlyUnits), monthly.costUsd / plan.monthlyCostCap)
  return {
    plan: plan.id,
    label: plan.label,
    capabilities: planCapabilities(plan.id),
    state: ratio < 0.55 ? 'available' : ratio < 0.82 ? 'active' : ratio < 1 ? 'limited' : 'paused',
    window: { state: ratio < 0.82 ? 'standard' : ratio < 1 ? 'nearing-limit' : 'paused', resetAt: nextWindowReset(timestamp) },
    tools: { state: ratio < 0.75 ? 'available' : ratio < 1 ? 'limited' : 'paused' },
    internal: process.env.NODE_ENV === 'production' ? undefined : { used: rolling.units, capacity: plan.windowUnits, heavyUsed, heavyCapacity: plan.heavyDailyUnits, mediaUsed, mediaCapacity: plan.mediaMonthlyUnits, agenticUsed, agenticCapacity: plan.agenticMonthlyUnits, costUsd: monthly.costUsd, costCapacityUsd: plan.monthlyCostCap },
  }
}

export async function reserveUsage(req, res, kind, multiplier = 1, metadata = null) {
  const identity = req.identity
  const planId = identity?.user?.plan && plans[identity.user.plan] ? identity.user.plan : 'guest'
  const plan = plans[planId]
  const label = capabilityLabels[kind] || 'This capability'
  const units = (usageWeights[kind] || 1) * Math.max(0.25, Number(multiplier) || 1)
  const estimatedCost = (conservativeCostUsd[kind] || 0.01) * Math.max(0.25, Number(multiplier) || 1)

  // A request the plan could never satisfy is a plan question, not a timing one.
  if (!planIncludes(planId, kind, multiplier)) {
    res.status(403).json({
      error: `${label} is not included in Mere ${plan.label}. Upgrade to run it.`,
      code: 'plan-upgrade-required',
      capability: kind,
      plan: plan.id,
      usage: await usageSummary(identity),
    })
    return false
  }

  const timestamp = Date.now()
  const [rolling, daily, monthly] = await Promise.all([
    usageSince(identity.subject, timestamp - 5 * 60 * 60 * 1000),
    usageSince(identity.subject, timestamp - 24 * 60 * 60 * 1000),
    usageSince(identity.subject, timestamp - 30 * 24 * 60 * 60 * 1000),
  ])
  const heavyUsed = unitsForKinds(daily, heavyKinds)
  const mediaUsed = unitsForKinds(monthly, mediaKinds)
  const agenticUsed = unitsForKinds(monthly, agenticKinds)

  // Name the allowance that is actually full, and when it actually refreshes,
  // so the message is never "try again shortly" about a 30-day window.
  const exceeded =
    rolling.units + units > plan.windowUnits
      ? { scope: 'window', resetAt: timestamp + 5 * 60 * 60 * 1000, message: `Your rolling 5-hour allowance is full. ${label} is available again after it refreshes.` }
      : heavyKinds.has(kind) && heavyUsed + units > plan.heavyDailyUnits
        ? { scope: 'daily', resetAt: timestamp + 24 * 60 * 60 * 1000, message: `Your daily allowance for advanced work is full. ${label} is available again within 24 hours.` }
        : mediaKinds.has(kind) && mediaUsed + units > plan.mediaMonthlyUnits
          ? { scope: 'monthly', resetAt: timestamp + 30 * 24 * 60 * 60 * 1000, message: `Your monthly allowance for images and video is used up on Mere ${plan.label}.` }
          : agenticKinds.has(kind) && agenticUsed + units > plan.agenticMonthlyUnits
            ? { scope: 'monthly', resetAt: timestamp + 30 * 24 * 60 * 60 * 1000, message: `Your monthly allowance for agent and research workflows is used up on Mere ${plan.label}.` }
            : monthly.costUsd + estimatedCost > plan.monthlyCostCap
              ? { scope: 'monthly', resetAt: timestamp + 30 * 24 * 60 * 60 * 1000, message: `Your monthly allowance on Mere ${plan.label} is used up. It refreshes as earlier usage ages out of the 30-day window.` }
              : null

  if (exceeded) {
    res.status(429).json({
      error: exceeded.message,
      code: 'allowance-exhausted',
      scope: exceeded.scope,
      capability: kind,
      plan: plan.id,
      resetAt: exceeded.resetAt,
      upgradable: plan.id !== 'enterprise',
      usage: await usageSummary(identity),
    })
    return false
  }
  await recordUsage({ subject: identity.subject, kind, units, costUsd: estimatedCost, metadata })
  return true
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim())
}

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 256
}

export function verifySignedWebhook(rawBody, signature, secret) {
  if (!secret || !signature) return false
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex')
  const supplied = Buffer.from(String(signature).replace(/^sha256=/, ''), 'hex')
  const target = Buffer.from(expected, 'hex')
  return supplied.length === target.length && timingSafeEqual(supplied, target)
}
