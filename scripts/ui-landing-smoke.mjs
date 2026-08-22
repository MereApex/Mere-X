import { writeFile } from 'node:fs/promises'

const debugPort = process.env.MERE_CDP_PORT || '9333'
const baseUrl = process.env.MERE_URL || 'http://127.0.0.1:5173/#/'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' }).then(response => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
const pending = new Map()
const runtimeErrors = []
let commandId = 0

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text || 'Unknown runtime exception')
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

async function screenshot(path) {
  const capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(path, Buffer.from(capture.data, 'base64'))
}

async function audit(selector) {
  return evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(selector)});
    return {
      title: document.querySelector('h1')?.textContent.trim() || '',
      horizontalOverflow: root.scrollWidth > root.clientWidth + 2,
      viewport: { width: innerWidth, height: innerHeight },
    };
  })()`)
}

try {
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await waitFor(`Boolean(document.querySelector('.landing-page-v2'))`)
  await sleep(900)

  const landingDesktop = await audit('.landing-page-v2')
  const landingSystem = await evaluate(`({
    revealSections: document.querySelectorAll('[data-reveal]').length,
    capabilityCards: document.querySelectorAll('.capability-card').length,
    heroAnimation: getComputedStyle(document.querySelector('.hero-signal > i')).animationName,
    marqueeAnimation: getComputedStyle(document.querySelector('.landing-motion-rail > div')).animationName,
    navLinks: [...document.querySelectorAll('.landing-links button, .landing-links a')].map(node => node.textContent.trim()),
  })`)
  await screenshot('mere-x-landing-qa.png')
  await evaluate(`document.querySelector('#capabilities').scrollIntoView()`)
  await sleep(450)
  await screenshot('mere-x-landing-capabilities-qa.png')

  await evaluate(`([...document.querySelectorAll('.landing-links button, .landing-links a')].find(node => node.textContent.trim() === 'Mere Apex')).click()`)
  await waitFor(`Boolean(document.querySelector('.apex-doc-layout'))`)
  const apexDesktop = await audit('.public-page')
  await evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))`)
  const docs = await evaluate(`({ sections: document.querySelectorAll('.apex-doc-article').length, navItems: document.querySelectorAll('.apex-doc-nav button').length, activeNavItems: document.querySelectorAll('.apex-doc-nav button.active').length, shortcutFocused: document.activeElement === document.querySelector('.apex-doc-search input'), title: document.querySelector('.apex-doc-hero h1').textContent.trim() })`)
  await screenshot('mere-x-apex-qa.png')

  await evaluate(`(() => { const input = document.querySelector('.apex-doc-search input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, 'voice'); input.dispatchEvent(new Event('input', { bubbles: true })); })()`)
  await waitFor(`document.querySelectorAll('.apex-doc-article').length === 1`)
  const searchResult = await evaluate(`document.querySelector('.apex-doc-article h2').textContent.trim()`)

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await evaluate(`location.hash = '/'`)
  await waitFor(`Boolean(document.querySelector('.landing-page-v2'))`)
  await sleep(950)
  const landingMobile = await audit('.landing-page-v2')
  await screenshot('mere-x-landing-mobile-qa.png')

  await evaluate(`location.hash = '/apex'`)
  await waitFor(`Boolean(document.querySelector('.apex-doc-layout'))`)
  const apexMobile = await audit('.public-page')
  await screenshot('mere-x-apex-mobile-qa.png')

  const failures = [
    landingDesktop.horizontalOverflow ? 'Desktop landing has horizontal overflow' : null,
    apexDesktop.horizontalOverflow ? 'Desktop documentation has horizontal overflow' : null,
    landingMobile.horizontalOverflow ? 'Mobile landing has horizontal overflow' : null,
    apexMobile.horizontalOverflow ? 'Mobile documentation has horizontal overflow' : null,
    landingSystem.revealSections < 4 || landingSystem.capabilityCards !== 5 ? 'Landing sections are incomplete' : null,
    landingSystem.heroAnimation === 'none' || landingSystem.marqueeAnimation === 'none' ? 'Landing animations are not active' : null,
    !landingSystem.navLinks.includes('Mere Apex') ? 'Mere Apex navigation is missing' : null,
    docs.sections !== 11 || docs.navItems !== 11 ? `Documentation is incomplete: ${docs.sections} sections / ${docs.navItems} links` : null,
    docs.activeNavItems !== 1 || !docs.shortcutFocused ? 'Documentation navigation or search shortcut is inactive' : null,
    !searchResult.includes('conversation that can keep pace') ? `Documentation search returned ${searchResult}` : null,
    runtimeErrors.length ? `Runtime errors: ${runtimeErrors.join(' | ')}` : null,
  ].filter(Boolean)

  console.log(JSON.stringify({ ok: failures.length === 0, failures, landing: { desktop: landingDesktop, mobile: landingMobile, system: landingSystem }, apex: { desktop: apexDesktop, mobile: apexMobile, docs, searchResult }, runtimeErrors }, null, 2))
  if (failures.length) process.exitCode = 1
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message, runtimeErrors }, null, 2))
  process.exitCode = 1
} finally {
  await command('Target.closeTarget', { targetId: target.id }).catch(() => {})
  socket.close()
}
