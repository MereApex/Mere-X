import { writeFile } from 'node:fs/promises'
import { ensureBrowserAccount } from './browser-auth.mjs'

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
  return evaluate(`(async () => {
    const sidebar = document.querySelector('.sidebar');
    const menu = document.querySelector('.profile-menu');
    const logo = document.querySelector('.brand-symbol img');
    const sidebarRect = sidebar.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    const bitmap = await createImageBitmap(await (await fetch(logo.src)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext('2d');
    context.drawImage(bitmap, 0, 0);
    const cornerAlpha = context.getImageData(0, 0, 1, 1).data[3];
    bitmap.close();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      sidebar: { left: Math.round(sidebarRect.left), right: Math.round(sidebarRect.right), width: Math.round(sidebarRect.width) },
      menu: { left: Math.round(menuRect.left), right: Math.round(menuRect.right), width: Math.round(menuRect.width), height: Math.round(menuRect.height) },
      menuBorder: getComputedStyle(menu).borderTopWidth,
      sidebarBorder: getComputedStyle(sidebar).borderRightWidth,
      primaryBorder: getComputedStyle(document.querySelector('.primary-nav')).borderTopWidth,
      footerBorder: getComputedStyle(document.querySelector('.sidebar-footer')).borderTopWidth,
      newChatBackground: getComputedStyle(document.querySelector('.new-chat')).backgroundColor,
      logoSource: logo.currentSrc,
      logoCornerAlpha: cornerAlpha,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth + 2,
    };
  })()`)
}

try {
  await command('Runtime.enable')
  await command('Page.enable')
  await command('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
  await waitFor(`Boolean(document.querySelector('body'))`)
  await ensureBrowserAccount(evaluate, 'Sidebar Design Smoke')
  await command('Page.navigate', { url: `${new URL(baseUrl).origin}${new URL(baseUrl).pathname}?qa=${Date.now()}#/app` })
  await waitFor(`Boolean(document.querySelector('.sidebar .account-row'))`)
  await evaluate(`document.querySelector('.account-row').click()`)
  await waitFor(`Boolean(document.querySelector('.profile-menu'))`)
  await waitFor(`getComputedStyle(document.querySelector('.profile-menu')).transform === 'none'`)
  const desktop = await audit()
  await screenshot('mere-x-sidebar-profile-qa.png')

  await evaluate(`document.querySelector('.profile-menu-scrim').click()`)
  await command('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true })
  await sleep(150)
  await evaluate(`document.querySelector('.mobile-menu').click()`)
  await waitFor(`document.querySelector('.sidebar').classList.contains('mobile-open')`)
  await evaluate(`document.querySelector('.account-row').click()`)
  await waitFor(`Boolean(document.querySelector('.profile-menu'))`)
  await waitFor(`getComputedStyle(document.querySelector('.profile-menu')).transform === 'none'`)
  const mobile = await audit()
  await screenshot('mere-x-sidebar-profile-mobile-qa.png')

  const failures = [
    Math.abs(desktop.sidebar.width - desktop.menu.width) > 1 ? `Desktop profile width ${desktop.menu.width}px does not match sidebar ${desktop.sidebar.width}px` : null,
    Math.abs(desktop.sidebar.left - desktop.menu.left) > 1 || Math.abs(desktop.sidebar.right - desktop.menu.right) > 1 ? 'Desktop profile menu is not aligned to the sidebar' : null,
    mobile.menu.width > mobile.sidebar.width + 1 || mobile.menu.left < mobile.sidebar.left - 1 || mobile.menu.right > mobile.sidebar.right + 1 ? 'Mobile profile menu escapes the sidebar' : null,
    desktop.menuBorder !== '0px' || desktop.sidebarBorder !== '0px' || desktop.primaryBorder !== '0px' || desktop.footerBorder !== '0px' ? 'Hard sidebar divider remains visible' : null,
    desktop.newChatBackground === 'rgb(239, 239, 236)' || desktop.newChatBackground === 'rgb(255, 255, 255)' ? 'New chat still uses the old white block' : null,
    !desktop.logoSource.includes('mere-x-emblem-transparent') ? 'Transparent emblem is not used by the UI' : null,
    desktop.logoCornerAlpha !== 0 || mobile.logoCornerAlpha !== 0 ? 'Logo corner is not transparent' : null,
    desktop.horizontalOverflow || mobile.horizontalOverflow ? 'Sidebar layout causes horizontal overflow' : null,
    runtimeErrors.length ? `Runtime errors: ${runtimeErrors.join(' | ')}` : null,
  ].filter(Boolean)

  console.log(JSON.stringify({ ok: failures.length === 0, failures, desktop, mobile, runtimeErrors }, null, 2))
  if (failures.length) process.exitCode = 1
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error.message, runtimeErrors }, null, 2))
  process.exitCode = 1
} finally {
  await command('Target.closeTarget', { targetId: target.id }).catch(() => {})
  socket.close()
}
