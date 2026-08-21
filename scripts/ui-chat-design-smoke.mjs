import { writeFile } from 'node:fs/promises'

const debugPort = process.env.MERE_CDP_PORT || '9333'
const baseUrl = process.env.MERE_URL || 'http://127.0.0.1:5173/#/app'
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

async function audit() {
  return evaluate(`(() => {
    const area = document.querySelector('.page-area');
    const composer = document.querySelector('.composer');
    const user = document.querySelector('.user-message');
    const assistant = document.querySelector('.assistant-message');
    const actionBar = document.querySelector('.message-actions');
    return {
      horizontalOverflow: area.scrollWidth > area.clientWidth + 2,
      composerWidth: Math.round(composer.getBoundingClientRect().width),
      composerBorder: getComputedStyle(composer).borderTopWidth,
      topbarBorder: getComputedStyle(document.querySelector('.chat-topbar')).borderBottomWidth,
      userBorder: getComputedStyle(document.querySelector('.user-bubble')).borderTopWidth,
      assistantIconBorder: getComputedStyle(document.querySelector('.assistant-icon')).borderTopWidth,
      actionBorder: getComputedStyle(actionBar).borderTopWidth,
      userAvatarCount: user.querySelectorAll('.avatar').length,
      actionCount: actionBar.querySelectorAll('button').length,
      userRight: Math.round(user.getBoundingClientRect().right),
      assistantLeft: Math.round(assistant.getBoundingClientRect().left),
      viewport: { width: innerWidth, height: innerHeight },
    };
  })()`)
}

const seededMessages = [
  { id: 41_001, role: 'user', content: 'Turn this launch research into one clear decision and a finished brief.', attachments: ['market-notes.pdf', 'launch-data.xlsx'] },
  { id: 41_002, role: 'assistant', content: '## Recommended direction\n\nStart with a focused two-market pilot. It protects the launch narrative while giving the team enough evidence to make the second-stage decision.\n\n- Lead with the strongest audience signal\n- Keep the rollout measurable\n- Review the expansion gate after the first cycle\n\n> The advantage is focus: fewer variables, cleaner learning, and a stronger final story.', sources: [{ title: 'Market readiness summary', uri: 'https://example.com/research' }], files: [{ name: 'launch-decision.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', data: 'UEs=', size: 24800, format: 'docx' }] },
]

try {
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Network.enable')
  await command('Network.deleteCookies', { name: 'mere_session', url: 'http://127.0.0.1:5173' })
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await evaluate(`localStorage.removeItem('mere-x-thread'); localStorage.removeItem('mere-x-active-chat'); location.hash = '/app'; location.reload()`)
  await waitFor(`Boolean(document.querySelector('.empty-chat .composer'))`)
  await sleep(250)
  const emptyState = await evaluate(`({ starterCount: document.querySelectorAll('.starter-grid button').length, composerWidth: Math.round(document.querySelector('.composer').getBoundingClientRect().width), horizontalOverflow: document.querySelector('.page-area').scrollWidth > document.querySelector('.page-area').clientWidth + 2 })`)
  await screenshot('mere-x-chat-empty-v2-qa.png')
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await sleep(200)
  const emptyMobile = await evaluate(`({ starterCount: document.querySelectorAll('.starter-grid button').length, composerWidth: Math.round(document.querySelector('.composer').getBoundingClientRect().width), horizontalOverflow: document.querySelector('.page-area').scrollWidth > document.querySelector('.page-area').clientWidth + 2 })`)
  await screenshot('mere-x-chat-empty-v2-mobile-qa.png')
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })

  await evaluate(`localStorage.setItem('mere-x-thread', ${JSON.stringify(JSON.stringify(seededMessages))}); location.reload()`)
  await waitFor(`document.querySelectorAll('.message').length === 2`)
  await sleep(250)
  const desktop = await audit()
  await evaluate(`document.querySelector('.page-area').scrollTop = 0`)
  await sleep(120)
  await screenshot('mere-x-chat-v2-top-qa.png')
  await evaluate(`document.querySelector('.page-area').scrollTop = document.querySelector('.page-area').scrollHeight`)
  await sleep(120)
  await screenshot('mere-x-chat-v2-qa.png')

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await sleep(250)
  const mobile = await audit()
  await evaluate(`document.querySelector('.page-area').scrollTop = 0`)
  await sleep(120)
  await screenshot('mere-x-chat-v2-mobile-qa.png')

  const failures = [
    emptyState.starterCount !== 4 ? `Empty chat has ${emptyState.starterCount} starters` : null,
    emptyState.horizontalOverflow ? 'Empty chat has horizontal overflow' : null,
    emptyMobile.starterCount !== 4 || emptyMobile.horizontalOverflow ? 'Mobile empty chat is incomplete or overflowing' : null,
    desktop.horizontalOverflow ? 'Desktop chat has horizontal overflow' : null,
    mobile.horizontalOverflow ? 'Mobile chat has horizontal overflow' : null,
    desktop.composerWidth > 700 || mobile.composerWidth > 370 ? 'Composer width is unbalanced' : null,
    desktop.composerBorder !== '0px' || desktop.topbarBorder !== '0px' || desktop.userBorder !== '0px' || desktop.assistantIconBorder !== '0px' || desktop.actionBorder !== '0px' ? 'Hard chat dividers remain visible' : null,
    desktop.userAvatarCount !== 0 ? 'User avatar ring remains in the thread' : null,
    desktop.actionCount < 6 ? 'Response actions are incomplete' : null,
    runtimeErrors.length ? `Runtime errors: ${runtimeErrors.join(' | ')}` : null,
  ].filter(Boolean)

  console.log(JSON.stringify({ ok: failures.length === 0, failures, emptyState, emptyMobile, desktop, mobile, runtimeErrors }, null, 2))
  if (failures.length) process.exitCode = 1
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message, runtimeErrors }, null, 2))
  process.exitCode = 1
} finally {
  await command('Target.closeTarget', { targetId: target.id }).catch(() => {})
  socket.close()
}
