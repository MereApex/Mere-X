import { writeFile } from 'node:fs/promises'

const debugPort = process.env.MERE_CDP_PORT || '9333'
const baseUrl = process.env.MERE_URL || 'http://127.0.0.1:5173/#/app'

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' }).then(response => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
const pending = new Map()
let commandId = 0

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (!message.id || !pending.has(message.id)) return
  const { resolve, reject } = pending.get(message.id)
  pending.delete(message.id)
  if (message.error) reject(new Error(message.error.message))
  else resolve(message.result)
})

function command(method, params = {}) {
  const id = ++commandId
  socket.send(JSON.stringify({ id, method, params }))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
  return result.result.value
}

async function waitFor(expression, timeout = 10_000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return
    await sleep(100)
  }
  throw new Error(`Timed out waiting for: ${expression}`)
}

const fontSize = selector => evaluate(`getComputedStyle(document.querySelector(${JSON.stringify(selector)})).fontSize`)

async function navigate(hash, selector) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`)
  await waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)
}

const textAudit = () => evaluate(`(() => {
  const nodes = [...document.querySelectorAll('body *')].filter(node => {
    const style = getComputedStyle(node)
    const ownText = [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim())
    return ownText && style.display !== 'none' && style.visibility !== 'hidden' && Number.parseFloat(style.fontSize) > 0
  })
  const entries = nodes.map(node => ({
    tag: node.tagName.toLowerCase(),
    className: typeof node.className === 'string' ? node.className : '',
    size: Number.parseFloat(getComputedStyle(node).fontSize),
    text: node.textContent.trim().slice(0, 45)
  }))
  return {
    minimum: Math.min(...entries.map(entry => entry.size)),
    belowTen: entries.filter(entry => entry.size < 10)
  }
})()`)

async function screenshot(path) {
  const capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(path, Buffer.from(capture.data, 'base64'))
}

try {
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await waitFor(`Boolean(document.querySelector('.account-row'))`)

  const chat = {
    navigation: await fontSize('.nav-row'),
    history: await fontSize('.history-group button'),
    composer: await fontSize('.composer textarea'),
    helper: await fontSize('.thread-composer > p, .disclaimer')
  }
  const chatAudit = await textAudit()
  await screenshot('mere-x-chat-type-qa.png')

  await evaluate(`document.querySelector('.account-row').click()`)
  await waitFor(`Boolean(document.querySelector('.profile-menu'))`)
  const profile = {
    item: await fontSize('.profile-shortcuts b'),
    name: await fontSize('.profile-menu-head b'),
    plan: await fontSize('.profile-plan-card em')
  }

  await evaluate(`document.querySelector('.profile-shortcuts button:last-child').click()`)
  await waitFor(`Boolean(document.querySelector('.settings-overlay .setting-copy'))`)
  const settings = {
    navigation: await fontSize('.settings-modal-shell .settings-nav-group > button'),
    search: await fontSize('.settings-search input'),
    description: await fontSize('.settings-modal-shell .page-heading > div > p:last-child'),
    section: await fontSize('.settings-section > h3'),
    title: await fontSize('.setting-copy b'),
    helper: await fontSize('.setting-copy small')
  }
  await screenshot('mere-x-settings-type-qa.png')

  await evaluate(`document.querySelector('.settings-nav-head .icon-button').click()`)
  await waitFor(`!document.querySelector('.settings-overlay')`)
  await evaluate(`location.hash = '/agents'`)
  await waitFor(`Boolean(document.querySelector('.agent-grid'))`)
  await evaluate(`document.querySelector('.page-heading .primary-button').click()`)
  await waitFor(`Boolean(document.querySelector('.entity-modal'))`)
  const entity = {
    heading: await fontSize('.entity-modal .modal-head h2'),
    description: await fontSize('.entity-modal .modal-head p:not(.eyebrow)'),
    label: await fontSize('.entity-modal label > span'),
    input: await fontSize('.entity-modal input'),
    note: await fontSize('.entity-modal .builder-note small'),
    button: await fontSize('.entity-modal .primary-button')
  }
  await screenshot('mere-x-entity-type-qa.png')

  await navigate('/projects', '.project-grid')
  const projects = {
    description: await fontSize('.page-heading > div > p:last-child'),
    cardTitle: await fontSize('.project-card h3'),
    cardBody: await fontSize('.project-card p'),
    metadata: await fontSize('.project-card > span')
  }
  const projectsAudit = await textAudit()
  await screenshot('mere-x-projects-type-qa.png')

  await navigate('/library', '.library-grid')
  const library = {
    filter: await fontSize('.segmented button'),
    search: await fontSize('.inline-search input'),
    type: await fontSize('.library-type'),
    title: await fontSize('.library-info h3'),
    detail: await fontSize('.library-info p')
  }
  const libraryAudit = await textAudit()

  await navigate('/', '.landing-page')
  const landing = {
    navigation: await fontSize('.landing-links button'),
    status: await fontSize('.landing-status'),
    body: await fontSize('.landing-hero > p'),
    action: await fontSize('.landing-cta'),
    kicker: await fontSize('.landing-kicker')
  }
  const landingAudit = await textAudit()
  await screenshot('mere-x-landing-type-qa.png')

  await navigate('/signin', '.auth-form-wrap')
  const auth = {
    description: await fontSize('.auth-form-wrap > p:nth-of-type(2)'),
    label: await fontSize('.auth-form-wrap form > label:not(.check-label)'),
    input: await fontSize('.auth-form-wrap input'),
    helper: await fontSize('.auth-switch'),
    action: await fontSize('.auth-submit')
  }
  const authAudit = await textAudit()
  await screenshot('mere-x-auth-type-qa.png')

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate('/app', '.composer')
  const mobile = {
    navigation: await fontSize('.nav-row'),
    composer: await fontSize('.composer textarea'),
    helper: await fontSize('.thread-composer > p, .disclaimer')
  }
  const mobileAudit = await textAudit()
  await screenshot('mere-x-mobile-type-qa.png')

  console.log(JSON.stringify({ ok: true, chat, profile, settings, entity, projects, library, landing, auth, mobile, audits: { chat: chatAudit, projects: projectsAudit, library: libraryAudit, landing: landingAudit, auth: authAudit, mobile: mobileAudit } }, null, 2))
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2))
  process.exitCode = 1
} finally {
  await command('Target.closeTarget', { targetId: target.id }).catch(() => {})
  socket.close()
}
