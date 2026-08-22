const debugPort = process.env.MERE_CDP_PORT || '9333'
const baseUrl = process.env.MERE_URL || 'http://127.0.0.1:5173/#/signin'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(baseUrl)}`, { method: 'PUT' }).then(response => response.json())
const socket = new WebSocket(target.webSocketDebuggerUrl)
const pending = new Map()
const runtimeErrors = []
const consoleErrors = []
let commandId = 0

await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true })
  socket.addEventListener('error', reject, { once: true })
})

socket.addEventListener('message', event => {
  const message = JSON.parse(event.data)
  if (message.method === 'Runtime.exceptionThrown') runtimeErrors.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text || 'Unknown runtime exception')
  if (message.method === 'Runtime.consoleAPICalled' && message.params?.type === 'error') consoleErrors.push(message.params.args?.map(item => item.value || item.description || '').join(' ') || 'Unknown console error')
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

try {
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Network.enable')
  await evaluate(`fetch('/api/auth/signout', { method: 'POST' }).then(() => { location.hash='/app'; location.reload(); return true })`)
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await evaluate(`Boolean(document.querySelector('.auth-form-wrap'))`)) break
    await sleep(100)
  }
  const protectedRouteRedirected = await evaluate(`location.hash === '#/signin'`)
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (await evaluate(`Boolean(document.querySelector('.google-auth-section iframe'))`)) break
    await sleep(100)
  }
  const state = await evaluate(`(async()=>{const response=await fetch('/api/auth/config');const config=await response.json();const section=document.querySelector('.google-auth-section');const container=section?.querySelector('.google-auth-button');const containerRect=container?.getBoundingClientRect();const button=[...container?.querySelectorAll('[role="button"]')||[]].map(element=>{const rect=element.getBoundingClientRect();return {width:rect.width,height:rect.height,text:String(element.textContent||'').trim()}}).find(element=>element.text.includes('Google'));return {configEnabled:Boolean(config.googleClientId),sectionVisible:Boolean(section&&getComputedStyle(section).display!=='none'),containerWidth:containerRect?.width||0,containerHeight:containerRect?.height||0,button:button||null,scriptLoaded:Boolean(document.querySelector('script[data-mere-google-identity]'))}})()`)
  const capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile('mere-x-auth-google.png', Buffer.from(capture.data, 'base64'))
  const googleButtonVisible = Boolean(state.button && state.button.width > 0 && state.button.height > 0)
  const googleButtonEnglish = /(?:sign in|sign up|continue) with google/i.test(state.button?.text || '')
  const failures = [!protectedRouteRedirected ? 'Unauthenticated app route did not redirect to sign in' : null, !state.configEnabled ? 'Google client ID was not returned by the API' : null, !state.sectionVisible ? 'Google sign-in section was not rendered' : null, !googleButtonVisible ? 'Official Google button was not visible' : null, !googleButtonEnglish ? `Google button was not rendered in English: ${state.button?.text || 'missing'}` : null, runtimeErrors.length ? 'Runtime errors were reported' : null].filter(Boolean)
  console.log(JSON.stringify({ ok: failures.length === 0, failures, state, runtimeErrors, consoleErrors }, null, 2))
  if (failures.length) process.exitCode = 1
} finally {
  socket.close()
  await fetch(`http://127.0.0.1:${debugPort}/json/close/${target.id}`).catch(() => undefined)
}
import { writeFile } from 'node:fs/promises'
