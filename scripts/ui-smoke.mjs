import { writeFile } from 'node:fs/promises'
import { ensureBrowserAccount } from './browser-auth.mjs'

const debugPort = process.env.MERE_CDP_PORT || '9333'
const baseUrl = process.env.MERE_URL || 'http://127.0.0.1:5173/#/projects'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' }).then((response) => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
const pending = new Map()
const runtimeErrors = []
let commandId = 0

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

socket.addEventListener('message', (event) => {
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

async function waitFor(expression, timeout = 15_000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return true
    await sleep(150)
  }
  throw new Error(`Timed out waiting for: ${expression}`)
}

async function navigate(hash, readySelector) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`)
  await waitFor(`Boolean(document.querySelector(${JSON.stringify(readySelector)}))`)
}

async function click(selector) {
  const clicked = await evaluate(`(() => { const node = document.querySelector(${JSON.stringify(selector)}); if (!node) return false; node.click(); return true })()`)
  if (!clicked) throw new Error(`Could not click ${selector}`)
}

async function setValue(selector, value) {
  const changed = await evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return false;
    const prototype = node instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, ${JSON.stringify(value)});
    node.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  })()`)
  if (!changed) throw new Error(`Could not fill ${selector}`)
}

async function screenshot(path) {
  const capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(path, Buffer.from(capture.data, 'base64'))
}

try {
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Network.enable')
  await command('Network.deleteCookies', { name: 'mere_guest', url: 'http://127.0.0.1:5173' })
  await command('Page.reload')
  await waitFor(`Boolean(document.querySelector('body'))`)
  await ensureBrowserAccount(evaluate, 'UI Platform Smoke')
  await command('Page.navigate', { url: `${new URL(baseUrl).origin}${new URL(baseUrl).pathname}?qa=${Date.now()}#/projects` })
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await waitFor(`Boolean(document.querySelector('.app'))`)
  await evaluate(`location.hash='/projects'`)
  await waitFor(`Boolean(document.querySelector('.page-shell'))`)

  await click('.page-heading .primary-button')
  await waitFor(`Boolean(document.querySelector('.entity-modal'))`)
  await setValue('.entity-modal input', 'QA Project')
  await setValue('.entity-modal textarea', 'Keep every answer concise and validation-focused.')
  await evaluate(`document.querySelector('.entity-modal').requestSubmit()`)
  await waitFor(`[...document.querySelectorAll('.project-card h3')].some(node => node.textContent === 'QA Project')`)
  await evaluate(`[...document.querySelectorAll('.project-card')].find(node => node.querySelector('h3')?.textContent === 'QA Project').click()`)
  await waitFor(`document.querySelector('.context-banner b')?.textContent === 'QA Project'`)

  await navigate('/library', '.library-toolbar')
  await click('.page-heading .primary-button')
  await setValue('.entity-modal input', 'QA Document')
  await setValue('.entity-modal textarea', 'Persistent library validation content.')
  await evaluate(`document.querySelector('.entity-modal').requestSubmit()`)
  await waitFor(`[...document.querySelectorAll('.library-info h3')].some(node => node.textContent === 'QA Document')`)

  await navigate('/agents', '.agent-grid')
  await click('.page-heading .primary-button')
  await setValue('.entity-modal input', 'QA Specialist')
  await setValue('.entity-modal textarea.large', 'Follow the requested output format exactly and answer without extra commentary.')
  await evaluate(`document.querySelector('.entity-modal').requestSubmit()`)
  await waitFor(`[...document.querySelectorAll('.agent-card h3')].some(node => node.textContent === 'QA Specialist')`)
  await evaluate(`(() => { const card = [...document.querySelectorAll('.agent-card')].find(node => node.querySelector('h3')?.textContent === 'QA Specialist'); card.querySelector('.agent-actions button:last-child').click() })()`)
  await waitFor(`document.querySelector('.context-banner b')?.textContent === 'QA Specialist'`)

  await setValue('.composer textarea', 'Reply with exactly: UI_CHAT_OK')
  await evaluate(`document.querySelector('.composer').requestSubmit()`)
  await waitFor(`[...document.querySelectorAll('.markdown-response')].some(node => node.textContent.includes('UI_CHAT_OK')) && !document.querySelector('.thinking')`, 120_000)

  const geometry = await evaluate(`(() => {
    const page = document.querySelector('.page-area').getBoundingClientRect();
    const messages = document.querySelector('.messages').getBoundingClientRect();
    const composer = document.querySelector('.thread-composer').getBoundingClientRect();
    return { pageCenter: page.left + page.width / 2, messagesCenter: messages.left + messages.width / 2, composerCenter: composer.left + composer.width / 2, messagesWidth: messages.width, composerWidth: composer.width };
  })()`)
  await screenshot('mere-x-chat-qa.png')

  await click('.account-row')
  await waitFor(`Boolean(document.querySelector('.profile-menu'))`)
  await waitFor(`getComputedStyle(document.querySelector('.profile-menu')).opacity === '1' && getComputedStyle(document.querySelector('.profile-menu')).transform === 'none'`)
  await screenshot('mere-x-profile-qa.png')
  await click('.profile-plan-card')
  await waitFor(`document.querySelector('.settings-overlay h1')?.textContent === 'Plan & billing'`)
  await screenshot('mere-x-billing-qa.png')
  await click('.settings-nav-head .icon-button')
  await click('.account-row')
  await waitFor(`Boolean(document.querySelector('.profile-menu'))`)
  await click('.profile-shortcuts button:last-child')
  await waitFor(`Boolean(document.querySelector('.settings-overlay .settings-search'))`)
  await waitFor(`getComputedStyle(document.querySelector('.settings-overlay')).opacity === '1' && getComputedStyle(document.querySelector('.settings-modal-shell')).transform === 'none'`)
  await screenshot('mere-x-settings-qa.png')

  const result = await evaluate(`({
    route: location.hash,
    browserWorkspaceKeys: Object.keys(localStorage).filter(key => key.startsWith('mere-x-')),
    context: document.querySelector('.context-banner b')?.textContent,
    response: [...document.querySelectorAll('.markdown-response')].at(-1)?.textContent.trim()
  })`)
  if (result.browserWorkspaceKeys.length) throw new Error(`Workspace data leaked into localStorage: ${result.browserWorkspaceKeys.join(', ')}`)
  if (runtimeErrors.length) throw new Error(`Browser runtime errors: ${runtimeErrors.join(' | ')}`)
  console.log(JSON.stringify({ ok: true, ...result, geometry }, null, 2))
} catch (error) {
  const diagnostic = await evaluate(`(async()=>{const session=await fetch('/api/auth/session').then(response=>response.json()).catch(error=>({error:String(error)}));return {hash:location.hash,bodyClass:document.body.className,root:document.querySelector('#root')?.innerHTML.slice(0,800)||'',gate:document.querySelector('.workspace-gate')?.textContent||'',auth:Boolean(document.querySelector('.auth-form-wrap')),page:Boolean(document.querySelector('.page-shell')),session}})()`).catch(() => null)
  console.error(JSON.stringify({ ok: false, error: error.message, diagnostic, runtimeErrors }, null, 2))
  process.exitCode = 1
} finally {
  socket.close()
}
