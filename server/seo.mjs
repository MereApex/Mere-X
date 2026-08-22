// Mere X is a single-page app, so the browser sets its own title and social
// tags as you navigate. Crawlers are a different audience: Google renders
// JavaScript eventually, but the crawlers behind link previews — Slack,
// WhatsApp, iMessage, X, LinkedIn, Facebook — read the first HTML response and
// never run a line of script. So the server stamps the right tags into the
// document before it is sent, and the client keeps them in step afterwards.

export const SITE_NAME = 'Mere X'
export const SOCIAL_IMAGE = '/mere-x-social.png'
export const DEFAULT_ORIGIN = 'https://merex.ai'

/** @typedef {{ title: string, description: string, index?: boolean }} PageSeo */

// Titles stay under about sixty characters and descriptions under about a
// hundred and sixty, so a search result shows them whole.
/** @type {Record<string, PageSeo>} */
export const pageSeo = {
  '/': {
    title: 'Mere X — One intelligence for serious work',
    description: 'Mere X turns an ambitious idea into finished work: research with real sources, documents, images and autonomous workflows in one private workspace.',
  },
  '/apex': {
    title: 'Mere Apex 4.0 — The model behind Mere X',
    description: 'How Mere Apex 4.0 reasons, researches, writes, codes and creates: one model across every kind of work, with the context and controls it needs.',
  },
  '/pricing': {
    title: 'Mere X pricing — Free, Plus, Pro and Team',
    description: 'Simple plans for Mere X with one powerful model and no surprise usage charges. Start free, upgrade for agents and computer workflows.',
  },
  '/security': {
    title: 'Security at Mere X',
    description: 'How Mere X protects your account, your work and your payments: verified sign-in, isolated workspaces, encrypted payment fields and signed billing events.',
  },
  '/help': {
    title: 'Mere X help centre',
    description: 'Answers on setting up Mere X, billing, privacy, Projects, Agents and account security, with direct routes to support.',
  },
  '/status': {
    title: 'Mere X service status',
    description: 'A live check of the services behind Mere X, including conversations, research, media generation and account storage.',
  },
  '/release-notes': {
    title: 'What is new in Mere X',
    description: 'Recent additions to Mere X: workflows, media creation, account sync, security and the interface itself.',
  },
  '/download': {
    title: 'Get Mere X on every device',
    description: 'Use Mere X in the browser today, with your workspace synchronised across every signed-in device.',
  },
  '/privacy': { title: 'Privacy Policy — Mere X', description: 'What Mere X collects, why it is collected, how long it is kept and the control you have over it.' },
  '/terms': { title: 'Terms of Service — Mere X', description: 'The terms that apply when you use Mere X, including accounts, payment, acceptable use and liability.' },
  '/acceptable-use': { title: 'Acceptable Use Policy — Mere X', description: 'What Mere X may and may not be used for, and the limits that protect people, systems and trust.' },
  '/cookies': { title: 'Cookie Policy — Mere X', description: 'The cookies Mere X sets, what each one is for, how long it lasts, and how to change or clear them from your browser at any time.' },
  '/signin': { title: 'Sign in to Mere X', description: 'Continue to your Mere X conversations, projects and library.', index: false },
  '/signup': { title: 'Create your Mere X account', description: 'Start with Mere X: research, documents, images and agents in one private workspace.' },
  '/reset-password': { title: 'Reset your Mere X password', description: 'Choose a new password for your Mere X account.', index: false },
  '/app': { title: 'Your Mere X workspace', description: 'Your private Mere X workspace.', index: false },
  '/shared': { title: 'Shared conversation — Mere X', description: 'A conversation shared from Mere X, in view-only form.', index: false },
}

// What belongs in the sitemap, and how often it is worth coming back for.
export const indexablePaths = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/apex', priority: '0.9', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
  { path: '/security', priority: '0.7', changefreq: 'monthly' },
  { path: '/help', priority: '0.7', changefreq: 'monthly' },
  { path: '/download', priority: '0.6', changefreq: 'monthly' },
  { path: '/release-notes', priority: '0.6', changefreq: 'weekly' },
  { path: '/status', priority: '0.5', changefreq: 'daily' },
  { path: '/signup', priority: '0.5', changefreq: 'monthly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/acceptable-use', priority: '0.3', changefreq: 'yearly' },
  { path: '/cookies', priority: '0.3', changefreq: 'yearly' },
]

// Addresses inside the signed-in workspace. They are real pages, but private
// ones, so they carry the workspace description and stay out of the index.
export const workspacePaths = ['/projects', '/library', '/agents', '/workflows', '/settings']

export function seoKeyForPath(pathname = '/') {
  const path = String(pathname).split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  if (path.startsWith('/shared')) return '/shared'
  if (path.startsWith('/reset-password')) return '/reset-password'
  return pageSeo[path] ? path : '/app'
}

// A page that does not exist should say so. Answering every unknown address
// with a normal 200 is a soft 404, and search engines treat a site full of them
// as one that cannot be trusted about what it has.
export function isKnownPath(pathname = '/') {
  const path = String(pathname).split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  if (pageSeo[path]) return true
  if (workspacePaths.includes(path)) return true
  return /^\/(shared|reset-password)(\/|$)/.test(path)
}

export function seoForPath(pathname = '/') {
  return pageSeo[seoKeyForPath(pathname)]
}

function escapeAttribute(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// Replaces whatever the built index.html carries with the tags for this exact
// address. Rewriting is safer than appending: a duplicate og:title is resolved
// differently by every crawler that reads it.
export function renderIndexHtml(html, pathname, origin = DEFAULT_ORIGIN) {
  const key = seoKeyForPath(pathname)
  const seo = pageSeo[key]
  const base = String(origin).replace(/\/+$/, '')
  const path = String(pathname).split('?')[0].split('#')[0].replace(/\/+$/, '') || '/'
  // A shared conversation has an address of its own; the rest canonicalise to
  // the page they are.
  const canonical = `${base}${key === '/shared' ? path : key === '/' ? '/' : key}`
  const image = `${base}${SOCIAL_IMAGE}`
  const robots = seo.index === false ? 'noindex, follow' : 'index, follow, max-image-preview:large'

  const title = escapeAttribute(seo.title)
  const description = escapeAttribute(seo.description)

  let out = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)

  // Search Console and Bing Webmaster Tools both verify ownership by looking for
  // a token in the head of the home page. The token is deployment configuration,
  // not source, so it arrives through the environment.
  const verifications = [
    ['google-site-verification', process.env.GOOGLE_SITE_VERIFICATION],
    ['msvalidate.01', process.env.BING_SITE_VERIFICATION],
  ].filter(([, token]) => token)
  if (verifications.length) {
    const tags = verifications
      .map(([name, token]) => `<meta name="${name}" content="${escapeAttribute(token)}" />`)
      .join('\n    ')
    out = out.replace('</head>', `  ${tags}\n  </head>`)
  }

  const replacements = [
    [/<meta\s+name="description"[^>]*>/i, `<meta name="description" content="${description}" />`],
    [/<meta\s+name="robots"[^>]*>/i, `<meta name="robots" content="${robots}" />`],
    [/<link\s+rel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`],
    [/<meta\s+property="og:title"[^>]*>/i, `<meta property="og:title" content="${title}" />`],
    [/<meta\s+property="og:description"[^>]*>/i, `<meta property="og:description" content="${description}" />`],
    [/<meta\s+property="og:url"[^>]*>/i, `<meta property="og:url" content="${canonical}" />`],
    [/<meta\s+property="og:image"[^>]*>/i, `<meta property="og:image" content="${image}" />`],
    [/<meta\s+name="twitter:title"[^>]*>/i, `<meta name="twitter:title" content="${title}" />`],
    [/<meta\s+name="twitter:description"[^>]*>/i, `<meta name="twitter:description" content="${description}" />`],
    [/<meta\s+name="twitter:image"[^>]*>/i, `<meta name="twitter:image" content="${image}" />`],
  ]
  for (const [pattern, tag] of replacements) {
    if (pattern.test(out)) out = out.replace(pattern, tag)
  }

  // The structured data in the shipped document names the production domain.
  // On any other origin — a preview deploy, a staging host — it would point
  // visitors somewhere they did not come from, so it is retargeted too.
  if (base !== DEFAULT_ORIGIN) out = out.split(DEFAULT_ORIGIN).join(base)

  return out
}

export function renderRobotsTxt(origin = DEFAULT_ORIGIN) {
  const base = String(origin).replace(/\/+$/, '')
  return [
    'User-agent: *',
    'Allow: /',
    // Private surfaces: nothing a search result should ever land on.
    'Disallow: /api/',
    'Disallow: /app',
    'Disallow: /shared/',
    'Disallow: /reset-password',
    'Disallow: /signin',
    '',
    `Sitemap: ${base}/sitemap.xml`,
    '',
  ].join('\n')
}

export function renderSitemapXml(origin = DEFAULT_ORIGIN, lastmod = new Date().toISOString().slice(0, 10)) {
  const base = String(origin).replace(/\/+$/, '')
  const urls = indexablePaths.map(entry => [
    '  <url>',
    `    <loc>${base}${entry.path}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    `    <changefreq>${entry.changefreq}</changefreq>`,
    `    <priority>${entry.priority}</priority>`,
    '  </url>',
  ].join('\n')).join('\n')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
}
