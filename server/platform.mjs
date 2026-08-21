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

export function setSessionCookie(res, token, expiresAt) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; ${cookieOptions((expiresAt - Date.now()) / 1000)}`)
}

export function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; ${cookieOptions(0)}`)
}

export function resolveIdentity(req, res) {
  const cookies = parseCookies(req.headers.cookie)
  const user = getSession(cookies[SESSION_COOKIE])
  let guestId = cookies[GUEST_COOKIE]
  if (!user && !guestId) {
    guestId = randomBytes(18).toString('base64url')
    const existing = res.getHeader('Set-Cookie')
    const guestCookie = `${GUEST_COOKIE}=${guestId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`
    res.setHeader('Set-Cookie', existing ? [existing, guestCookie] : guestCookie)
  }
  req.identity = { user, guestId, subject: user ? `user:${user.id}` : `guest:${guestId || req.ip || 'anonymous'}`, sessionToken: cookies[SESSION_COOKIE] }
  return req.identity
}

export function requireUser(req, res, next) {
  if (!req.identity?.user) return res.status(401).json({ error: 'Sign in to use this feature.' })
  next()
}

function nextWindowReset(timestamp = Date.now()) {
  return timestamp + 5 * 60 * 60 * 1000
}

export function usageSummary(identity, timestamp = Date.now()) {
  const plan = plans[identity?.user?.plan] || plans.guest
  const rolling = usageSince(identity.subject, timestamp - 5 * 60 * 60 * 1000)
  const daily = usageSince(identity.subject, timestamp - 24 * 60 * 60 * 1000)
  const monthly = usageSince(identity.subject, timestamp - 30 * 24 * 60 * 60 * 1000)
  const heavyUsed = unitsForKinds(daily, heavyKinds)
  const mediaUsed = unitsForKinds(monthly, mediaKinds)
  const agenticUsed = unitsForKinds(monthly, agenticKinds)
  const ratio = Math.max(rolling.units / plan.windowUnits, heavyUsed / plan.heavyDailyUnits, mediaUsed / Math.max(1, plan.mediaMonthlyUnits), agenticUsed / Math.max(1, plan.agenticMonthlyUnits), monthly.costUsd / plan.monthlyCostCap)
  return {
    plan: plan.id,
    label: plan.label,
    state: ratio < 0.55 ? 'available' : ratio < 0.82 ? 'active' : ratio < 1 ? 'limited' : 'paused',
    window: { state: ratio < 0.82 ? 'standard' : ratio < 1 ? 'nearing-limit' : 'paused', resetAt: nextWindowReset(timestamp) },
    tools: { state: ratio < 0.75 ? 'available' : ratio < 1 ? 'limited' : 'paused' },
    internal: process.env.NODE_ENV === 'production' ? undefined : { used: rolling.units, capacity: plan.windowUnits, heavyUsed, heavyCapacity: plan.heavyDailyUnits, mediaUsed, mediaCapacity: plan.mediaMonthlyUnits, agenticUsed, agenticCapacity: plan.agenticMonthlyUnits, costUsd: monthly.costUsd, costCapacityUsd: plan.monthlyCostCap },
  }
}

export function reserveUsage(req, res, kind, multiplier = 1, metadata = null) {
  const identity = req.identity
  const plan = plans[identity?.user?.plan] || plans.guest
  const units = (usageWeights[kind] || 1) * Math.max(0.25, Number(multiplier) || 1)
  const rolling = usageSince(identity.subject, Date.now() - 5 * 60 * 60 * 1000)
  const daily = usageSince(identity.subject, Date.now() - 24 * 60 * 60 * 1000)
  const monthly = usageSince(identity.subject, Date.now() - 30 * 24 * 60 * 60 * 1000)
  const heavyUsed = unitsForKinds(daily, heavyKinds)
  const mediaUsed = unitsForKinds(monthly, mediaKinds)
  const agenticUsed = unitsForKinds(monthly, agenticKinds)
  const estimatedCost = (conservativeCostUsd[kind] || 0.01) * Math.max(0.25, Number(multiplier) || 1)
  if (rolling.units + units > plan.windowUnits || monthly.costUsd + estimatedCost > plan.monthlyCostCap || (heavyKinds.has(kind) && heavyUsed + units > plan.heavyDailyUnits) || (mediaKinds.has(kind) && mediaUsed + units > plan.mediaMonthlyUnits) || (agenticKinds.has(kind) && agenticUsed + units > plan.agenticMonthlyUnits)) {
    res.status(429).json({ error: 'Your current access window is full. It refreshes automatically.', usage: usageSummary(identity) })
    return false
  }
  recordUsage({ subject: identity.subject, kind, units, costUsd: estimatedCost, metadata })
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
