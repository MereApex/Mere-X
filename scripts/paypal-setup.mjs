import dotenv from 'dotenv'
import { closeDatabase, initializeDatabase } from '../server/database.mjs'
import { createPayPalWebhook, ensurePayPalCatalog, paypalConfigured, paypalEnvironment } from '../server/paypal.mjs'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })

function publicUrl() {
  return String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '')
}

try {
  if (!paypalConfigured()) throw new Error('PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET are required.')
  await initializeDatabase()
  const plans = await ensurePayPalCatalog()
  let webhook = process.env.PAYPAL_WEBHOOK_ID ? { id: process.env.PAYPAL_WEBHOOK_ID, existing: true } : null
  if (!webhook && publicUrl()) webhook = await createPayPalWebhook(`${publicUrl()}/api/billing/webhook`)
  console.log(JSON.stringify({
    ok: true,
    environment: paypalEnvironment(),
    catalog: { plans: plans.length },
    webhook: webhook ? { configured: true, id: webhook.id, existing: Boolean(webhook.existing) } : { configured: false, reason: 'Set PUBLIC_APP_URL after deployment, then run this command again.' },
  }))
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Payment setup failed.', supportId: error?.debugId || error?.headers?.['paypal-debug-id'] }))
  process.exitCode = 1
} finally {
  await closeDatabase().catch(() => undefined)
}
