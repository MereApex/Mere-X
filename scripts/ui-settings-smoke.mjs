import { writeFile } from 'node:fs/promises'
import { ensureBrowserAccount } from './browser-auth.mjs'

const debugPort = process.env.MERE_CDP_PORT || '9333'
const baseUrl = process.env.MERE_URL || 'http://127.0.0.1:5173/#/app'
const profileEmail = `settings-${Date.now()}@mere.test`
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

async function click(selector) {
  const clicked = await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; node.click(); return true })()`)
  if (!clicked) throw new Error(`Could not click ${selector}`)
}

async function clickText(selector, text) {
  const clicked = await evaluate(`(() => { const node = [...document.querySelectorAll(${JSON.stringify(selector)})].find(item => item.textContent.trim().includes(${JSON.stringify(text)})); if (!node) return false; node.click(); return true })()`)
  if (!clicked) throw new Error(`Could not click ${selector} containing ${text}`)
}

async function setValue(selector, value) {
  const changed = await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; const prototype = node instanceof HTMLSelectElement ? HTMLSelectElement.prototype : node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, ${JSON.stringify(value)}); node.dispatchEvent(new Event('change', { bubbles: true })); node.dispatchEvent(new Event('input', { bubbles: true })); return true })()`)
  if (!changed) throw new Error(`Could not fill ${selector}`)
}

async function screenshot(path) {
  const capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(path, Buffer.from(capture.data, 'base64'))
}

async function navigate(hash, selector = '.page-area') {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`)
  await waitFor(`Boolean(document.querySelector(${JSON.stringify(selector)}))`)
  await sleep(120)
}

async function openSettings(tabLabel = 'Settings') {
  await click('.account-row')
  await waitFor(`Boolean(document.querySelector('.profile-menu'))`)
  if (tabLabel === 'Billing') await click('.profile-plan-card')
  else if (tabLabel === 'Account') await click('.profile-menu-head')
  else await click('.profile-shortcuts button:last-child')
  await waitFor(`Boolean(document.querySelector('.settings-overlay'))`)
}

try {
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await waitFor(`Boolean(document.querySelector('body'))`)
  await ensureBrowserAccount(evaluate, 'Settings Smoke')
  await command('Page.navigate', { url: `${new URL(baseUrl).origin}${new URL(baseUrl).pathname}?qa=${Date.now()}#/app` })
  await waitFor(`Boolean(document.querySelector('.page-area'))`, 20_000)

  const modelHeader = await evaluate(`(() => { const node = document.querySelector('.model-identity'); return { exists: Boolean(node), tag: node?.tagName, hasChevron: Boolean(node?.querySelector('.lucide-chevron-down')), text: node?.textContent.trim() } })()`)

  await openSettings('Billing')
  await waitFor(`document.querySelector('.settings-content h1')?.textContent === 'Plan & billing'`)
  await setValue('.settings-search input', 'billing')
  await waitFor(`[...document.querySelectorAll('.settings-nav-group > button')].length === 1`)
  const settingsSearchResults = await evaluate(`[...document.querySelectorAll('.settings-nav-group > button')].filter(node => getComputedStyle(node).display !== 'none').map(node => node.textContent.trim())`)
  await setValue('.settings-search input', '')
  await waitFor(`document.querySelectorAll('.settings-nav-group > button').length >= 13`)
  await waitFor(`getComputedStyle(document.querySelector('.settings-overlay')).opacity === '1' && getComputedStyle(document.querySelector('.settings-modal-shell')).transform === 'none'`)
  await screenshot('mere-x-settings-billing-audit.png')
  await click('.billing-hero .primary-button')
  await waitFor(`location.hash === '#/pricing' && Boolean(document.querySelector('.pricing-grid')) && !document.querySelector('.settings-overlay')`)
  const billingPricingRoute = await evaluate(`location.hash`)
  await navigate('/app')
  await openSettings('Billing')
  await waitFor(`document.querySelector('.settings-content h1')?.textContent === 'Plan & billing'`)

  const settingsTabs = [
    ['General', 'General'], ['Notifications', 'Notifications'], ['Personalization', 'Personalization'], ['Connections', 'Connections'],
    ['Voice', 'Voice'], ['Billing', 'Plan & billing'], ['Data controls', 'Data controls'], ['Cloud sync', 'Cloud sync'],
    ['Storage', 'Storage'], ['Safety', 'Safety'], ['Security and login', 'Security and login'], ['Account', 'Account'], ['Keyboard shortcuts', 'Keyboard shortcuts'],
  ]
  const tabResults = {}
  for (const [label, heading] of settingsTabs) {
    await clickText('.settings-nav-group > button', label)
    await waitFor(`document.querySelector('.settings-content h1')?.textContent === ${JSON.stringify(heading)}`)
    tabResults[label] = await evaluate(`({ heading: document.querySelector('.settings-content h1')?.textContent, overflow: document.querySelector('.settings-content').scrollWidth > document.querySelector('.settings-content').clientWidth + 2 })`)
  }

  await clickText('.settings-nav-group > button', 'General')
  await setValue('.settings-content select[aria-label="Language"]', 'ქართული')
  await clickText('.settings-nav-group > button', 'Notifications')
  const notificationBefore = await evaluate(`document.querySelector('.settings-content button[aria-label="Product notifications"]')?.getAttribute('aria-checked') === 'true'`)
  await click('.settings-content button[aria-label="Product notifications"]')
  const notificationAfter = await evaluate(`document.querySelector('.settings-content button[aria-label="Product notifications"]')?.getAttribute('aria-checked') === 'true'`)

  await clickText('.settings-nav-group > button', 'Voice')
  const voiceBefore = await evaluate(`document.querySelector('.settings-content button[aria-label="Voice input"]')?.getAttribute('aria-checked') === 'true'`)
  await click('.settings-content button[aria-label="Voice input"]')
  const voiceAfter = await evaluate(`document.querySelector('.settings-content button[aria-label="Voice input"]')?.getAttribute('aria-checked') === 'true'`)

  await clickText('.settings-nav-group > button', 'Storage')
  await sleep(600)
  const storageProbe = await evaluate(`fetch('/api/account/storage').then(async response => ({ status: response.status, body: await response.text() }))`)
  if (storageProbe.status !== 200) throw new Error(`Account storage API returned ${storageProbe.status}: ${storageProbe.body}`)
  const storageLabel = await evaluate(`document.querySelector('.storage-meter b')?.textContent`)
  await clickText('.settings-nav-group > button', 'Account')
  await clickText('.profile-row .soft-button', 'Edit profile')
  await setValue('.profile-edit-form label:first-child input', 'QA User')
  await setValue('.profile-edit-form input[type="email"]', profileEmail)
  await click('.profile-edit-form .primary-button')
  await waitFor(`document.querySelector('.profile-row b')?.textContent === 'QA User'`)
  await sleep(950)
  const profileSaved = await evaluate(`fetch('/api/auth/session').then(response => response.json()).then(result => result.user?.name === 'QA User')`)
  await screenshot('mere-x-settings-account-audit.png')

  await click('.settings-nav-head .icon-button')
  await waitFor(`!document.querySelector('.settings-overlay')`)
  const voiceButtonVisible = await evaluate(`Boolean(document.querySelector('.composer button[aria-label="Voice input"]'))`)
  const accountName = await evaluate(`document.querySelector('.account-copy b')?.textContent`)

  await openSettings('Settings')
  await clickText('.settings-nav-group > button', 'Data controls')
  const historyBefore = await evaluate(`document.querySelector('.settings-content button[aria-label="Chat history"]')?.getAttribute('aria-checked') === 'true'`)
  await click('.settings-content button[aria-label="Chat history"]')
  await sleep(100)
  const historyAfter = await evaluate(`document.querySelector('.settings-content button[aria-label="Chat history"]')?.getAttribute('aria-checked') === 'true'`)
  const threadRemoved = await evaluate(`Object.keys(localStorage).every(key => !key.startsWith('mere-x-'))`)
  await click('.settings-content button[aria-label="Chat history"]')
  await clickText('.settings-nav-group > button', 'Safety')
  await clickText('.settings-content .soft-button', 'Open guide')
  await waitFor(`location.hash === '#/help' && Boolean(document.querySelector('.help-grid'))`)
  const safetyRouteClosedModal = await evaluate(`!document.querySelector('.settings-overlay')`)

  const profileRoutes = [
    ['.profile-resources button:nth-child(1)', '#/help', '.help-grid'],
    ['.profile-resources button:nth-child(2)', '#/release-notes', '.release-list'],
    ['.profile-resources button:nth-child(3)', '#/download', '.download-grid'],
    ['.profile-menu-foot > div button:nth-of-type(1)', '#/terms', '.document-layout'],
    ['.profile-menu-foot > div button:nth-of-type(2)', '#/privacy', '.document-layout'],
  ]
  const routeResults = []
  for (const [selector, hash, ready] of profileRoutes) {
    await navigate('/app')
    await click('.account-row')
    await waitFor(`Boolean(document.querySelector('.profile-menu'))`)
    await click(selector)
    await waitFor(`location.hash === ${JSON.stringify(hash)} && Boolean(document.querySelector(${JSON.stringify(ready)}))`)
    routeResults.push({ hash, ok: true })
  }

  await navigate('/app')
  await command('Page.reload')
  await waitFor(`Boolean(document.querySelector('.page-area'))`)

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await click('.mobile-menu')
  await waitFor(`document.querySelector('.sidebar')?.classList.contains('mobile-open')`)
  await click('.account-row')
  await waitFor(`Boolean(document.querySelector('.profile-menu'))`)
  await waitFor(`getComputedStyle(document.querySelector('.profile-menu')).opacity === '1' && getComputedStyle(document.querySelector('.profile-menu')).transform === 'none'`)
  const mobileMenu = await evaluate(`(() => { const node = document.querySelector('.profile-menu'); const rect = node.getBoundingClientRect(); return { left: rect.left, right: rect.right, width: rect.width, overflow: rect.left < 0 || rect.right > innerWidth } })()`)
  await screenshot('mere-x-profile-mobile-audit.png')
  await click('.profile-shortcuts button:last-child')
  await waitFor(`Boolean(document.querySelector('.settings-overlay .settings-content'))`)
  await waitFor(`getComputedStyle(document.querySelector('.settings-overlay')).opacity === '1' && getComputedStyle(document.querySelector('.settings-modal-shell')).transform === 'none'`)
  await sleep(350)
  const mobileSettings = await evaluate(`(() => { const shell = document.querySelector('.settings-modal-shell'); const content = document.querySelector('.settings-modal-shell .settings-content'); const rect = shell.getBoundingClientRect(); return { width: rect.width, height: rect.height, contentWidth: content.getBoundingClientRect().width, horizontalOverflow: shell.scrollWidth > shell.clientWidth + 2 || content.scrollWidth > content.clientWidth + 2 } })()`)
  await screenshot('mere-x-settings-mobile-audit.png')

  const failures = [
    !modelHeader.exists || modelHeader.tag !== 'DIV' || modelHeader.hasChevron ? 'Model header is still interactive or has a dropdown chevron' : null,
    settingsSearchResults.length !== 1 || !settingsSearchResults[0].includes('Billing') ? 'Settings search did not isolate Billing' : null,
    Object.values(tabResults).some(result => !result.heading || result.overflow) ? 'A settings tab is missing or horizontally overflowing' : null,
    notificationBefore === notificationAfter ? 'Notification toggle did not persist' : null,
    voiceBefore === voiceAfter ? 'Voice toggle did not persist' : null,
    voiceButtonVisible === voiceAfter ? null : 'Voice input visibility did not follow its setting',
    !storageLabel || storageLabel === '2.4 MB used' ? 'Storage usage is still hardcoded' : null,
    billingPricingRoute !== '#/pricing' ? 'Compare plans did not open Pricing cleanly' : null,
    !profileSaved || accountName !== 'QA User' ? 'Profile edits did not propagate to the sidebar' : null,
    historyBefore === historyAfter || !threadRemoved ? 'Chat history setting or browser-storage isolation failed' : null,
    !safetyRouteClosedModal ? 'Leaving settings kept the modal open' : null,
    routeResults.length !== profileRoutes.length ? 'A profile resource route failed' : null,
    mobileMenu.overflow ? 'Profile menu overflows the mobile viewport' : null,
    mobileSettings.horizontalOverflow || mobileSettings.contentWidth < 300 ? 'Settings layout is too narrow or overflows on mobile' : null,
    runtimeErrors.length ? `Runtime errors: ${runtimeErrors.join(' | ')}` : null,
  ].filter(Boolean)

  console.log(JSON.stringify({ ok: failures.length === 0, failures, modelHeader, billingPricingRoute, settingsSearchResults, tabResults, controls: { notificationBefore, notificationAfter, voiceBefore, voiceAfter, voiceButtonVisible, historyBefore, historyAfter, threadRemoved }, storageLabel, profileSaved, accountName, routeResults, mobileMenu, mobileSettings, runtimeErrors }, null, 2))
  if (failures.length) process.exitCode = 1
} catch (error) {
  const diagnostic = await evaluate(`(async()=>({hash:location.hash,root:document.querySelector('#root')?.innerHTML.slice(0,800)||'',session:await fetch('/api/auth/session').then(response=>response.json()).catch(reason=>({error:String(reason)}))}))()`).catch(() => null)
  console.error(JSON.stringify({ ok: false, error: error.message, diagnostic, runtimeErrors }, null, 2))
  process.exitCode = 1
} finally {
  await command('Target.closeTarget', { targetId: target.id }).catch(() => {})
  socket.close()
}
