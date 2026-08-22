import dotenv from 'dotenv'
import { paypalDiagnostics } from '../server/paypal.mjs'

dotenv.config({ path: '.env.local', quiet: true })
dotenv.config({ quiet: true })

// Read-only preflight: answers "can this deployment take a payment right now?"
// without creating products, plans, webhooks or touching the database.
const diagnostics = await paypalDiagnostics()
const ready = diagnostics.configured && diagnostics.reachable && diagnostics.problems.length === 0

console.log(JSON.stringify({
  ok: ready,
  environment: diagnostics.environment,
  currency: diagnostics.currency,
  credentialsAccepted: diagnostics.reachable,
  problems: diagnostics.problems,
  reason: diagnostics.reason,
  // Point at the one thing that is actually blocking checkout.
  nextStep: ready
    ? 'Run "npm run paypal:setup" to publish the product, plans and webhook.'
    : diagnostics.reachable
      ? 'Enable the missing feature on this PayPal app, then run "npm run paypal:check" again followed by "npm run paypal:setup".'
      : 'Open the PayPal Developer dashboard, open the app for this environment, and copy the complete Client ID and Secret into .env.local. PAYPAL_ENV must match the app (sandbox or live).',
}, null, 2))

if (!ready) process.exitCode = 1
