// Checks the two halves of Mere X's discoverability against a running server:
// what a crawler is handed in the first HTML response, and what the app puts in
// the head once it is running. Both have to say the same thing.
//
//   NODE_ENV=production PORT=8799 node server/index.mjs
//   MERE_SEO_URL=http://127.0.0.1:8799 node scripts/seo-smoke.mjs
//
// The browser half is skipped unless a Chrome DevTools endpoint is reachable.

import { indexablePaths, pageSeo, seoKeyForPath } from '../server/seo.mjs'

const baseUrl = (process.env.MERE_SEO_URL || 'http://127.0.0.1:8799').replace(/\/+$/, '')
const debugPort = process.env.MERE_CDP_PORT || '9333'
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

const results = []
const pass = name => results.push({ name, ok: true })
const fail = (name, detail) => results.push({ name, ok: false, detail })
function check(name, condition, detail) {
  if (condition) pass(name)
  else fail(name, detail)
}

function tagContent(html, pattern) {
  const match = html.match(pattern)
  return match ? match[1] : null
}

const titleOf = html => tagContent(html, /<title>([\s\S]*?)<\/title>/i)
const metaOf = (html, key) => tagContent(html, new RegExp(`<meta\\s+(?:name|property)="${key}"[^>]*content="([^"]*)"`, 'i'))
const canonicalOf = html => tagContent(html, /<link\s+rel="canonical"[^>]*href="([^"]*)"/i)

// ---------------------------------------------------------------- server ----
async function checkDocuments() {
  const routes = [
    { path: '/', indexable: true },
    { path: '/apex', indexable: true },
    { path: '/pricing', indexable: true },
    { path: '/security', indexable: true },
    { path: '/help', indexable: true },
    { path: '/status', indexable: true },
    { path: '/release-notes', indexable: true },
    { path: '/download', indexable: true },
    { path: '/privacy', indexable: true },
    { path: '/terms', indexable: true },
    { path: '/acceptable-use', indexable: true },
    { path: '/cookies', indexable: true },
    { path: '/signup', indexable: true },
    { path: '/signin', indexable: false },
    { path: '/app', indexable: false },
    { path: '/settings', indexable: false },
    { path: '/shared/example-id', indexable: false },
  ]

  const seenTitles = new Map()
  for (const route of routes) {
    const response = await fetch(`${baseUrl}${route.path}`)
    const html = await response.text()
    const expected = pageSeo[seoKeyForPath(route.path)]
    const label = `document ${route.path}`

    check(`${label} responds 200`, response.status === 200, `status ${response.status}`)
    check(`${label} title`, titleOf(html) === expected.title, `got ${titleOf(html)}`)
    check(`${label} description`, metaOf(html, 'description') === expected.description, `got ${metaOf(html, 'description')}`)

    const robots = metaOf(html, 'robots') || ''
    check(`${label} robots directive`, route.indexable ? robots.startsWith('index') : robots.startsWith('noindex'), `got ${robots}`)

    const canonical = canonicalOf(html) || ''
    check(`${label} canonical is absolute`, /^https?:\/\/[^/]+\//.test(canonical), `got ${canonical}`)

    check(`${label} og:title matches title`, metaOf(html, 'og:title') === expected.title, `got ${metaOf(html, 'og:title')}`)
    check(`${label} og:url matches canonical`, metaOf(html, 'og:url') === canonical, `got ${metaOf(html, 'og:url')}`)
    check(`${label} og:image is absolute`, /^https?:\/\/.+\.png$/.test(metaOf(html, 'og:image') || ''), `got ${metaOf(html, 'og:image')}`)
    check(`${label} twitter card`, metaOf(html, 'twitter:card') === 'summary_large_image', `got ${metaOf(html, 'twitter:card')}`)

    // Two pages sharing a title compete with each other in a result page.
    if (route.indexable) {
      const clash = seenTitles.get(expected.title)
      check(`${label} title is unique`, !clash, `also used by ${clash}`)
      seenTitles.set(expected.title, route.path)
    }

    if (route.path === '/') {
      check('home carries structured data', html.includes('application/ld+json'), 'no JSON-LD block')
      const ldMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
      let parsed = null
      try { parsed = JSON.parse(ldMatch ? ldMatch[1] : 'null') } catch (error) { parsed = null }
      check('structured data parses', Boolean(parsed && parsed['@graph']), 'JSON-LD did not parse')
      const types = parsed?.['@graph']?.map(node => node['@type']) || []
      check('structured data names the organisation', types.includes('Organization'), `types: ${types.join(', ')}`)
      check('structured data names the product', types.includes('SoftwareApplication'), `types: ${types.join(', ')}`)
    }
  }

  // Lengths: what a search result can actually show. Pages that are kept out of
  // the index are never a result, so they only need to read well when shared.
  for (const [path, seo] of Object.entries(pageSeo)) {
    check(`title length ${path}`, seo.title.length <= 62, `${seo.title.length} characters`)
    const floor = seo.index === false ? 25 : 70
    check(`description length ${path}`, seo.description.length >= floor && seo.description.length <= 175, `${seo.description.length} characters`)
  }
}

async function checkNotFound() {
  const response = await fetch(`${baseUrl}/no-such-page-here`)
  check('unknown address answers 404', response.status === 404, `status ${response.status}`)
}

async function checkRobots() {
  const response = await fetch(`${baseUrl}/robots.txt`)
  const body = await response.text()
  check('robots.txt responds 200', response.status === 200, `status ${response.status}`)
  check('robots.txt is plain text', (response.headers.get('content-type') || '').includes('text/plain'), response.headers.get('content-type'))
  check('robots.txt allows crawling', /^Allow: \/$/m.test(body), body.slice(0, 120))
  check('robots.txt hides the workspace', /^Disallow: \/app$/m.test(body), body.slice(0, 200))
  check('robots.txt hides the API', /^Disallow: \/api\/$/m.test(body), body.slice(0, 200))
  check('robots.txt points at the sitemap', /^Sitemap: https?:\/\/\S+\/sitemap\.xml$/m.test(body), body.slice(0, 200))
}

async function checkSitemap() {
  const response = await fetch(`${baseUrl}/sitemap.xml`)
  const body = await response.text()
  check('sitemap responds 200', response.status === 200, `status ${response.status}`)
  check('sitemap is xml', (response.headers.get('content-type') || '').includes('xml'), response.headers.get('content-type'))
  check('sitemap declares the namespace', body.includes('http://www.sitemaps.org/schemas/sitemap/0.9'), 'namespace missing')

  const locations = [...body.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1])
  check('sitemap lists every public page', locations.length === indexablePaths.length, `${locations.length} of ${indexablePaths.length}`)
  check('sitemap uses absolute addresses', locations.every(location => /^https?:\/\//.test(location)), locations[0])

  const noindex = ['/app', '/signin', '/reset-password', '/shared']
  const leaked = locations.filter(location => noindex.some(path => new URL(location).pathname.startsWith(path)))
  check('sitemap omits private pages', leaked.length === 0, leaked.join(', '))

  // Every listed address must actually be reachable and indexable.
  for (const entry of indexablePaths) {
    const page = await fetch(`${baseUrl}${entry.path}`)
    const html = await page.text()
    check(`sitemap entry ${entry.path} is live`, page.status === 200, `status ${page.status}`)
    check(`sitemap entry ${entry.path} is indexable`, (metaOf(html, 'robots') || '').startsWith('index'), metaOf(html, 'robots'))
  }
}

async function checkAssets() {
  for (const asset of ['/mere-x-social.png', '/site.webmanifest', '/mere-x-favicon.png']) {
    const response = await fetch(`${baseUrl}${asset}`)
    check(`asset ${asset}`, response.status === 200, `status ${response.status}`)
  }
  const manifest = await fetch(`${baseUrl}/site.webmanifest`).then(response => response.json()).catch(() => null)
  check('manifest names the app', manifest?.name === 'Mere X', JSON.stringify(manifest))
}

// --------------------------------------------------------------- browser ----
async function checkClientNavigation() {
  let target
  try {
    target = await fetch(`http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(`${baseUrl}/`)}`, { method: 'PUT' }).then(response => response.json())
  } catch (error) {
    console.log('\nBrowser checks skipped: no DevTools endpoint on port ' + debugPort)
    return
  }

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
  const command = (method, params = {}) => {
    const id = ++commandId
    socket.send(JSON.stringify({ id, method, params }))
    return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
  }
  const evaluate = async expression => {
    const result = await command('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text)
    return result.result.value
  }
  const head = () => evaluate(`({
    path: location.pathname,
    title: document.title,
    description: (document.querySelector('meta[name="description"]') || {}).content || null,
    canonical: (document.querySelector('link[rel="canonical"]') || {}).href || null,
    robots: (document.querySelector('meta[name="robots"]') || {}).content || null,
    ogTitle: (document.querySelector('meta[property="og:title"]') || {}).content || null,
  })`)

  try {
    await sleep(2500)

    // Real addresses, typed straight in.
    for (const path of ['/pricing', '/apex', '/security', '/help']) {
      await command('Page.navigate', { url: `${baseUrl}${path}` })
      await sleep(2200)
      const state = await head()
      const expected = pageSeo[path]
      check(`browser ${path} title`, state.title === expected.title, `got ${state.title}`)
      check(`browser ${path} canonical`, (state.canonical || '').endsWith(path), `got ${state.canonical}`)
    }

    // Navigating inside the app must update the head, not just the view.
    await command('Page.navigate', { url: `${baseUrl}/` })
    await sleep(2200)
    const home = await head()
    check('browser home title', home.title === pageSeo['/'].title, `got ${home.title}`)

    await evaluate(`(() => {
      const link = [...document.querySelectorAll('a, button')].find(node => /^pricing$/i.test(node.textContent.trim()))
      if (link) link.click()
      return Boolean(link)
    })()`)
    await sleep(1200)
    const afterClick = await head()
    check('in-app navigation reaches /pricing', afterClick.path === '/pricing', `path ${afterClick.path}`)
    check('in-app navigation retitles the page', afterClick.title === pageSeo['/pricing'].title, `got ${afterClick.title}`)
    check('in-app navigation recanonicalises', (afterClick.canonical || '').endsWith('/pricing'), `got ${afterClick.canonical}`)

    // Back must restore both the view and the head.
    await evaluate('(history.back(), true)')
    await sleep(1200)
    const afterBack = await head()
    check('back returns home', afterBack.path === '/', `path ${afterBack.path}`)
    check('back restores the title', afterBack.title === pageSeo['/'].title, `got ${afterBack.title}`)

    // Links shared before real addresses existed still carry a fragment.
    await command('Page.navigate', { url: `${baseUrl}/#/pricing` })
    await sleep(2500)
    const legacy = await head()
    check('legacy #/pricing lands on /pricing', legacy.path === '/pricing', `path ${legacy.path}`)
    check('legacy link drops the fragment', !(await evaluate('location.hash')), `hash ${await evaluate('location.hash')}`)

    // The workspace must never invite indexing.
    await command('Page.navigate', { url: `${baseUrl}/app` })
    await sleep(2200)
    const app = await head()
    check('workspace stays out of the index', (app.robots || '').startsWith('noindex'), `got ${app.robots}`)
  } finally {
    socket.close()
    await fetch(`http://127.0.0.1:${debugPort}/json/close/${target.id}`).catch(() => {})
  }
}

// ------------------------------------------------------------------ run ----
try {
  await fetch(`${baseUrl}/robots.txt`)
} catch (error) {
  console.error(`No server answering on ${baseUrl}. Start it with:\n  NODE_ENV=production PORT=8799 node server/index.mjs`)
  process.exit(1)
}

const sections = [
  ['documents', checkDocuments],
  ['not found', checkNotFound],
  ['robots.txt', checkRobots],
  ['sitemap.xml', checkSitemap],
  ['assets', checkAssets],
  ['browser', checkClientNavigation],
]
for (const [name, run] of sections) {
  const before = results.length
  await run()
  const added = results.slice(before)
  const failed = added.filter(result => !result.ok).length
  console.log(`${name.padEnd(12)} ${added.length - failed}/${added.length}`)
}

const failures = results.filter(result => !result.ok)
for (const failure of failures) console.log(`FAIL  ${failure.name}${failure.detail ? ` — ${failure.detail}` : ''}`)
console.log(`\n${results.length - failures.length}/${results.length} SEO checks passed`)
process.exit(failures.length ? 1 : 0)
