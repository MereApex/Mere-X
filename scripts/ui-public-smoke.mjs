import { writeFile } from 'node:fs/promises'

const debugPort = process.env.MERE_CDP_PORT || '9333'
const baseUrl = process.env.MERE_URL || 'http://127.0.0.1:5173/#/pricing'
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
  if (message.method === 'Runtime.exceptionThrown') {
    runtimeErrors.push(message.params?.exceptionDetails?.exception?.description || message.params?.exceptionDetails?.text || 'Unknown runtime exception')
  }
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

async function navigate(hash, readySelector) {
  await evaluate(`location.hash = ${JSON.stringify(hash)}`)
  await waitFor(`Boolean(document.querySelector(${JSON.stringify(readySelector)}))`)
  await sleep(120)
}

async function screenshot(path) {
  const capture = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })
  await writeFile(path, Buffer.from(capture.data, 'base64'))
}

async function pageAudit(selector) {
  return evaluate(`(() => {
    const root = document.querySelector(${JSON.stringify(selector)});
    const visibleText = [...root.querySelectorAll('*')].filter(node => {
      const style = getComputedStyle(node);
      return style.display !== 'none' && style.visibility !== 'hidden' && [...node.childNodes].some(child => child.nodeType === Node.TEXT_NODE && child.textContent.trim());
    });
    const minimumFont = Math.min(...visibleText.map(node => Number.parseFloat(getComputedStyle(node).fontSize)));
    return {
      title: document.querySelector('h1')?.textContent.trim() || '',
      minimumFont,
      horizontalOverflow: root.scrollWidth > root.clientWidth + 2,
      visibleTextCount: visibleText.length
    };
  })()`)
}

try {
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Network.enable')
  await command('Network.deleteCookies', { name: 'mere_guest', url: 'http://127.0.0.1:5173' })
  await command('Page.reload')
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await waitFor(`Boolean(document.querySelector('.pricing-grid'))`)

  const routes = [
    ['/apex', '.apex-doc-layout'],
    ['/pricing', '.pricing-grid'],
    ['/privacy', '.document-layout'],
    ['/terms', '.document-layout'],
    ['/acceptable-use', '.document-layout'],
    ['/cookies', '.document-layout'],
    ['/security', '.security-grid'],
    ['/help', '.help-grid'],
    ['/status', '.status-card'],
    ['/release-notes', '.release-list'],
    ['/download', '.download-grid'],
  ]
  const routeResults = {}
  for (const [hash, selector] of routes) {
    await navigate(hash, selector)
    routeResults[hash] = await pageAudit('.public-page')
  }

  await navigate('/', '.landing-page-v2')
  const landingDesktop = await pageAudit('.landing-page-v2')
  const landingMotion = await evaluate(`({ reveals: document.querySelectorAll('[data-reveal]').length, animated: getComputedStyle(document.querySelector('.hero-signal > i')).animationName, cards: document.querySelectorAll('.capability-card').length })`)
  await screenshot('mere-x-landing-qa.png')

  await navigate('/pricing', '.pricing-grid')
  const annualPlus = await evaluate(`document.querySelectorAll('.pricing-card')[1].querySelector('.plan-price strong').textContent`)
  await evaluate(`([...document.querySelectorAll('.billing-toggle button')].find(button => button.textContent.trim() === 'Monthly')).click()`)
  await waitFor(`document.querySelectorAll('.pricing-card')[1].querySelector('.plan-price strong').textContent === '$18'`)
  const monthlyPlus = await evaluate(`document.querySelectorAll('.pricing-card')[1].querySelector('.plan-price strong').textContent`)
  await screenshot('mere-x-pricing-qa.png')

  await navigate('/security', '.security-grid')
  await screenshot('mere-x-security-qa.png')

  await navigate('/app', '.page-area')
  const seedMessages = Array.from({ length: 16 }, (_, index) => ({
    id: 20_000 + index,
    role: index % 2 ? 'assistant' : 'user',
    content: `${index % 2 ? 'Mere Apex response' : 'User prompt'} ${index + 1}. ${'This is a scroll verification line. '.repeat(5)}`,
  }))
  await evaluate(`localStorage.setItem('mere-x-thread', ${JSON.stringify(JSON.stringify(seedMessages))}); location.reload()`)
  await waitFor(`document.querySelectorAll('.message').length >= 16`)
  await sleep(250)
  const initialScroll = await evaluate(`(() => { const node = document.querySelector('.page-area'); return { top: node.scrollTop, max: node.scrollHeight - node.clientHeight, atBottom: node.scrollTop + node.clientHeight >= node.scrollHeight - 3 } })()`)
  await evaluate(`document.querySelector('.page-area').scrollTop = 0`)
  await evaluate(`(() => {
    const node = document.querySelector('.composer textarea');
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set.call(node, 'Autoscroll verification message');
    node.dispatchEvent(new Event('input', { bubbles: true }));
  })()`)
  await waitFor(`!document.querySelector('.composer button[aria-label="Send message"]').disabled`)
  await evaluate(`document.querySelector('.composer').requestSubmit()`)
  await waitFor(`document.querySelectorAll('.message').length >= 17`)
  await sleep(250)
  const afterSubmitScroll = await evaluate(`(() => { const node = document.querySelector('.page-area'); return { top: node.scrollTop, max: node.scrollHeight - node.clientHeight, atBottom: node.scrollTop + node.clientHeight >= node.scrollHeight - 3 } })()`)
  await evaluate(`document.querySelector('.stop-button')?.click()`)

  await evaluate(`document.querySelector('.assistant-message .response-export-wrap .icon-button').click()`)
  await waitFor(`Boolean(document.querySelector('.response-export-menu'))`)
  await evaluate(`([...document.querySelectorAll('.response-export-menu button')].find(button => button.textContent.includes('Word'))).click()`)
  await waitFor(`Boolean(document.querySelector('.assistant-message .generated-files a[download$=".docx"]'))`)
  const responseExport = await evaluate(`(() => { const link = document.querySelector('.assistant-message .generated-files a[download$=".docx"]'); return { name: link.getAttribute('download'), hrefType: link.getAttribute('href').slice(0, 70) } })()`)

  await evaluate(`document.querySelector('.composer .attach-wrap .icon-button').click()`)
  await waitFor(`Boolean(document.querySelector('.composer .attach-menu'))`)
  const toolLabels = await evaluate(`[...document.querySelectorAll('.composer .attach-menu button b')].map(node => node.textContent.trim())`)
  await evaluate(`([...document.querySelectorAll('.composer .attach-menu button')].find(button => button.textContent.includes('Create a document'))).click()`)
  await waitFor(`Boolean(document.querySelector('.output-mode-banner'))`)
  const documentFormats = await evaluate(`[...document.querySelectorAll('.output-mode-banner > div button')].map(node => node.textContent.trim())`)
  await screenshot('mere-x-document-tools-qa.png')

  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await navigate('/pricing', '.pricing-grid')
  const mobilePricing = await pageAudit('.public-page')
  await screenshot('mere-x-pricing-mobile-qa.png')
  await navigate('/privacy', '.document-layout')
  const mobilePrivacy = await pageAudit('.public-page')
  await screenshot('mere-x-privacy-mobile-qa.png')
  await navigate('/apex', '.apex-doc-layout')
  const mobileApex = await pageAudit('.public-page')
  await screenshot('mere-x-apex-mobile-qa.png')
  await navigate('/', '.landing-page-v2')
  const mobileLanding = await pageAudit('.landing-page-v2')
  await screenshot('mere-x-landing-mobile-qa.png')

  const failures = [
    ...Object.entries(routeResults).flatMap(([route, result]) => [
      result.horizontalOverflow ? `${route} has horizontal overflow` : null,
      result.minimumFont < 11 ? `${route} has text below 11px` : null,
      !result.title ? `${route} has no H1` : null,
    ]),
    annualPlus !== '$15' ? `Annual Plus price was ${annualPlus}` : null,
    monthlyPlus !== '$18' ? `Monthly Plus price was ${monthlyPlus}` : null,
    !responseExport.name?.endsWith('.docx') || !responseExport.hrefType.startsWith('data:application/vnd.openxmlformats-officedocument') ? 'Response DOCX export card is invalid' : null,
    !toolLabels.includes('Edit an image') || !toolLabels.includes('Create a document') ? 'Composer media/document tools are incomplete' : null,
    documentFormats.join(',') !== '.docx,.pptx,.xlsx,.pdf,.md' ? `Document format picker is incomplete: ${documentFormats.join(',')}` : null,
    !initialScroll.atBottom || initialScroll.max <= 0 ? 'Initial populated chat did not settle at the bottom' : null,
    !afterSubmitScroll.atBottom ? 'Chat did not auto-scroll after submit' : null,
    mobilePricing.horizontalOverflow ? 'Mobile pricing has horizontal overflow' : null,
    mobilePrivacy.horizontalOverflow ? 'Mobile privacy has horizontal overflow' : null,
    landingDesktop.horizontalOverflow ? 'Desktop landing has horizontal overflow' : null,
    mobileLanding.horizontalOverflow ? 'Mobile landing has horizontal overflow' : null,
    mobileApex.horizontalOverflow ? 'Mobile Mere Apex documentation has horizontal overflow' : null,
    landingMotion.reveals < 4 || landingMotion.cards !== 5 || landingMotion.animated === 'none' ? 'Landing motion system is incomplete' : null,
    runtimeErrors.length ? `Runtime errors: ${runtimeErrors.join(' | ')}` : null,
  ].filter(Boolean)

  console.log(JSON.stringify({ ok: failures.length === 0, failures, routeResults, landing: { desktop: landingDesktop, motion: landingMotion }, prices: { annualPlus, monthlyPlus }, documents: { responseExport, toolLabels, documentFormats }, chatScroll: { initialScroll, afterSubmitScroll }, mobile: { pricing: mobilePricing, privacy: mobilePrivacy, apex: mobileApex, landing: mobileLanding }, runtimeErrors }, null, 2))
  if (failures.length) process.exitCode = 1
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message, runtimeErrors }, null, 2))
  process.exitCode = 1
} finally {
  await command('Target.closeTarget', { targetId: target.id }).catch(() => {})
  socket.close()
}
