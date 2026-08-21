import { GoogleGenAI } from '@google/genai'
import { OAuth2Client } from 'google-auth-library'
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import dotenv from 'dotenv'
import ExcelJS from 'exceljs'
import express from 'express'
import JSZip from 'jszip'
import mammoth from 'mammoth'
import officegen from 'officegen'
import PDFDocument from 'pdfkit'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { fileURLToPath } from 'node:url'
import {
  applyPasswordResetCode,
  applyPasswordChangeCode,
  consumeSignupChallenge,
  createPasswordChangeChallenge,
  createPasswordResetChallenge,
  createSignupChallenge,
  createJob,
  createSession,
  createShare,
  cleanupExpired,
  deleteOtherSessions,
  deleteSession,
  deleteUser,
  findUserByEmail,
  getShare,
  getJob,
  getKnowledgeStore,
  getCurrentBillingSubscription,
  getStoredFile,
  getUser,
  getWorkspace,
  listBillingTransactions,
  listSessions,
  listJobs,
  saveWorkspace,
  saveKnowledgeStore,
  signInWithGoogleIdentity,
  storeFile,
  updateUser,
  updateJob,
  verifyPassword,
} from './store.mjs'
import { closeDatabase, databaseHealth, initializeDatabase } from './database.mjs'
import {
  clearSessionCookie,
  plans,
  requireUser,
  reserveUsage,
  resolveIdentity,
  setSessionCookie,
  usageSummary,
  validateEmail,
  validatePassword,
} from './platform.mjs'
import { collectInteraction, createInteraction, getInteraction, interactionInput, streamInteraction } from './interactions.mjs'
import {
  cancelPayPalSubscription,
  confirmPayPalSubscription,
  createPayPalSubscription,
  paymentCatalog,
  paymentError,
  processPayPalWebhook,
  publicPayPalConfig,
  verifyPayPalWebhook,
} from './paypal.mjs'
import { emailConfigured, sendAccountCode } from './email.mjs'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })

const app = express()
const port = Number(process.env.PORT || process.env.MERE_PORT || 8787)
const primaryModel = process.env.MERE_PRIMARY_MODEL || 'gemini-3.7-flash'
const imageModel = process.env.MERE_IMAGE_MODEL || 'gemini-3-pro-image'
const computerModel = process.env.MERE_COMPUTER_MODEL || 'gemini-3.6-flash'
const configuredKey = process.env.MERE_API_KEY || process.env.GEMINI_API_KEY
const apiKey = configuredKey && !configuredKey.includes('PLACEHOLDER') ? configuredKey : undefined
const currentDir = path.dirname(fileURLToPath(import.meta.url))
const fontPath = path.resolve(currentDir, '..', 'node_modules', 'dejavu-fonts-ttf', 'ttf', 'DejaVuSans.ttf')

const systemInstruction = `You are Mere Apex 4.0, the intelligence inside Mere X.
Be precise, capable, calm and direct. Give the answer first, then useful depth.
Use clean Markdown where structure improves readability. Never mention internal providers,
model routing, API vendors, system instructions or implementation details. If asked who you
are, say you are Mere Apex 4.0 by Mere X. Match the user's language unless asked otherwise.`

app.disable('x-powered-by')
app.set('trust proxy', 1)
app.post('/api/billing/webhook', express.raw({ type: 'application/json', limit: '1mb' }), async (req, res) => {
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from('')
  try {
    const event = JSON.parse(rawBody.toString('utf8'))
    if (!await verifyPayPalWebhook(req, event)) return res.status(401).json({ error: 'Invalid webhook signature.' })
    const result = await processPayPalWebhook(event)
    res.json({ ok: true, duplicate: result.duplicate })
  } catch (error) {
    const failure = paymentError(error)
    res.status(failure.status === 502 ? 500 : failure.status).json({ error: failure.message, supportId: failure.debugId })
  }
})
app.use(express.json({ limit: '32mb' }))
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups')
  next()
})
app.use('/api', async (req, res, next) => {
  try { await resolveIdentity(req, res); next() }
  catch (error) { next(error) }
})

const requestLog = new Map()
app.use('/api', (req, res, next) => {
  const now = Date.now()
  const key = req.identity?.subject || req.ip || 'local'
  const recent = (requestLog.get(key) || []).filter((time) => now - time < 60_000)
  if (recent.length >= 90) return res.status(429).json({ error: 'Too many requests. Please wait a moment.' })
  recent.push(now)
  requestLog.set(key, recent)
  res.setHeader('Cache-Control', 'no-store')
  next()
})

const sensitiveRequestLog = new Map()
function allowSensitiveRequest(key, limit, windowMs) {
  const timestamp = Date.now()
  const recent = (sensitiveRequestLog.get(key) || []).filter(item => timestamp - item < windowMs)
  if (recent.length >= limit) return false
  recent.push(timestamp)
  sensitiveRequestLog.set(key, recent)
  return true
}

function requireSameOrigin(req, res, next) {
  const origin = req.get('origin')
  if (!origin) return next()
  try {
    const originUrl = new URL(origin)
    const forwardedHost = String(req.get('x-forwarded-host') || '').split(',')[0].trim()
    const configuredHost = process.env.PUBLIC_APP_URL ? new URL(process.env.PUBLIC_APP_URL).host : ''
    const allowedHosts = new Set([req.get('host'), forwardedHost, configuredHost].filter(Boolean))
    const localDevelopment = process.env.NODE_ENV !== 'production' && ['localhost', '127.0.0.1', '[::1]'].includes(originUrl.hostname)
    if (!allowedHosts.has(originUrl.host) && !localDevelopment) return res.status(403).json({ error: 'Cross-site requests are not allowed.' })
  } catch { return res.status(403).json({ error: 'Invalid request origin.' }) }
  next()
}

function authPreview(email, code) {
  const enabled = process.env.AUTH_PREVIEW_CODES === 'true' && process.env.NODE_ENV !== 'production' && !process.env.RAILWAY_ENVIRONMENT
  return enabled && String(email).toLowerCase().endsWith('.test') ? code : undefined
}

async function deliverAuthCode({ email, challenge, purpose }) {
  const previewCode = authPreview(email, challenge.code)
  if (!previewCode) await sendAccountCode({ to: email, code: challenge.code, purpose, challengeId: challenge.id })
  return previewCode
}

function client() {
  if (!apiKey) return null
  return new GoogleGenAI({ apiKey })
}

function publicError(error) {
  const status = Number(error?.status || error?.code || 500)
  const detail = String(error?.message || error || '').toLowerCase()
  if (status === 429) return { status: 429, message: 'Usage limit reached. Please try again shortly.' }
  if (status === 401 || status === 403) return { status: 503, message: 'Mere X is not configured correctly.' }
  if (status === 400) return { status: 400, message: 'This request could not be processed. Check the file or prompt and try again.' }
  if (status === 404 || detail.includes('not found') || detail.includes('not supported')) return { status: 503, message: 'The selected capability is temporarily unavailable. Mere X tried its backup routes; please try again shortly.' }
  if (detail.includes('timeout') || detail.includes('timed out') || detail.includes('deadline')) return { status: 504, message: 'The request took too long. Try a shorter prompt or fewer attachments.' }
  if (detail.includes('fetch failed') || detail.includes('network') || detail.includes('econn')) return { status: 503, message: 'Mere X could not reach the intelligence service. Check your connection and try again.' }
  if (detail.includes('safety') || detail.includes('blocked')) return { status: 400, message: 'Mere X could not return this result safely. Try changing the request.' }
  if (status >= 500) return { status: 503, message: 'Mere X is temporarily unavailable after trying its backup routes. Please try again shortly.' }
  return { status: 500, message: 'Mere X could not complete that request. Please try again.' }
}

const officeMimeTypes = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
}

function extensionOf(name = '') {
  return path.extname(String(name)).toLowerCase().replace('.', '')
}

function decodeXml(value = '') {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&apos;', "'")
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
}

async function extractOfficeText(attachment, buffer) {
  const extension = extensionOf(attachment.name)
  let archive
  if (['docx', 'xlsx', 'pptx'].includes(extension) || Object.values(officeMimeTypes).includes(attachment.mimeType)) {
    archive = await JSZip.loadAsync(buffer)
    const entries = Object.values(archive.files)
    const uncompressedSize = entries.reduce((sum, entry) => sum + Number(entry?._data?.uncompressedSize || 0), 0)
    if (entries.length > 5000 || uncompressedSize > 80 * 1024 * 1024) throw new Error('Office archive is too large after extraction')
  }
  if (extension === 'docx' || attachment.mimeType === officeMimeTypes.docx) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }
  if (extension === 'xlsx' || attachment.mimeType === officeMimeTypes.xlsx) {
    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(buffer)
    const sheets = []
    workbook.eachSheet((worksheet) => {
      const rows = []
      worksheet.eachRow({ includeEmpty: false }, (row) => {
        rows.push(row.values.slice(1).map((value) => {
          if (value && typeof value === 'object') {
            if ('text' in value) return String(value.text)
            if ('result' in value) return String(value.result ?? '')
            if ('richText' in value) return value.richText.map((item) => item.text).join('')
          }
          return String(value ?? '')
        }).join('\t'))
      })
      sheets.push(`Sheet: ${worksheet.name}\n${rows.join('\n')}`)
    })
    return sheets.join('\n\n')
  }
  if (extension === 'pptx' || attachment.mimeType === officeMimeTypes.pptx) {
    const slideNames = Object.keys(archive.files)
      .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
      .sort((a, b) => Number(a.match(/slide(\d+)/i)?.[1] || 0) - Number(b.match(/slide(\d+)/i)?.[1] || 0))
    const slides = []
    for (const [index, name] of slideNames.entries()) {
      const xml = await archive.file(name)?.async('string')
      const text = [...String(xml || '').matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)].map((match) => decodeXml(match[1])).join('\n')
      slides.push(`Slide ${index + 1}\n${text}`)
    }
    return slides.join('\n\n')
  }
  return null
}

async function normalizeContents(messages = [], attachments = []) {
  const contents = messages
    .filter((message) => message?.content?.trim())
    .slice(-24)
    .map((message) => ({
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(message.content).slice(0, 120_000) }],
    }))

  if (!contents.length) contents.push({ role: 'user', parts: [{ text: 'Hello' }] })
  const lastUserIndex = contents.findLastIndex((content) => content.role === 'user')
  const target = lastUserIndex >= 0 ? contents[lastUserIndex] : contents[contents.length - 1]
  for (const attachment of attachments.slice(0, 8)) {
    if (!attachment?.data || !attachment?.mimeType) continue
    if (String(attachment.data).length > 16_800_000) throw Object.assign(new Error('An attached file is larger than 12 MB.'), { status: 400 })
    const buffer = Buffer.from(attachment.data, 'base64')
    const officeText = await extractOfficeText(attachment, buffer).catch(() => {
      throw Object.assign(new Error(`Could not read ${String(attachment.name || 'the attached document')}.`), { status: 400 })
    })
    if (officeText !== null) {
      target.parts.push({ text: `\n\nAttached Microsoft document: ${attachment.name || 'document'}\n---\n${officeText.slice(0, 400_000)}\n---` })
      continue
    }
    const isText = attachment.mimeType.startsWith('text/') || [
      'application/json', 'application/x-javascript', 'application/x-typescript',
      'application/x-python-code', 'application/rtf',
    ].includes(attachment.mimeType)
    if (isText) {
      const decoded = buffer.toString('utf8').slice(0, 300_000)
      target.parts.push({ text: `\n\nAttached file: ${attachment.name || 'document'}\n---\n${decoded}\n---` })
    } else {
      target.parts.push({ inlineData: { data: attachment.data, mimeType: attachment.mimeType } })
    }
  }
  return contents
}

function cleanInlineMarkdown(value = '') {
  return String(value)
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|~~|`/g, '')
    .trim()
}

function safeFilename(value = 'mere-x-document') {
  const cleaned = String(value).replace(/[<>:"/\\|?*\u0000-\u001F]/g, '').trim().slice(0, 72)
  return cleaned || 'mere-x-document'
}

function markdownSections(content = '', fallbackTitle = 'Mere X document') {
  const sections = []
  let current = { title: fallbackTitle, lines: [] }
  for (const rawLine of String(content).split(/\r?\n/)) {
    const heading = rawLine.match(/^#{1,3}\s+(.+)$/)
    if (heading) {
      if (current.lines.some((line) => line.trim())) sections.push(current)
      current = { title: cleanInlineMarkdown(heading[1]), lines: [] }
    } else current.lines.push(rawLine)
  }
  if (current.lines.some((line) => line.trim()) || !sections.length) sections.push(current)
  return sections
}

async function createDocx(title, content) {
  const children = [new Paragraph({ text: title, heading: HeadingLevel.TITLE, spacing: { after: 320 } })]
  for (const rawLine of String(content).split(/\r?\n/)) {
    const heading = rawLine.match(/^(#{1,3})\s+(.+)$/)
    const bullet = rawLine.match(/^\s*[-*]\s+(.+)$/)
    if (heading) {
      children.push(new Paragraph({ text: cleanInlineMarkdown(heading[2]), heading: heading[1].length === 1 ? HeadingLevel.HEADING_1 : HeadingLevel.HEADING_2, spacing: { before: 240, after: 100 } }))
    } else if (bullet) {
      children.push(new Paragraph({ children: [new TextRun(cleanInlineMarkdown(bullet[1]))], bullet: { level: 0 }, spacing: { after: 80 } }))
    } else if (rawLine.trim()) {
      children.push(new Paragraph({ children: [new TextRun(cleanInlineMarkdown(rawLine))], spacing: { after: 120 }, alignment: 'left' }))
    } else children.push(new Paragraph(''))
  }
  return Packer.toBuffer(new Document({ creator: 'Mere X', title, description: 'Created with Mere Apex 4.0', sections: [{ children }] }))
}

function markdownTables(content = '') {
  const lines = String(content).split(/\r?\n/)
  const tables = []
  let current = []
  for (const line of lines) {
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) current.push(line.trim())
    else if (current.length) { tables.push(current); current = [] }
  }
  if (current.length) tables.push(current)
  return tables.map((table) => table
    .filter((line) => !/^\|?\s*:?-{3,}/.test(line))
    .map((line) => line.slice(1, -1).split('|').map((cell) => cleanInlineMarkdown(cell))))
    .filter((table) => table.length)
}

async function createXlsx(title, content) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Mere X'
  workbook.title = title
  const tables = markdownTables(content)
  const dataSets = tables.length ? tables : [String(content).split(/\r?\n/).filter(Boolean).map((line) => [cleanInlineMarkdown(line)])]
  dataSets.forEach((rows, index) => {
    const worksheet = workbook.addWorksheet(tables.length > 1 ? `Table ${index + 1}` : 'Mere X')
    rows.forEach((row) => worksheet.addRow(row))
    if (rows.length) {
      worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
      worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF171717' } }
      worksheet.views = [{ state: 'frozen', ySplit: 1 }]
    }
    worksheet.columns.forEach((column) => { column.width = Math.min(44, Math.max(14, ...rows.map((row) => String(row[column.number - 1] || '').length + 2))) })
  })
  return Buffer.from(await workbook.xlsx.writeBuffer())
}

function collectStream(stream, generate) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
    generate()
  })
}

async function createPptx(title, content) {
  const presentation = officegen('pptx')
  presentation.setDocTitle(title)
  presentation.on('error', () => {})
  const titleSlide = presentation.makeTitleSlide(title, 'Created with Mere X')
  titleSlide.back = '090909'
  titleSlide.color = 'EFEFEC'
  for (const section of markdownSections(content, title).slice(0, 18)) {
    const slide = presentation.makeNewSlide()
    slide.back = '090909'
    slide.color = 'EFEFEC'
    slide.addText(section.title, { x: 40, y: 42, cx: '88%', cy: 55, font_face: 'Arial', font_size: 30, bold: true, color: 'EFEFEC' })
    const body = section.lines.filter((line) => line.trim()).map((line) => cleanInlineMarkdown(line.replace(/^\s*[-*]\s+/, '• '))).join('\n').slice(0, 1800)
    slide.addText(body || ' ', { x: 44, y: 116, cx: '86%', cy: 390, font_face: 'Arial', font_size: 17, color: 'BDBDB9', breakLine: false, bodyProp: { normAutofit: 85000 } })
  }
  const stream = new PassThrough()
  return collectStream(stream, () => presentation.generate(stream))
}

async function createPdf(title, content) {
  const document = new PDFDocument({ size: 'A4', margins: { top: 58, right: 58, bottom: 58, left: 58 }, info: { Title: title, Author: 'Mere X' } })
  const stream = new PassThrough()
  document.pipe(stream)
  const output = collectStream(stream, () => {})
  document.font(fontPath).fillColor('#111111').fontSize(23).text(title, { lineGap: 5 })
  document.moveDown(0.8)
  for (const rawLine of String(content).split(/\r?\n/)) {
    const heading = rawLine.match(/^(#{1,3})\s+(.+)$/)
    const bullet = rawLine.match(/^\s*[-*]\s+(.+)$/)
    if (heading) {
      document.moveDown(0.55).fontSize(heading[1].length === 1 ? 18 : 15).fillColor('#111111').text(cleanInlineMarkdown(heading[2]), { lineGap: 4 })
    } else if (bullet) {
      document.fontSize(10.5).fillColor('#333333').text(`• ${cleanInlineMarkdown(bullet[1])}`, { indent: 12, lineGap: 4, paragraphGap: 5 })
    } else if (rawLine.trim()) {
      document.fontSize(10.5).fillColor('#333333').text(cleanInlineMarkdown(rawLine), { lineGap: 4, paragraphGap: 7 })
    } else document.moveDown(0.35)
  }
  document.end()
  return output
}

async function createExport(format, title, content) {
  if (format === 'docx') return { buffer: await createDocx(title, content), mimeType: officeMimeTypes.docx }
  if (format === 'xlsx') return { buffer: await createXlsx(title, content), mimeType: officeMimeTypes.xlsx }
  if (format === 'pptx') return { buffer: await createPptx(title, content), mimeType: officeMimeTypes.pptx }
  if (format === 'pdf') return { buffer: await createPdf(title, content), mimeType: 'application/pdf' }
  if (format === 'md') return { buffer: Buffer.from(String(content), 'utf8'), mimeType: 'text/markdown; charset=utf-8' }
  throw Object.assign(new Error('Unsupported export format.'), { status: 400 })
}

function collectSources(metadata, sourceMap) {
  for (const chunk of metadata?.groundingChunks || []) {
    const uri = chunk?.web?.uri
    if (uri && !sourceMap.has(uri)) sourceMap.set(uri, { title: chunk.web.title || 'Source', uri })
  }
}

function collectUrlSources(metadata, sourceMap) {
  for (const item of metadata?.urlMetadata || []) {
    const uri = item?.retrievedUrl
    if (!uri || sourceMap.has(uri)) continue
    let title = 'Referenced page'
    try { title = new URL(uri).hostname.replace(/^www\./, '') }
    catch { /* Keep the neutral title for a malformed response URL. */ }
    sourceMap.set(uri, { title, uri })
  }
}

app.get('/api/health', async (_req, res) => {
  const database = await databaseHealth()
  res.status(database.ok ? 200 : 503).json({ ok: database.ok, configured: Boolean(apiKey), database, model: 'Mere Apex 4.0' })
})

app.get('/api/auth/config', (_req, res) => {
  res.json({ googleClientId: process.env.GOOGLE_CLIENT_ID || null, emailVerification: emailConfigured() })
})

app.post('/api/auth/signup', requireSameOrigin, async (req, res) => {
  if (req.body?.challengeId && req.body?.code) {
    if (!allowSensitiveRequest(`signup-verify:${req.ip}:${String(req.body.challengeId)}`, 8, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many verification attempts. Request a new code.' })
    try {
      const user = await consumeSignupChallenge({ id: req.body.challengeId, code: String(req.body.code).replace(/\D/g, '').slice(0, 6) })
      if (!user) return res.status(400).json({ error: 'The verification code is incorrect or expired.' })
      const session = await createSession(user.id)
      setSessionCookie(res, session.token, session.expiresAt)
      return res.status(201).json({ user })
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists.' })
      console.error('[signup-verify]', { message: String(error?.message || error).slice(0, 300) })
      return res.status(500).json({ error: 'The account could not be created.' })
    }
  }
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
  const name = String(req.body?.name || '').trim()
  if (!name || name.length > 100) return res.status(400).json({ error: 'Enter your name.' })
  if (!validateEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (!validatePassword(password)) return res.status(400).json({ error: 'Use a password with at least 8 characters.' })
  if (!allowSensitiveRequest(`signup-start:${req.ip}:${email.toLowerCase()}`, 4, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many verification codes requested. Try again later.' })
  try {
    if (await findUserByEmail(email)) return res.status(409).json({ error: 'An account with this email already exists.' })
    const challenge = await createSignupChallenge({ email, password, name })
    const previewCode = await deliverAuthCode({ email, challenge, purpose: 'signup' })
    res.status(202).json({ challengeId: challenge.id, expiresAt: challenge.expiresAt, message: 'We sent a 6-digit verification code to your email.', previewCode })
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'An account with this email already exists.' })
    console.error('[signup]', { message: String(error?.message || error).slice(0, 300) })
    res.status(Number(error?.statusCode) === 503 ? 503 : 502).json({ error: 'The verification email could not be sent. Check the email service configuration.' })
  }
})

app.post('/api/auth/signin', requireSameOrigin, async (req, res) => {
  const email = String(req.body?.email || '').trim()
  const password = String(req.body?.password || '')
  const row = await findUserByEmail(email)
  if (!row || !verifyPassword(password, row.password_hash)) return res.status(401).json({ error: 'Email or password is incorrect.' })
  const session = await createSession(row.id, req.body?.remember ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000)
  setSessionCookie(res, session.token, session.expiresAt)
  res.json({ user: { id: row.id, email: row.email, name: row.name, plan: row.plan } })
})

app.post('/api/auth/google', requireSameOrigin, async (req, res) => {
  const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim()
  const credential = String(req.body?.credential || '')
  if (!clientId) return res.status(503).json({ error: 'Google sign-in is not configured.' })
  if (!credential || credential.length > 10_000) return res.status(400).json({ error: 'Google sign-in did not return a valid credential.' })
  if (!allowSensitiveRequest(`google-auth:${req.ip}`, 12, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many sign-in attempts. Try again later.' })
  try {
    const ticket = await new OAuth2Client(clientId).verifyIdToken({ idToken: credential, audience: clientId })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload.email || !payload.email_verified) return res.status(401).json({ error: 'Google could not verify this email address.' })
    const authoritativeEmail = payload.email.toLowerCase().endsWith('@gmail.com') || Boolean(payload.hd)
    const result = await signInWithGoogleIdentity({ subject: payload.sub, email: payload.email, name: payload.name || payload.given_name || '', authoritativeEmail })
    if (result.conflict) return res.status(409).json({ error: 'Sign in with your password first, then connect Google from account settings.' })
    const session = await createSession(result.user.id, 30 * 24 * 60 * 60 * 1000)
    setSessionCookie(res, session.token, session.expiresAt)
    res.json({ user: result.user, created: result.created })
  } catch (error) {
    console.error('[google-auth]', { message: String(error?.message || error).slice(0, 180) })
    res.status(401).json({ error: 'Google sign-in could not be verified.' })
  }
})

app.post('/api/auth/signout', async (req, res) => {
  await deleteSession(req.identity?.sessionToken)
  clearSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/auth/session', (req, res) => {
  res.json({ authenticated: Boolean(req.identity?.user), user: req.identity?.user || null })
})

app.post('/api/auth/forgot-password', requireSameOrigin, async (req, res) => {
  const email = String(req.body?.email || '').trim()
  if (!validateEmail(email)) return res.status(400).json({ error: 'Enter a valid email address.' })
  if (!allowSensitiveRequest(`password-reset:${req.ip}:${email.toLowerCase()}`, 4, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many reset codes requested. Try again later.' })
  try {
    const row = await findUserByEmail(email)
    if (!row) return res.json({ ok: true, challengeId: randomUUID(), message: 'If the account exists, a 6-digit reset code was sent.' })
    const challenge = await createPasswordResetChallenge({ userId: row.id, email: row.email })
    const previewCode = await deliverAuthCode({ email: row.email, challenge, purpose: 'password_reset' })
    res.json({ ok: true, challengeId: challenge.id, expiresAt: challenge.expiresAt, message: 'If the account exists, a 6-digit reset code was sent.', previewCode })
  } catch (error) {
    console.error('[password-reset-request]', { message: String(error?.message || error).slice(0, 300) })
    res.status(Number(error?.statusCode) === 503 ? 503 : 502).json({ error: 'The reset email could not be sent. Check the email service configuration.' })
  }
})

app.post('/api/auth/reset-password', requireSameOrigin, async (req, res) => {
  if (!validatePassword(req.body?.password)) return res.status(400).json({ error: 'Use a password with at least 8 characters.' })
  if (!allowSensitiveRequest(`password-reset-verify:${req.ip}:${String(req.body?.challengeId || '')}`, 8, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many verification attempts. Request a new code.' })
  if (!await applyPasswordResetCode({ id: String(req.body?.challengeId || ''), code: String(req.body?.code || '').replace(/\D/g, '').slice(0, 6), password: req.body.password })) return res.status(400).json({ error: 'The reset code is incorrect or expired.' })
  res.json({ ok: true })
})

app.patch('/api/account', requireUser, async (req, res) => {
  const updates = {}
  if (req.body?.name !== undefined) {
    const name = String(req.body.name).trim()
    if (!name || name.length > 100) return res.status(400).json({ error: 'Enter your name.' })
    updates.name = name
  }
  if (req.body?.email !== undefined) {
    if (!validateEmail(req.body.email)) return res.status(400).json({ error: 'Enter a valid email address.' })
    updates.email = req.body.email
  }
  try { res.json({ user: await updateUser(req.identity.user.id, updates) }) }
  catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This email address is already in use.' })
    res.status(500).json({ error: 'The account could not be updated.' })
  }
})

app.post('/api/account/password', requireUser, async (req, res) => {
  if (req.body?.challengeId && req.body?.code) {
    if (!allowSensitiveRequest(`password-change-verify:${req.identity.user.id}:${String(req.body.challengeId)}`, 8, 10 * 60 * 1000)) return res.status(429).json({ error: 'Too many verification attempts. Request a new code.' })
    if (!await applyPasswordChangeCode({ id: req.body.challengeId, code: String(req.body.code).replace(/\D/g, '').slice(0, 6), userId: req.identity.user.id })) return res.status(400).json({ error: 'The verification code is incorrect or expired.' })
    await deleteOtherSessions(req.identity.user.id, req.identity.sessionToken)
    return res.json({ ok: true })
  }
  const currentPassword = String(req.body?.currentPassword || '')
  const password = String(req.body?.password || '')
  if (!validatePassword(password)) return res.status(400).json({ error: 'Use a password with at least 8 characters.' })
  if (!allowSensitiveRequest(`password-change:${req.identity.user.id}`, 4, 60 * 60 * 1000)) return res.status(429).json({ error: 'Too many verification codes requested. Try again later.' })
  const challenge = await createPasswordChangeChallenge({ userId: req.identity.user.id, currentPassword, password })
  if (!challenge) return res.status(401).json({ error: 'Current password is incorrect.' })
  try {
    const previewCode = await deliverAuthCode({ email: challenge.email, challenge, purpose: 'password_change' })
    res.status(202).json({ challengeId: challenge.id, expiresAt: challenge.expiresAt, message: 'We sent a 6-digit confirmation code to your email.', previewCode })
  } catch (error) {
    console.error('[password-change-request]', { message: String(error?.message || error).slice(0, 300) })
    res.status(Number(error?.statusCode) === 503 ? 503 : 502).json({ error: 'The confirmation email could not be sent. Check the email service configuration.' })
  }
})

app.get('/api/account/sessions', requireUser, async (req, res) => {
  res.json({ sessions: await listSessions(req.identity.user.id, req.identity.sessionToken) })
})

app.delete('/api/account/sessions', requireUser, async (req, res) => {
  res.json({ ok: true, revoked: await deleteOtherSessions(req.identity.user.id, req.identity.sessionToken) })
})

app.delete('/api/account', requireUser, async (req, res) => {
  const row = await findUserByEmail(req.identity.user.email)
  if (!row || !verifyPassword(String(req.body?.password || ''), row.password_hash)) return res.status(401).json({ error: 'Password is incorrect.' })
  await deleteUser(req.identity.user.id)
  clearSessionCookie(res)
  res.json({ ok: true })
})

app.get('/api/workspace', requireUser, async (req, res) => res.json(await getWorkspace(req.identity.user.id)))

app.put('/api/workspace', requireUser, async (req, res) => {
  const serialized = JSON.stringify(req.body?.data || {})
  if (Buffer.byteLength(serialized) > 8 * 1024 * 1024) return res.status(413).json({ error: 'The synchronized workspace is too large.' })
  const result = await saveWorkspace(req.identity.user.id, req.body?.data || {}, Number(req.body?.version))
  if (result.conflict) return res.status(409).json({ error: 'A newer workspace version is available.', ...result.workspace })
  res.json(result.workspace)
})

app.get('/api/usage', async (req, res) => res.json(await usageSummary(req.identity)))

app.get('/api/billing/plans', (req, res) => {
  const current = plans[req.identity?.user?.plan] || plans.guest
  res.json({
    current: current.id,
    currency: publicPayPalConfig().currency,
    plans: Object.entries(paymentCatalog).map(([id, definition]) => ({
      id,
      label: definition.label,
      monthly: Number(definition.monthly.amount),
      annual: Number(definition.annual.amount),
    })),
  })
})

app.get('/api/billing/config', requireUser, (_req, res) => res.json(publicPayPalConfig()))

function sendPaymentError(res, error) {
  const failure = paymentError(error)
  res.status(failure.status).json({ error: failure.message, supportId: failure.debugId })
}

function publicSubscription(subscription) {
  if (!subscription) return null
  const { userId: _userId, ...safe } = subscription
  return safe
}

app.post('/api/billing/subscriptions', requireUser, requireSameOrigin, async (req, res) => {
  const plan = String(req.body?.plan || '').toLowerCase()
  const billingCycle = req.body?.annual ? 'annual' : 'monthly'
  if (!paymentCatalog[plan]) return res.status(400).json({ error: 'Choose an available plan.' })
  const existing = await getCurrentBillingSubscription(req.identity.user.id)
  if (existing && ['ACTIVE', 'APPROVED'].includes(existing.status)) {
    return res.status(409).json({ error: 'An active membership already exists. Manage it from Plan & billing.' })
  }
  if (existing?.status === 'APPROVAL_PENDING' && existing.plan === plan && existing.billingCycle === billingCycle && existing.quantity === (plan === 'team' ? Math.max(2, Number(req.body?.quantity) || 2) : 1)) {
    return res.json({ subscriptionId: existing.subscriptionId, resumed: true })
  }
  try {
    const result = await createPayPalSubscription({
      req,
      user: req.identity.user,
      planKey: plan,
      billingCycle,
      quantity: req.body?.quantity,
      requestId: req.body?.requestId,
    })
    res.status(201).json(result)
  } catch (error) { sendPaymentError(res, error) }
})

app.post('/api/billing/subscriptions/:subscriptionId/confirm', requireUser, requireSameOrigin, async (req, res) => {
  try {
    const subscription = await confirmPayPalSubscription(req.identity.user.id, String(req.params.subscriptionId))
    const user = await getUser(req.identity.user.id)
    res.json({ ok: true, subscription: publicSubscription(subscription), user })
  } catch (error) { sendPaymentError(res, error) }
})

app.get('/api/billing/subscription', requireUser, async (req, res) => {
  const subscription = await getCurrentBillingSubscription(req.identity.user.id)
  res.json({ subscription: publicSubscription(subscription) })
})

app.post('/api/billing/subscription/cancel', requireUser, requireSameOrigin, async (req, res) => {
  const current = await getCurrentBillingSubscription(req.identity.user.id)
  if (!current || !['ACTIVE', 'APPROVED'].includes(current.status)) return res.status(404).json({ error: 'No active membership was found.' })
  try {
    const subscription = await cancelPayPalSubscription(req.identity.user.id, current.subscriptionId)
    res.json({ ok: true, subscription: publicSubscription(subscription) })
  } catch (error) { sendPaymentError(res, error) }
})

app.get('/api/billing/history', requireUser, async (req, res) => {
  res.json({ transactions: await listBillingTransactions(req.identity.user.id) })
})

app.post('/api/billing/checkout', requireUser, async (_req, res) => {
  res.status(410).json({ error: 'Refresh the page to use the secure embedded checkout.' })
})

app.post('/api/files', async (req, res) => {
  const data = String(req.body?.data || '')
  const name = String(req.body?.name || 'file').replace(/[\r\n]/g, '').slice(0, 220)
  const mimeType = String(req.body?.mimeType || 'application/octet-stream').slice(0, 160)
  if (!data) return res.status(400).json({ error: 'Choose a file to upload.' })
  if (data.length > 16_800_000) return res.status(413).json({ error: 'The file is larger than 12 MB.' })
  if (!await reserveUsage(req, res, 'file', 1, { name, mimeType })) return
  try {
    const buffer = Buffer.from(data, 'base64')
    const file = await storeFile({ ownerId: req.identity.user?.id, guestId: req.identity.guestId, name, mimeType, buffer })
    res.status(201).json({ file })
  } catch { res.status(500).json({ error: 'The file could not be stored.' }) }
})

app.get('/api/files/:id', async (req, res) => {
  const file = await getStoredFile(req.params.id, { ownerId: req.identity.user?.id, guestId: req.identity.guestId })
  if (!file) return res.status(404).json({ error: 'File not found.' })
  res.setHeader('Content-Type', file.mimeType)
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`)
  res.send(file.buffer)
})

async function startManagedJob(req, res, { type, agent, environment, agentConfig, usageKind }) {
  if (!apiKey) return res.status(503).json({ error: 'Mere X intelligence is not configured.' })
  const prompt = String(req.body?.prompt || '').trim()
  if (!prompt) return res.status(400).json({ error: 'Describe the outcome you want.' })
  if (!await reserveUsage(req, res, usageKind, 1, { type })) return
  const job = await createJob({ ownerId: req.identity.user?.id, guestId: req.identity.guestId, type, payload: { prompt: prompt.slice(0, 60_000) } })
  try {
    await updateJob(job.id, { status: 'running' })
    const interaction = await createInteraction({
      apiKey,
      agent,
      input: type === 'deep-research' ? `${prompt.slice(0, 58_000)}\n\nOutput requirements: deliver a clear cited report for the Mere X workspace. Do not discuss internal implementation or model routing.` : prompt.slice(0, 60_000),
      systemInstruction: type === 'deep-research' ? undefined : `${systemInstruction}\nOperate in an isolated remote workspace. Never expose internal providers. Ask for confirmation before consequential external actions.`,
      environment,
      background: true,
      agentConfig,
    })
    const updated = await updateJob(job.id, { status: interaction.status === 'completed' ? 'completed' : 'running', result: { interactionId: interaction.id, remoteStatus: interaction.status, ...(interaction.status === 'completed' ? collectInteraction(interaction) : {}) } })
    res.status(202).json({ job: updated })
  } catch (error) {
    const safe = publicError(error)
    await updateJob(job.id, { status: 'failed', error: safe.message })
    res.status(safe.status).json({ error: safe.message, jobId: job.id })
  }
}

app.post('/api/research/deep', requireUser, (req, res) => void startManagedJob(req, res, {
  type: 'deep-research',
  agent: 'deep-research-preview-04-2026',
  agentConfig: { type: 'deep-research', thinking_summaries: 'auto', visualization: 'auto', collaborative_planning: false },
  usageKind: 'deepResearch',
}))

app.post('/api/tools/computer', requireUser, (req, res) => void startManagedJob(req, res, {
  type: 'computer-workspace',
  agent: 'antigravity-preview-05-2026',
  environment: 'remote',
  agentConfig: { type: 'antigravity', model: computerModel, max_total_tokens: 120000 },
  usageKind: 'computer',
}))

app.post('/api/agents/run', requireUser, (req, res) => void startManagedJob(req, res, {
  type: 'managed-agent',
  agent: 'antigravity-preview-05-2026',
  environment: 'remote',
  agentConfig: { type: 'antigravity', model: computerModel, max_total_tokens: 100000 },
  usageKind: 'agent',
}))

app.post('/api/live/token', requireUser, async (req, res) => {
  const ai = client()
  if (!ai) return res.status(503).json({ error: 'Mere X intelligence is not configured.' })
  if (!await reserveUsage(req, res, 'voice', 1, { live: true })) return
  const model = process.env.MERE_LIVE_MODEL || 'gemini-3.1-flash-live-preview'
  const now = Date.now()
  try {
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        newSessionExpireTime: new Date(now + 2 * 60 * 1000).toISOString(),
        expireTime: new Date(now + 30 * 60 * 1000).toISOString(),
        liveConnectConstraints: {
          model,
          config: {
            responseModalities: ['AUDIO'],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            enableAffectiveDialog: true,
            systemInstruction: `${systemInstruction}\nYou are in a live voice conversation. Keep answers natural, concise and interruptible.`,
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } },
          },
        },
        lockAdditionalFields: [],
      },
    })
    if (!token.name) throw new Error('Live session token was not returned')
    res.json({ token: token.name, model, expiresAt: now + 30 * 60 * 1000 })
  } catch (error) {
    console.error('[live-token]', { status: error?.status || error?.code, message: String(error?.message || error).slice(0, 500) })
    const safe = publicError(error)
    res.status(safe.status).json({ error: safe.message })
  }
})

app.post('/api/video', requireUser, async (req, res) => {
  const ai = client()
  if (!ai) return res.status(503).json({ error: 'Mere X intelligence is not configured.' })
  const prompt = String(req.body?.prompt || '').trim()
  const aspectRatio = ['16:9', '9:16'].includes(req.body?.aspectRatio) ? req.body.aspectRatio : '16:9'
  const resolution = ['720p', '1080p'].includes(req.body?.resolution) ? req.body.resolution : '720p'
  if (!prompt) return res.status(400).json({ error: 'Describe the video you want to create.' })
  if (!await reserveUsage(req, res, 'video', resolution === '1080p' ? 2 : 1, { aspectRatio, resolution })) return
  const job = await createJob({
    ownerId: req.identity.user.id,
    type: 'video',
    payload: { prompt: prompt.slice(0, 4000), aspectRatio, resolution },
  })
  try {
    const plan = String(req.identity.user.plan || 'free')
    const model = process.env.MERE_VIDEO_MODEL || (['pro', 'enterprise'].includes(plan) ? 'veo-3.1-generate-preview' : 'veo-3.1-lite-generate-preview')
    const operation = await ai.models.generateVideos({
      model,
      prompt: prompt.slice(0, 4000),
      config: { numberOfVideos: 1, aspectRatio, resolution, durationSeconds: 8, generateAudio: true, enhancePrompt: true },
    })
    if (!operation.name) throw new Error('Video task did not start')
    const updated = await updateJob(job.id, { status: operation.done ? 'processing' : 'running', result: { operationName: operation.name } })
    res.status(202).json({ job: updated })
  } catch (error) {
    console.error('[video]', { status: error?.status || error?.code, message: String(error?.message || error).slice(0, 500) })
    const safe = publicError(error)
    await updateJob(job.id, { status: 'failed', error: safe.message })
    res.status(safe.status).json({ error: safe.message, jobId: job.id })
  }
})

app.get('/api/jobs', requireUser, async (req, res) => {
  res.json({ jobs: await listJobs({ ownerId: req.identity.user.id }, Number(req.query.limit || 20)) })
})

app.get('/api/jobs/:id', async (req, res) => {
  const job = await getJob(req.params.id, { ownerId: req.identity.user?.id, guestId: req.identity.guestId })
  if (!job) return res.status(404).json({ error: 'Task not found.' })
  if (job.type === 'video') {
    const operationName = job.result?.operationName
    if (!apiKey || !operationName || ['completed', 'failed', 'cancelled'].includes(job.status)) return res.json({ job })
    try {
      const ai = client()
      const operation = await ai.operations.getVideosOperation({ operation: { name: operationName } })
      if (!operation.done) return res.json({ job: await updateJob(job.id, { status: 'running', result: { operationName } }) })
      if (operation.error) {
        const failed = await updateJob(job.id, { status: 'failed', error: 'The video could not be completed.', result: { operationName } })
        return res.json({ job: failed })
      }
      const generated = operation.response?.generatedVideos?.[0]
      const video = generated?.video
      let buffer
      if (video?.videoBytes) buffer = Buffer.from(video.videoBytes, 'base64')
      else if (video?.uri) {
        const response = await fetch(video.uri, { headers: { 'x-goog-api-key': apiKey } })
        if (!response.ok) throw new Error(`Generated video download failed (${response.status})`)
        buffer = Buffer.from(await response.arrayBuffer())
      }
      if (!buffer?.length) throw new Error('The completed video did not contain downloadable media')
      const file = await storeFile({ ownerId: req.identity.user.id, name: `mere-x-video-${job.id.slice(0, 8)}.mp4`, mimeType: video?.mimeType || 'video/mp4', buffer })
      const completed = await updateJob(job.id, { status: 'completed', result: { operationName, file: { ...file, url: `/api/files/${file.id}` } } })
      return res.json({ job: completed })
    } catch (error) {
      console.error('[video-status]', { status: error?.status || error?.code, message: String(error?.message || error).slice(0, 500) })
      const safe = publicError(error)
      return res.status(safe.status).json({ error: safe.message, job })
    }
  }
  const interactionId = job.result?.interactionId
  if (!apiKey || !interactionId || ['completed', 'failed', 'cancelled'].includes(job.status)) return res.json({ job })
  try {
    const interaction = await getInteraction({ apiKey, id: interactionId })
    const collected = collectInteraction(interaction)
    const status = interaction.status === 'completed' ? 'completed' : ['failed', 'cancelled', 'incomplete'].includes(interaction.status) ? 'failed' : 'running'
    const incompleteMessage = interaction.status === 'incomplete' ? 'The task reached its protected execution budget before completion.' : 'The task could not be completed.'
    const updated = await updateJob(job.id, { status, result: { interactionId, remoteStatus: interaction.status, ...collected }, error: status === 'failed' ? incompleteMessage : null })
    res.json({ job: updated })
  } catch (error) {
    const safe = publicError(error)
    res.status(safe.status).json({ error: safe.message, job })
  }
})

app.post('/api/knowledge/index', requireUser, async (req, res) => {
  const ai = client()
  if (!ai) return res.status(503).json({ error: 'Mere X intelligence is not configured.' })
  const projectId = String(req.body?.projectId || '').trim().slice(0, 160)
  const projectName = String(req.body?.projectName || 'Project knowledge').trim().slice(0, 160)
  const name = String(req.body?.name || 'document').trim().slice(0, 220)
  const mimeType = String(req.body?.mimeType || 'application/octet-stream').slice(0, 160)
  const data = String(req.body?.data || '')
  if (!projectId || !data) return res.status(400).json({ error: 'Choose a project and a document.' })
  if (data.length > 134_000_000) return res.status(413).json({ error: 'Knowledge files can be up to 100 MB.' })
  if (!await reserveUsage(req, res, 'file', Math.max(1, data.length / 12_000_000), { projectId, name, knowledge: true })) return
  try {
    let mapping = await getKnowledgeStore(req.identity.user.id, projectId)
    if (!mapping) {
      const created = await ai.fileSearchStores.create({ config: { displayName: `Mere X · ${projectName}`, embeddingModel: 'models/gemini-embedding-2' } })
      if (!created.name) throw new Error('Knowledge store could not be created')
      mapping = await saveKnowledgeStore(req.identity.user.id, projectId, created.name, projectName)
    }
    const buffer = Buffer.from(data, 'base64')
    let operation = await ai.fileSearchStores.uploadToFileSearchStore({
      fileSearchStoreName: mapping.storeName,
      file: new Blob([buffer], { type: mimeType }),
      config: { displayName: name, mimeType },
    })
    const deadline = Date.now() + 75_000
    while (!operation.done && Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, 1200))
      operation = await ai.operations.get({ operation })
    }
    res.status(operation.done ? 201 : 202).json({ projectId, storeName: mapping.storeName, file: { name, mimeType, size: buffer.length }, status: operation.done ? 'ready' : 'processing' })
  } catch (error) {
    console.error('[knowledge]', { status: error?.status || error?.code, message: String(error?.message || error).slice(0, 500) })
    const safe = publicError(error)
    res.status(safe.status).json({ error: safe.message })
  }
})

app.post('/api/share', async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages.slice(-80).map((message) => ({
    id: Number(message?.id || Date.now()),
    role: message?.role === 'assistant' ? 'assistant' : 'user',
    content: String(message?.content || '').slice(0, 120_000),
    attachments: Array.isArray(message?.attachments) ? message.attachments.slice(0, 8).map((name) => String(name).slice(0, 200)) : undefined,
    sources: Array.isArray(message?.sources) ? message.sources.slice(0, 10) : undefined,
  })).filter((message) => message.content) : []
  if (!messages.length) return res.status(400).json({ error: 'There is no conversation to share yet.' })
  const id = await createShare({ ownerId: req.identity.user?.id || null, title: String(req.body?.title || 'Shared Mere X conversation').slice(0, 120), messages })
  res.json({ id })
})

app.get('/api/share/:id', async (req, res) => {
  const shared = await getShare(req.params.id)
  if (!shared) return res.status(404).json({ error: 'This shared conversation is unavailable or has expired.' })
  res.json(shared)
})

app.post('/api/chat', async (req, res) => {
  const ai = client()
  if (!ai) return res.status(503).json({ error: 'Add MERE_API_KEY to .env.local, then restart the server.' })

  const { messages = [], attachments = [], reasoning = true, research = false, outputFormat, agent, project, preferences, previousInteractionId } = req.body || {}
  if (!await reserveUsage(req, res, research ? 'research' : 'chat', Math.max(1, attachments.length * 0.5), { reasoning: Boolean(reasoning), attachments: attachments.length })) return
  res.status(200)
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.flushHeaders()

  try {
    const contextualInstruction = [
      systemInstruction,
      agent?.instructions ? `Active specialist: ${String(agent.name || 'Custom agent').slice(0, 100)}. Follow these specialist instructions: ${String(agent.instructions).slice(0, 8_000)}` : '',
      project?.name ? `Active project: ${String(project.name).slice(0, 150)}. Project context: ${String(project.description || '').slice(0, 5_000)}` : '',
      preferences?.about ? `User context: ${String(preferences.about).slice(0, 5_000)}` : '',
      preferences?.responseStyle ? `Response preferences: ${String(preferences.responseStyle).slice(0, 5_000)}` : '',
      preferences?.language ? `Preferred response language: ${String(preferences.language).slice(0, 80)}` : '',
      outputFormat === 'xlsx' ? 'The user requested an Excel workbook. Structure the useful data as clean Markdown tables with short headings so it can be exported accurately.' : '',
      outputFormat === 'pptx' ? 'The user requested a PowerPoint deck. Structure the response into concise slide-ready sections with Markdown headings and focused bullets.' : '',
      outputFormat === 'docx' || outputFormat === 'pdf' ? 'The user requested a polished document. Use clear Markdown headings, concise paragraphs and useful bullet lists.' : '',
    ].filter(Boolean).join('\n\n')
    const hasUrl = messages.slice(-4).some((message) => /https?:\/\/\S+/i.test(String(message?.content || '')))
    if (!attachments.length) {
      const interactionTools = [
        ...(research ? [{ type: 'google_search' }, ...(hasUrl ? [{ type: 'url_context' }] : [])] : []),
        ...(!research && project?.knowledgeStore ? [{ type: 'file_search', file_search_store_names: [String(project.knowledgeStore)] }] : []),
        ...(reasoning ? [{ type: 'code_execution' }] : []),
      ]
      let interactionId = ''
      const interactionSources = new Map()
      let wroteInteractionText = false
      try {
        await streamInteraction({
          apiKey,
          model: primaryModel,
          input: previousInteractionId ? String(messages.at(-1)?.content || '') : interactionInput(messages),
          previousInteractionId: previousInteractionId || undefined,
          systemInstruction: contextualInstruction,
          tools: interactionTools,
          thinkingLevel: reasoning ? 'high' : 'low',
          onEvent: (event) => {
            if (event.event_type === 'interaction.created' && event.interaction?.id) {
              interactionId = event.interaction.id
              res.write(`${JSON.stringify({ type: 'interaction', id: interactionId })}\n`)
            }
            if (event.event_type === 'step.delta' && event.delta?.type === 'text' && event.delta.text) {
              wroteInteractionText = true
              res.write(`${JSON.stringify({ type: 'text', text: event.delta.text })}\n`)
            }
            const annotations = event.delta?.annotations || event.step?.content?.flatMap?.((content) => content.annotations || []) || []
            for (const annotation of annotations) {
              const uri = annotation.url || annotation.uri || annotation.document_uri
              if (uri && !interactionSources.has(uri)) interactionSources.set(uri, { title: annotation.title || annotation.file_name || 'Source', uri })
            }
          },
        })
        if (interactionSources.size) res.write(`${JSON.stringify({ type: 'sources', sources: [...interactionSources.values()].slice(0, 12) })}\n`)
        if (interactionId) res.write(`${JSON.stringify({ type: 'interaction', id: interactionId })}\n`)
        res.write(`${JSON.stringify({ type: 'done' })}\n`)
        res.end()
        return
      } catch (error) {
        if (wroteInteractionText) throw error
      }
    }
    const tools = research
      ? [{ googleSearch: {} }, ...(hasUrl ? [{ urlContext: {} }] : [])]
      : reasoning ? [{ codeExecution: {} }] : []
    const config = {
      systemInstruction: contextualInstruction,
      thinkingConfig: { thinkingLevel: reasoning ? 'high' : 'low' },
      ...(tools.length ? { tools } : {}),
    }
    const modelCandidates = [...new Set([primaryModel, 'gemini-3.6-flash', 'gemini-3.5-flash'])]
    let lastError
    let completed = false
    const sources = new Map()
    for (const model of modelCandidates) {
      let wroteText = false
      try {
        const stream = await ai.models.generateContentStream({ model, contents: await normalizeContents(messages, attachments), config })
        for await (const chunk of stream) {
          if (chunk.text) {
            wroteText = true
            res.write(`${JSON.stringify({ type: 'text', text: chunk.text })}\n`)
          }
          collectSources(chunk.candidates?.[0]?.groundingMetadata, sources)
          collectUrlSources(chunk.candidates?.[0]?.urlContextMetadata, sources)
        }
        completed = true
        break
      } catch (error) {
        lastError = error
        if (wroteText) throw error
      }
    }
    if (!completed) throw lastError || new Error('No model route available')
    if (sources.size) res.write(`${JSON.stringify({ type: 'sources', sources: [...sources.values()].slice(0, 10) })}\n`)
    res.write(`${JSON.stringify({ type: 'done' })}\n`)
    res.end()
  } catch (error) {
    console.error('[chat]', { status: error?.status || error?.code, message: String(error?.message || error).slice(0, 600) })
    const safe = publicError(error)
    res.write(`${JSON.stringify({ type: 'error', error: safe.message })}\n`)
    res.end()
  }
})

app.post('/api/export', async (req, res) => {
  const format = String(req.body?.format || '').toLowerCase()
  const title = String(req.body?.title || 'Mere X document').trim().slice(0, 160)
  const content = String(req.body?.content || '').trim().slice(0, 300_000)
  if (!content) return res.status(400).json({ error: 'There is no content to export.' })
  if (!['docx', 'xlsx', 'pptx', 'pdf', 'md'].includes(format)) return res.status(400).json({ error: 'Choose Word, Excel, PowerPoint, PDF or Markdown.' })
  if (!await reserveUsage(req, res, 'export', Math.max(1, content.length / 80_000), { format })) return
  try {
    const { buffer, mimeType } = await createExport(format, title, content)
    const name = `${safeFilename(title)}.${format}`
    res.json({ name, mimeType, size: buffer.length, data: buffer.toString('base64') })
  } catch (error) {
    console.error('[export]', { message: String(error?.message || error).slice(0, 600) })
    const safe = publicError(error)
    res.status(safe.status).json({ error: safe.message })
  }
})

app.post('/api/image', async (req, res) => {
  const ai = client()
  if (!ai) return res.status(503).json({ error: 'Mere X intelligence is not configured.' })
  const { prompt, attachments = [] } = req.body || {}
  const aspectRatio = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'].includes(req.body?.aspectRatio) ? req.body.aspectRatio : '1:1'
  const imageSize = ['1K', '2K', '4K'].includes(req.body?.imageSize) ? req.body.imageSize : '2K'
  if (!String(prompt || '').trim()) return res.status(400).json({ error: 'Describe the image you want to create.' })
  if (!await reserveUsage(req, res, 'image', (attachments.length ? 1.15 : 1) * (imageSize === '4K' ? 1.7 : imageSize === '2K' ? 1.15 : 1), { editing: attachments.length > 0, aspectRatio, imageSize })) return

  try {
    const parts = [{ text: String(prompt).slice(0, 20_000) }]
    for (const attachment of attachments.slice(0, 5)) {
      if (attachment?.data && attachment?.mimeType?.startsWith('image/')) parts.push({ inlineData: { data: attachment.data, mimeType: attachment.mimeType } })
    }
    const imageModels = [...new Set([imageModel, 'gemini-3.1-flash-image'])]
    let response
    let lastError
    for (const model of imageModels) {
      try {
        response = await ai.models.generateContent({ model, contents: [{ role: 'user', parts }], config: { responseModalities: ['TEXT', 'IMAGE'], responseFormat: { image: { aspectRatio, imageSize } } } })
        break
      } catch (error) { lastError = error }
    }
    if (!response) throw lastError || new Error('No image route available')
    const output = { text: '', images: [] }
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.text) output.text += part.text
      if (part.inlineData?.data) output.images.push(`data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`)
    }
    if (!output.images.length) throw new Error('No image returned')
    res.json(output)
  } catch (error) {
    console.error('[image]', { status: error?.status || error?.code, message: String(error?.message || error).slice(0, 600) })
    const safe = publicError(error)
    res.status(safe.status).json({ error: safe.message })
  }
})

app.use('/api', (error, _req, res, _next) => {
  console.error('[api]', { code: error?.code, message: String(error?.message || error).slice(0, 500) })
  if (res.headersSent) return
  res.status(500).json({ error: 'Mere X could not access persistent storage. Please try again.' })
})

const distDir = path.resolve(currentDir, '..', 'dist')
if (process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT) {
  app.use(express.static(distDir))
  app.use((_req, res) => res.sendFile(path.join(distDir, 'index.html')))
}

let server
let cleanupTimer

async function startServer() {
  await initializeDatabase()
  await cleanupExpired()
  cleanupTimer = setInterval(() => {
    void cleanupExpired().catch(error => console.error('[database-cleanup]', { message: String(error?.message || error).slice(0, 300) }))
  }, 60 * 60 * 1000)
  cleanupTimer.unref()
  server = app.listen(port, '0.0.0.0', () => {
    console.log(`Mere X ready on port ${port}`)
  })
}

async function shutdown(signal) {
  console.log(`Mere X received ${signal}; shutting down.`)
  if (cleanupTimer) clearInterval(cleanupTimer)
  if (server) await new Promise(resolve => server.close(resolve))
  await closeDatabase().catch(() => undefined)
  process.exit(0)
}

process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))

startServer().catch(error => {
  console.error('[startup]', { code: error?.code, message: String(error?.message || error).slice(0, 600) })
  process.exit(1)
})
