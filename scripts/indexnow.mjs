// Tells Bing, Yandex, Seznam and Naver that Mere X's pages changed, instead of
// waiting for them to come back on their own. Google does not take part; for
// Google the sitemap in Search Console is the equivalent lever.
//
//   INDEXNOW_KEY=<32-or-more hex characters> node scripts/indexnow.mjs
//
// The same key must be reachable at https://merex.ai/<key>.txt, which the server
// serves from the same environment variable. That file is how the search engine
// proves the submission came from someone who controls the site.

import { indexablePaths, DEFAULT_ORIGIN } from '../server/seo.mjs'

const key = process.env.INDEXNOW_KEY
const origin = (process.env.PUBLIC_APP_URL || DEFAULT_ORIGIN).replace(/\/+$/, '')
const host = new URL(origin).host

if (!key) {
  console.error('INDEXNOW_KEY is not set. Generate one with:\n  node -e "console.log(require(\'crypto\').randomBytes(16).toString(\'hex\'))"')
  process.exit(1)
}
if (!/^[a-zA-Z0-9-]{8,128}$/.test(key)) {
  console.error('INDEXNOW_KEY must be 8 to 128 letters, digits or hyphens.')
  process.exit(1)
}

// The engine fetches this before accepting anything, so a submission with an
// unreachable key file is silently discarded. Better to find out here.
const keyUrl = `${origin}/${key}.txt`
const keyResponse = await fetch(keyUrl).catch(() => null)
const keyBody = keyResponse && keyResponse.ok ? (await keyResponse.text()).trim() : null
if (keyBody !== key) {
  console.error(`${keyUrl} does not return the key.`)
  console.error(keyResponse ? `  got status ${keyResponse.status}, body ${JSON.stringify((keyBody || '').slice(0, 40))}` : '  the request failed')
  console.error('Set INDEXNOW_KEY in the deployment environment and redeploy first.')
  process.exit(1)
}

const urlList = indexablePaths.map(entry => `${origin}${entry.path}`)
const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host, key, keyLocation: keyUrl, urlList }),
})

const body = await response.text()
if (response.ok || response.status === 202) {
  console.log(`Submitted ${urlList.length} addresses for ${host} (status ${response.status}).`)
} else {
  console.error(`IndexNow refused the submission: ${response.status} ${body.slice(0, 300)}`)
  process.exit(1)
}
