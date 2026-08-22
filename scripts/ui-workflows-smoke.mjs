import { writeFile } from 'node:fs/promises'
import { ensureBrowserAccount } from './browser-auth.mjs'

const debugPort = process.env.MERE_CDP_PORT || '9333'
const baseUrl = process.env.MERE_URL || 'http://127.0.0.1:5173/#/workflows'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' }).then(response => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
const pending = new Map()
const runtimeErrors = []
let commandId = 0

await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }) })
socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text || 'Unknown runtime exception')
  if (!message.id || !pending.has(message.id)) return
  const handlers = pending.get(message.id); pending.delete(message.id)
  if (message.error) handlers.reject(new Error(message.error.message)); else handlers.resolve(message.result)
})
function command(method, params = {}) { const id = ++commandId; socket.send(JSON.stringify({ id, method, params })); return new Promise((resolve, reject) => pending.set(id, { resolve, reject })) }
async function evaluate(expression) { const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text); return result.result.value }
async function waitFor(expression, timeout = 20_000) { const started = Date.now(); while (Date.now() - started < timeout) { if (await evaluate(expression)) return; await sleep(120) } throw new Error(`Timed out waiting for ${expression}`) }

try {
  await command('Runtime.enable'); await command('Page.enable'); await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await waitFor(`Boolean(document.querySelector('body'))`)
  await ensureBrowserAccount(evaluate, 'Workflows Smoke')
  await command('Page.navigate', { url: `${new URL(baseUrl).origin}${new URL(baseUrl).pathname}?qa=${Date.now()}#/workflows` })
  await waitFor(`Boolean(document.querySelector('.app'))`)
  await evaluate(`location.hash='/workflows'`)
  await waitFor(`Boolean(document.querySelector('.workflows-page'))`)
  const desktop = await evaluate(`(() => { const cards=[...document.querySelectorAll('.workflow-picker > button')]; const stage=document.querySelector('.workflow-stage').getBoundingClientRect(); return {cards:cards.map(card=>card.querySelector('b')?.textContent), active:document.querySelector('.workflow-picker > button.active b')?.textContent, stageWidth:stage.width, overflow:document.documentElement.scrollWidth>innerWidth} })()`)
  await evaluate(`[...document.querySelectorAll('.workflow-picker > button')].find(card => card.textContent.includes('Video Studio')).click()`)
  await waitFor(`document.querySelector('.workflow-form h2')?.textContent === 'Video Studio'`)
  const video = await evaluate(`(() => { const controls=[...document.querySelectorAll('.workflow-options select')]; return {frame:controls[0]?.value,quality:controls[1]?.value,controls:controls.length} })()`)
  const capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }); await writeFile('mere-x-workflows-qa.png', Buffer.from(capture.data, 'base64'))
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await sleep(220)
  const mobile = await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,cards:getComputedStyle(document.querySelector('.workflow-picker')).gridTemplateColumns,stage:getComputedStyle(document.querySelector('.workflow-stage')).gridTemplateColumns})`)
  await command('Page.navigate', { url: `${new URL(baseUrl).origin}${new URL(baseUrl).pathname}?qa=${Date.now()}#/app` })
  await waitFor(`Boolean(document.querySelector('[aria-label="Live voice conversation"]'))`)
  await evaluate(`document.querySelector('[aria-label="Live voice conversation"]').click()`)
  await waitFor(`Boolean(document.querySelector('.voice-shell'))`)
  const voice = await evaluate(`({open:Boolean(document.querySelector('.voice-shell')),temporary:document.querySelector('.voice-shell footer span')?.textContent,overflow:document.documentElement.scrollWidth>innerWidth})`)
  if (desktop.cards.length !== 4 || video.frame !== '16:9' || video.quality !== '720p' || !voice.open || desktop.overflow || mobile.overflow || voice.overflow || runtimeErrors.length) throw new Error(`Workflow UI validation failed: ${runtimeErrors.join(' | ')}`)
  console.log(JSON.stringify({ ok: true, desktop, video, mobile, voice, runtimeErrors }, null, 2))
} catch (error) { const diagnostic = await evaluate(`(async()=>({hash:location.hash,root:document.querySelector('#root')?.innerHTML.slice(0,800)||'',session:await fetch('/api/auth/session').then(response=>response.json()).catch(reason=>({error:String(reason)}))}))()`).catch(() => null); console.error(JSON.stringify({ ok: false, error: error.message, diagnostic, runtimeErrors }, null, 2)); process.exitCode = 1 } finally { socket.close() }
