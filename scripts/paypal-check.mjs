import dotenv from 'dotenv'
import { billingMode, paypalDiagnostics } from '../server/paypal.mjs'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })

// Read-only preflight: answers "can this deployment take a payment right now?"
// without creating products, plans, webhooks or touching the database.
const diagnostics = await paypalDiagnostics()
const mode = await billingMode()
// Checkout works in either style. Recurring billing is the better one, but a
// paid term is a working checkout, not a failure.
const ready = mode !== 'unavailable'

console.log(JSON.stringify({
  ok: ready,
  checkout: mode === 'subscription' ? 'recurring memberships' : mode === 'one-time' ? 'paid terms (no automatic renewal)' : 'unavailable',
  environment: diagnostics.environment,
  currency: diagnostics.currency,
  credentialsAccepted: diagnostics.reachable,
  notes: diagnostics.problems,
  // Point at the one thing that is actually blocking checkout.
  nextStep: mode === 'subscription'
    ? 'Run "npm run paypal:setup" to publish the product, plans and webhook.'
    : mode === 'one-time'
      ? 'Checkout works now. To sell automatic renewals instead of paid terms, enable Subscriptions on this PayPal app, then run this check again.'
      : 'Open the PayPal Developer dashboard, open the app for this environment, and copy the complete Client ID and Secret into .env.local. PAYPAL_ENV must match the app (sandbox or live).',
}, null, 2))

if (!ready) process.exitCode = 1
