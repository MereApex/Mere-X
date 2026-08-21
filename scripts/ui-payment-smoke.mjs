import { writeFile } from 'node:fs/promises'

const debugPort = process.env.MERE_CDP_PORT || '9333'
const baseUrl = process.env.MERE_URL || 'http://127.0.0.1:5173/#/pricing'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
const email = `payment-ui-${Date.now()}@mere.test`
const password = 'MerePayment!2468'
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

async function waitFor(expression, timeout = 15_000) {
  const started = Date.now()
  while (Date.now() - started < timeout) {
    if (await evaluate(expression)) return
    await sleep(120)
  }
  throw new Error(`Timed out waiting for: ${expression}`)
}

async function screenshot(path) {
  const capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(path, Buffer.from(capture.data, 'base64'))
}

try {
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Network.enable')
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await waitFor(`Boolean(document.querySelector('.pricing-grid'))`)
  await evaluate(`localStorage.setItem('mere-x-conversations',JSON.stringify([{id:'stale-demo',title:'Demo conversation',messages:[],updated:'now'}]));localStorage.setItem('mere-x-projects',JSON.stringify([{id:'stale-project',name:'Demo project'}]));localStorage.setItem('mere-x-library',JSON.stringify([{id:'stale-file',title:'Demo file'}]));true`)
  const signup = await evaluate(`(async()=>{const start=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Payment UI',email:${JSON.stringify(email)},password:${JSON.stringify(password)}})});const challenge=await start.json();if(!start.ok||!challenge.challengeId||!challenge.previewCode)return {ok:false,body:challenge};const verify=await fetch('/api/auth/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:challenge.challengeId,code:challenge.previewCode})});return {ok:verify.ok,body:await verify.json()}})()`)
  if (!signup.ok) throw new Error(signup.body?.error || 'Payment UI account setup failed.')
  await command('Page.reload')
  await waitFor(`document.querySelectorAll('.pricing-card button')[0]?.textContent.includes('Current plan')`)
  await waitFor(`Boolean(document.querySelector('.public-account-return'))`)
  await waitFor(`['mere-x-conversations','mere-x-projects','mere-x-library'].every(key=>JSON.parse(localStorage.getItem(key)||'[]').length===0)`)
  const accountContext = await evaluate(`({header:document.querySelector('.public-account-return')?.textContent||'',conversations:JSON.parse(localStorage.getItem('mere-x-conversations')||'[]').length,projects:JSON.parse(localStorage.getItem('mere-x-projects')||'[]').length,library:JSON.parse(localStorage.getItem('mere-x-library')||'[]').length})`)
  await waitFor(`Boolean([...document.querySelectorAll('.pricing-card button')].find(button=>button.textContent.includes('Choose Plus')))`)
  const opened = await evaluate(`(() => { const button=[...document.querySelectorAll('.pricing-card button')].find(node=>node.textContent.includes('Choose Plus')); if(!button)return false; button.click(); return true })()`)
  if (!opened) throw new Error('The Plus checkout trigger was not found.')
  await waitFor(`Boolean(document.querySelector('.payment-modal'))`)
  await sleep(750)
  const desktop = await evaluate(`(() => { const overlay=document.querySelector('.payment-modal-overlay'); const modal=document.querySelector('.payment-modal'); const rect=modal.getBoundingClientRect(); return {width:Math.round(rect.width),height:Math.round(rect.height),horizontalOverflow:modal.scrollWidth>modal.clientWidth+2,viewportOverflow:rect.right>innerWidth||rect.bottom>innerHeight,total:document.querySelector('.payment-total strong')?.textContent,methods:[...document.querySelectorAll('.accepted-cards span')].map(node=>node.textContent)} })()`)
  await screenshot('mere-x-payment-checkout-desktop.png')
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await sleep(180)
  const mobile = await evaluate(`(() => { const modal=document.querySelector('.payment-modal'); const rect=modal.getBoundingClientRect(); return {width:Math.round(rect.width),height:Math.round(rect.height),horizontalOverflow:modal.scrollWidth>modal.clientWidth+2,viewportOverflow:rect.right>innerWidth+2} })()`)
  await screenshot('mere-x-payment-checkout-mobile.png')
  await evaluate(`fetch('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:${JSON.stringify(password)}})})`)
  const failures = [desktop.horizontalOverflow || desktop.viewportOverflow ? 'Desktop checkout overflows' : null, mobile.horizontalOverflow || mobile.viewportOverflow ? 'Mobile checkout overflows' : null, desktop.total !== '$180.00' ? 'Annual total is incorrect' : null, desktop.methods.length < 4 ? 'Payment method labels are incomplete' : null, !accountContext.header.includes('Payment UI') ? 'Signed-in pricing header is missing' : null, accountContext.conversations || accountContext.projects || accountContext.library ? 'Stale demo workspace data leaked into the new account' : null, runtimeErrors.length ? 'Runtime errors were reported' : null].filter(Boolean)
  console.log(JSON.stringify({ ok: failures.length === 0, failures, accountContext, desktop, mobile, runtimeErrors }, null, 2))
  if (failures.length) process.exitCode = 1
} finally {
  await evaluate(`fetch('/api/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:${JSON.stringify(password)}})})`).catch(() => undefined)
  await command('Target.closeTarget', { targetId: target.id }).catch(() => undefined)
  socket.close()
}
