import { Client, Environment, SubscriptionsController } from '@paypal/paypal-server-sdk'
import { randomUUID } from 'node:crypto'
import {
  createBillingSubscription,
  getBillingPlan,
  getBillingPlanByProviderId,
  getBillingProduct,
  getBillingSubscriptionByProviderId,
  recordBillingEvent,
  recordBillingTransaction,
  syncBillingSubscription,
  upsertBillingPlan,
  upsertBillingProduct,
} from './store.mjs'

const ENVIRONMENTS = new Set(['sandbox', 'live'])
const ACTIVE_STATUSES = new Set(['ACTIVE'])
const TERMINAL_STATUSES = new Set(['CANCELLED', 'EXPIRED', 'SUSPENDED'])

export const paymentCatalog = Object.freeze({
  plus: Object.freeze({
    label: 'Mere Plus',
    monthly: Object.freeze({ amount: '18.00', intervalUnit: 'MONTH', description: 'Mere Plus monthly membership' }),
    annual: Object.freeze({ amount: '180.00', intervalUnit: 'YEAR', description: 'Mere Plus annual membership' }),
  }),
  pro: Object.freeze({
    label: 'Mere Pro',
    monthly: Object.freeze({ amount: '44.00', intervalUnit: 'MONTH', description: 'Mere Pro monthly membership' }),
    annual: Object.freeze({ amount: '456.00', intervalUnit: 'YEAR', description: 'Mere Pro annual membership' }),
  }),
  team: Object.freeze({
    label: 'Mere Team',
    monthly: Object.freeze({ amount: '23.00', intervalUnit: 'MONTH', description: 'Mere Team monthly membership per seat' }),
    annual: Object.freeze({ amount: '216.00', intervalUnit: 'YEAR', description: 'Mere Team annual membership per seat' }),
  }),
})

let clientState = null
let accessTokenState = null
let catalogPromise = null

export function paypalEnvironment() {
  const value = String(process.env.PAYPAL_ENV || 'sandbox').toLowerCase()
  return ENVIRONMENTS.has(value) ? value : 'sandbox'
}

export function paypalCurrency() {
  const value = String(process.env.PAYPAL_CURRENCY || 'USD').toUpperCase()
  return /^[A-Z]{3}$/.test(value) ? value : 'USD'
}

export function paypalConfigured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET)
}

function assertTransactionReady() {
  if (!paypalConfigured()) throw Object.assign(new Error('Payments are not configured.'), { statusCode: 503 })
  if (paypalEnvironment() === 'live' && !process.env.PAYPAL_WEBHOOK_ID) {
    throw Object.assign(new Error('Live payment notifications are not configured.'), { statusCode: 503 })
  }
}

export function publicPayPalConfig() {
  return {
    enabled: paypalConfigured(),
    clientId: paypalConfigured() ? process.env.PAYPAL_CLIENT_ID : undefined,
    environment: paypalEnvironment() === 'live' ? 'production' : 'sandbox',
    currency: paypalCurrency(),
    methods: ['paypal', 'debit-card', 'credit-card'],
  }
}

function apiBaseUrl() {
  return paypalEnvironment() === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com'
}

function getClient() {
  if (!paypalConfigured()) throw new Error('Payments are not configured.')
  const signature = `${paypalEnvironment()}:${process.env.PAYPAL_CLIENT_ID}`
  if (!clientState || clientState.signature !== signature) {
    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET,
      },
      environment: paypalEnvironment() === 'live' ? Environment.Production : Environment.Sandbox,
      timeout: 20_000,
    })
    clientState = { signature, client, subscriptions: new SubscriptionsController(client) }
    accessTokenState = null
  }
  return clientState
}

async function accessToken() {
  const state = getClient()
  accessTokenState = accessTokenState
    ? await state.client.clientCredentialsAuthManager.updateToken(accessTokenState)
    : await state.client.clientCredentialsAuthManager.fetchToken()
  return accessTokenState.accessToken
}

async function paypalRest(pathname, { method = 'GET', body, headers = {} } = {}) {
  const response = await fetch(`${apiBaseUrl()}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  })
  const text = await response.text()
  let payload = null
  try { payload = text ? JSON.parse(text) : null } catch { payload = null }
  if (!response.ok) {
    const error = new Error(payload?.message || `Payment service returned ${response.status}.`)
    error.statusCode = response.status
    error.debugId = payload?.debug_id || response.headers.get('paypal-debug-id') || undefined
    error.details = payload?.details
    throw error
  }
  return payload
}

function responsePayload(response) {
  if (response?.body && typeof response.body === 'string') {
    try { return { ...response.result, ...JSON.parse(response.body) } } catch { /* Use the typed result. */ }
  }
  return response?.result || null
}

function safeSubscriptionPayload(subscription) {
  if (!subscription) return null
  const billing = subscription.billing_info || subscription.billingInfo || {}
  const subscriber = subscription.subscriber || {}
  return {
    id: subscription.id,
    plan_id: subscription.plan_id || subscription.planId,
    status: subscription.status,
    quantity: subscription.quantity,
    custom_id: subscription.custom_id || subscription.customId,
    start_time: subscription.start_time || subscription.startTime,
    create_time: subscription.create_time || subscription.createTime,
    update_time: subscription.update_time || subscription.updateTime,
    subscriber: { payer_id: subscriber.payer_id || subscriber.payerId },
    billing_info: {
      next_billing_time: billing.next_billing_time || billing.nextBillingTime,
      failed_payments_count: billing.failed_payments_count ?? billing.failedPaymentsCount,
      last_payment: billing.last_payment || billing.lastPayment,
    },
  }
}

function safeEventPayload(event) {
  const resource = event?.resource || {}
  return {
    id: event?.id,
    event_type: event?.event_type,
    resource_type: event?.resource_type,
    create_time: event?.create_time,
    resource: {
      id: resource.id,
      status: resource.status || resource.state,
      billing_agreement_id: resource.billing_agreement_id,
      amount: resource.amount,
      create_time: resource.create_time,
      update_time: resource.update_time,
    },
  }
}

export function paymentError(error) {
  const issue = error?.details?.[0]?.issue || error?.result?.details?.[0]?.issue
  const debugId = error?.debugId || error?.result?.debugId || error?.headers?.['paypal-debug-id']
  if (issue === 'INSTRUMENT_DECLINED') return { status: 422, message: 'This payment method was declined. Choose another card or payment method.', debugId }
  if (issue === 'PAYMENT_DENIED') return { status: 422, message: 'The payment could not be approved. Choose another payment method.', debugId }
  if (Number(error?.statusCode) === 401) return { status: 503, message: 'Payment credentials could not be verified.', debugId }
  if (Number(error?.statusCode) === 503) return { status: 503, message: 'Payments are temporarily unavailable while secure checkout is being configured.', debugId }
  return { status: Number(error?.statusCode) >= 400 && Number(error?.statusCode) < 500 ? Number(error.statusCode) : 502, message: 'Secure checkout could not complete this request.', debugId }
}

function planEnvironmentKey(planKey, billingCycle) {
  return `PAYPAL_${planKey.toUpperCase()}_${billingCycle.toUpperCase()}_PLAN_ID`
}

async function ensureProduct() {
  const environment = paypalEnvironment()
  const stored = await getBillingProduct(environment)
  if (stored?.provider_product_id) return stored.provider_product_id
  if (process.env.PAYPAL_PRODUCT_ID) {
    await upsertBillingProduct({ environment, providerProductId: process.env.PAYPAL_PRODUCT_ID, payload: { source: 'environment' } })
    return process.env.PAYPAL_PRODUCT_ID
  }
  const product = await paypalRest('/v1/catalogs/products', {
    method: 'POST',
    headers: { 'PayPal-Request-Id': `mere-x-${environment}-membership-v1` },
    body: {
      name: 'Mere X Membership',
      description: 'Membership access to Mere Apex 4.0 and the Mere X workspace.',
      type: 'SERVICE',
      category: 'SOFTWARE',
    },
  })
  if (!product?.id) throw new Error('The payment product could not be created.')
  await upsertBillingProduct({ environment, providerProductId: product.id, status: 'ACTIVE', payload: product })
  return product.id
}

async function ensurePlan(productId, planKey, billingCycle) {
  const environment = paypalEnvironment()
  const definition = paymentCatalog[planKey]?.[billingCycle]
  if (!definition) throw new Error('Unknown billing plan.')
  const stored = await getBillingPlan(environment, planKey, billingCycle)
  if (stored?.provider_plan_id && stored.status === 'ACTIVE') return stored
  const configuredId = process.env[planEnvironmentKey(planKey, billingCycle)]
  if (configuredId) return upsertBillingPlan({ environment, planKey, billingCycle, currency: paypalCurrency(), unitAmount: definition.amount, providerPlanId: configuredId, status: 'ACTIVE', payload: { source: 'environment' } })
  const response = await getClient().subscriptions.createBillingPlan({
    prefer: 'return=representation',
    paypalRequestId: `mere-x-${environment}-${planKey}-${billingCycle}-v1`,
    body: {
      productId,
      name: `${paymentCatalog[planKey].label} — ${billingCycle === 'annual' ? 'Annual' : 'Monthly'}`,
      description: definition.description,
      status: 'ACTIVE',
      billingCycles: [{
        frequency: { intervalUnit: definition.intervalUnit, intervalCount: 1 },
        tenureType: 'REGULAR',
        sequence: 1,
        totalCycles: 0,
        pricingScheme: { fixedPrice: { currencyCode: paypalCurrency(), value: definition.amount } },
      }],
      paymentPreferences: { autoBillOutstanding: true, paymentFailureThreshold: 2 },
      quantitySupported: planKey === 'team',
    },
  })
  const plan = responsePayload(response)
  if (!plan?.id) throw new Error('The billing plan could not be created.')
  if (plan.status !== 'ACTIVE') await getClient().subscriptions.activateBillingPlan(plan.id)
  return upsertBillingPlan({ environment, planKey, billingCycle, currency: paypalCurrency(), unitAmount: definition.amount, providerPlanId: plan.id, status: 'ACTIVE', payload: plan })
}

export async function ensurePayPalCatalog() {
  if (!catalogPromise) {
    catalogPromise = (async () => {
      const productId = await ensureProduct()
      const entries = []
      for (const planKey of Object.keys(paymentCatalog)) {
        for (const billingCycle of ['monthly', 'annual']) entries.push(await ensurePlan(productId, planKey, billingCycle))
      }
      return entries
    })().catch(error => { catalogPromise = null; throw error })
  }
  return catalogPromise
}

function safeBaseUrl(req) {
  const configured = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/$/, '')
  if (configured && /^https:\/\//i.test(configured)) return configured
  const host = String(req.get('host') || '').replace(/[^a-zA-Z0-9.:[\]-]/g, '')
  return `${req.protocol}://${host}`
}

function timestamp(value) {
  const parsed = Date.parse(String(value || ''))
  return Number.isFinite(parsed) ? parsed : null
}

export async function createPayPalSubscription({ req, user, planKey, billingCycle, quantity = 1, requestId = randomUUID() }) {
  assertTransactionReady()
  const definition = paymentCatalog[planKey]?.[billingCycle]
  if (!definition) throw Object.assign(new Error('Choose an available billing plan.'), { statusCode: 400 })
  const safeQuantity = planKey === 'team' ? Math.max(2, Math.min(250, Number(quantity) || 2)) : 1
  await ensurePayPalCatalog()
  const billingPlan = await getBillingPlan(paypalEnvironment(), planKey, billingCycle)
  if (!billingPlan?.provider_plan_id) throw new Error('The selected billing plan is unavailable.')
  const baseUrl = safeBaseUrl(req)
  const response = await getClient().subscriptions.createSubscription({
    prefer: 'return=representation',
    paypalRequestId: String(requestId).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80) || randomUUID(),
    body: {
      planId: billingPlan.provider_plan_id,
      quantity: String(safeQuantity),
      subscriber: { emailAddress: user.email },
      autoRenewal: true,
      customId: user.id,
      applicationContext: {
        brandName: 'Mere X',
        locale: 'en-US',
        shippingPreference: 'NO_SHIPPING',
        userAction: 'SUBSCRIBE_NOW',
        returnUrl: `${baseUrl}/#/pricing?checkout=approved`,
        cancelUrl: `${baseUrl}/#/pricing?checkout=cancelled`,
      },
    },
  })
  const subscription = responsePayload(response)
  if (!subscription?.id) throw new Error('The subscription could not be created.')
  await createBillingSubscription({
    userId: user.id,
    providerSubscriptionId: subscription.id,
    providerPlanId: billingPlan.provider_plan_id,
    planKey,
    billingCycle,
    quantity: safeQuantity,
    status: subscription.status || 'APPROVAL_PENDING',
    payload: safeSubscriptionPayload(subscription),
  })
  return { subscriptionId: subscription.id }
}

async function remoteSubscription(providerSubscriptionId) {
  const response = await getClient().subscriptions.getSubscription({ id: providerSubscriptionId, fields: 'plan,last_failed_payment' })
  return responsePayload(response)
}

export async function confirmPayPalSubscription(userId, providerSubscriptionId) {
  const local = await getBillingSubscriptionByProviderId(providerSubscriptionId)
  if (!local || local.userId !== userId) throw Object.assign(new Error('Subscription not found.'), { statusCode: 404 })
  let remote = null
  for (let attempt = 0; attempt < 5; attempt += 1) {
    remote = await remoteSubscription(providerSubscriptionId)
    if (ACTIVE_STATUSES.has(String(remote?.status || '').toUpperCase())) break
    if (attempt < 4) await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)))
  }
  if (remote?.custom_id && remote.custom_id !== userId) throw Object.assign(new Error('Subscription ownership could not be verified.'), { statusCode: 403 })
  const plan = await getBillingPlanByProviderId(remote?.plan_id || remote?.planId || '')
  if (!plan || plan.plan_key !== local.plan) throw Object.assign(new Error('Subscription plan could not be verified.'), { statusCode: 409 })
  const status = String(remote?.status || '').toUpperCase()
  if (!ACTIVE_STATUSES.has(status)) throw Object.assign(new Error('Payment approval is still pending.'), { statusCode: 409 })
  const nextBillingTime = remote?.billing_info?.next_billing_time || remote?.billingInfo?.nextBillingTime
  return syncBillingSubscription({
    providerSubscriptionId,
    status: 'ACTIVE',
    payerId: remote?.subscriber?.payer_id || remote?.subscriber?.payerId,
    accessExpiresAt: timestamp(nextBillingTime),
    cancelAtPeriodEnd: false,
    payload: safeSubscriptionPayload(remote),
    planKey: plan.plan_key,
    billingCycle: plan.billing_cycle,
    quantity: Number(remote?.quantity || local.quantity || 1),
  })
}

export async function cancelPayPalSubscription(userId, providerSubscriptionId, reason = 'Cancelled by the account owner.') {
  const local = await getBillingSubscriptionByProviderId(providerSubscriptionId)
  if (!local || local.userId !== userId) throw Object.assign(new Error('Subscription not found.'), { statusCode: 404 })
  const remote = await remoteSubscription(providerSubscriptionId)
  if (remote?.custom_id && remote.custom_id !== userId) throw Object.assign(new Error('Subscription ownership could not be verified.'), { statusCode: 403 })
  const nextBillingTime = remote?.billing_info?.next_billing_time || remote?.billingInfo?.nextBillingTime
  await getClient().subscriptions.cancelSubscription({ id: providerSubscriptionId, body: { reason: String(reason).slice(0, 120) } })
  return syncBillingSubscription({ providerSubscriptionId, status: 'CANCELLED', accessExpiresAt: timestamp(nextBillingTime) || local.accessExpiresAt || Date.now(), cancelAtPeriodEnd: true, payload: safeSubscriptionPayload(remote) })
}

function webhookHeaders(req) {
  return {
    auth_algo: req.get('paypal-auth-algo'),
    cert_url: req.get('paypal-cert-url'),
    transmission_id: req.get('paypal-transmission-id'),
    transmission_sig: req.get('paypal-transmission-sig'),
    transmission_time: req.get('paypal-transmission-time'),
  }
}

export async function verifyPayPalWebhook(req, event) {
  if (!process.env.PAYPAL_WEBHOOK_ID) return false
  const result = await paypalRest('/v1/notifications/verify-webhook-signature', {
    method: 'POST',
    body: { ...webhookHeaders(req), webhook_id: process.env.PAYPAL_WEBHOOK_ID, webhook_event: event },
  })
  return result?.verification_status === 'SUCCESS'
}

function subscriptionIdFromEvent(event) {
  const resource = event?.resource || {}
  if (String(event?.event_type || '').startsWith('BILLING.SUBSCRIPTION.')) return resource.id
  return resource.billing_agreement_id || resource.billingAgreementId || resource.supplementary_data?.related_ids?.subscription_id
}

export async function processPayPalWebhook(event) {
  const eventId = String(event?.id || randomUUID()).slice(0, 160)
  const eventType = String(event?.event_type || 'UNKNOWN').slice(0, 100)
  const providerSubscriptionId = subscriptionIdFromEvent(event)
  let local = providerSubscriptionId ? await getBillingSubscriptionByProviderId(providerSubscriptionId) : null
  if (providerSubscriptionId && local) {
    try {
      const remote = await remoteSubscription(providerSubscriptionId)
      const remoteStatus = String(remote?.status || event?.resource?.status || local.status).toUpperCase()
      const nextBillingTime = remote?.billing_info?.next_billing_time || remote?.billingInfo?.nextBillingTime
      const accessExpiresAt = ['EXPIRED', 'SUSPENDED'].includes(remoteStatus) ? Date.now() : timestamp(nextBillingTime) ?? local.accessExpiresAt
      local = await syncBillingSubscription({
        providerSubscriptionId,
        status: ACTIVE_STATUSES.has(remoteStatus) ? 'ACTIVE' : remoteStatus,
        payerId: remote?.subscriber?.payer_id || remote?.subscriber?.payerId,
        accessExpiresAt,
        cancelAtPeriodEnd: TERMINAL_STATUSES.has(remoteStatus),
        payload: safeSubscriptionPayload(remote),
        quantity: Number(remote?.quantity || local.quantity || 1),
      })
    } catch {
      const eventStatus = String(event?.resource?.status || '').toUpperCase()
      if (eventStatus) local = await syncBillingSubscription({ providerSubscriptionId, status: eventStatus, accessExpiresAt: ['EXPIRED', 'SUSPENDED'].includes(eventStatus) ? Date.now() : undefined, cancelAtPeriodEnd: TERMINAL_STATUSES.has(eventStatus), payload: safeEventPayload(event).resource })
    }
  }
  const resource = event?.resource || {}
  const amount = resource.amount?.total ?? resource.amount?.value ?? null
  const currency = resource.amount?.currency ?? resource.amount?.currency_code ?? null
  if (eventType.startsWith('PAYMENT.') || eventType.includes('PAYMENT')) {
    await recordBillingTransaction({
      id: eventId,
      subscriptionId: local?.id || null,
      userId: local?.userId || null,
      providerTransactionId: resource.id || null,
      eventType,
      status: resource.state || resource.status || eventType.split('.').at(-1) || 'RECEIVED',
      amount: amount === null ? null : Number(amount),
      currency,
      payload: safeEventPayload(event),
    })
  }
  const fresh = await recordBillingEvent({ id: eventId, userId: local?.userId || null, eventType, payload: safeEventPayload(event) })
  return { duplicate: !fresh, subscription: local }
}

export async function createPayPalWebhook(webhookUrl) {
  const url = String(webhookUrl || '').trim()
  if (!/^https:\/\//i.test(url)) throw new Error('A public HTTPS webhook URL is required.')
  return paypalRest('/v1/notifications/webhooks', {
    method: 'POST',
    body: {
      url,
      event_types: [
        { name: 'BILLING.SUBSCRIPTION.ACTIVATED' },
        { name: 'BILLING.SUBSCRIPTION.UPDATED' },
        { name: 'BILLING.SUBSCRIPTION.SUSPENDED' },
        { name: 'BILLING.SUBSCRIPTION.CANCELLED' },
        { name: 'BILLING.SUBSCRIPTION.EXPIRED' },
        { name: 'BILLING.SUBSCRIPTION.PAYMENT.FAILED' },
        { name: 'PAYMENT.SALE.COMPLETED' },
        { name: 'PAYMENT.SALE.DENIED' },
        { name: 'PAYMENT.SALE.REFUNDED' },
        { name: 'PAYMENT.SALE.REVERSED' },
      ],
    },
  })
}
