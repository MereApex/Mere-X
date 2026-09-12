import crypto from "node:crypto";

import express from "express";
import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  OrdersController
} from "@paypal/paypal-server-sdk";

import "./env.js";
import { query, transaction } from "./database.js";
import { requireAccountAuth } from "./auth.js";

export const PLAN_CATALOG = Object.freeze({
  Starter: { amount: "9.99", days: 30 },
  Plus: { amount: "19.99", days: 30 },
  Pro: { amount: "39.99", days: 30 },
  Max: { amount: "79.99", days: 30 }
});

function configured() {
  return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
}

function isLive() {
  return ["live", "production"].includes(String(process.env.PAYPAL_ENV || "sandbox").toLowerCase());
}

function currency() {
  const value = String(process.env.PAYPAL_CURRENCY || "USD").toUpperCase();
  return /^[A-Z]{3}$/.test(value) ? value : "USD";
}

let ordersController;
function orders() {
  if (!configured()) {
    const error = new Error("PayPal is not configured.");
    error.status = 503;
    error.code = "paypal_not_configured";
    throw error;
  }
  if (!ordersController) {
    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: process.env.PAYPAL_CLIENT_ID,
        oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET
      },
      environment: isLive() ? Environment.Production : Environment.Sandbox,
      timeout: 30_000
    });
    ordersController = new OrdersController(client);
  }
  return ordersController;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function paymentMethod(order) {
  const source = order?.paymentSource || {};
  if (source.applePay) return "apple_pay";
  if (source.googlePay) return "google_pay";
  if (source.card) return "card";
  if (source.paypal) return "paypal";
  return "unknown";
}

async function paypalRequest(work) {
  try {
    return await work();
  } catch (error) {
    if (String(error?.code || "").startsWith("paypal_") || error?.code === "payment_not_completed") throw error;
    const providerStatus = Number(error?.statusCode || error?.status || 0);
    const safe = new Error("PayPal could not complete this request. No Mere X plan was changed.");
    safe.status = providerStatus >= 400 && providerStatus < 500 ? 409 : 502;
    safe.code = "paypal_request_failed";
    throw safe;
  }
}

async function grantPlan(runQuery, userId, plan) {
  const days = PLAN_CATALOG[plan]?.days || 30;
  await runQuery(
    `UPDATE users SET plan = $2,
       plan_expires_at = DATE_ADD(GREATEST(COALESCE(plan_expires_at, now()), now()), INTERVAL $3 DAY),
       updated_at = now() WHERE id = $1`,
    [userId, plan, days]
  );
}

async function paypalAccessToken() {
  const endpoint = isLive() ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  const basic = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
  const response = await fetch(`${endpoint}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials"
  });
  if (!response.ok) throw Object.assign(new Error("PayPal authentication failed."), { status: 502, code: "paypal_authentication" });
  return { endpoint, ...(await response.json()) };
}

async function verifyWebhook(req) {
  if (!process.env.PAYPAL_WEBHOOK_ID) return false;
  const access = await paypalAccessToken();
  const response = await fetch(`${access.endpoint}/v1/notifications/verify-webhook-signature`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      auth_algo: req.headers["paypal-auth-algo"],
      cert_url: req.headers["paypal-cert-url"],
      transmission_id: req.headers["paypal-transmission-id"],
      transmission_sig: req.headers["paypal-transmission-sig"],
      transmission_time: req.headers["paypal-transmission-time"],
      webhook_id: process.env.PAYPAL_WEBHOOK_ID,
      webhook_event: req.body
    })
  });
  if (!response.ok) return false;
  return (await response.json()).verification_status === "SUCCESS";
}

export function createPayPalRouter() {
  const router = express.Router();

  router.get("/config", (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    res.json({
      configured: configured(),
      clientId: configured() ? process.env.PAYPAL_CLIENT_ID : "",
      currency: currency(),
      environment: isLive() ? "production" : "sandbox",
      plans: Object.fromEntries(Object.entries(PLAN_CATALOG).map(([name, details]) => [name, { amount: details.amount, days: details.days }]))
    });
  });

  router.post("/orders", requireAccountAuth, asyncRoute(async (req, res) => {
    const plan = String(req.body?.plan || "");
    const selected = PLAN_CATALOG[plan];
    if (!selected) return res.status(400).json({ error: { code: "invalid_plan", message: "Choose a valid paid plan." } });
    const requestId = crypto.randomUUID();
    const base = String(process.env.PUBLIC_APP_URL || `${req.protocol}://${req.get("host")}`).replace(/\/$/, "");
    const response = await paypalRequest(() => orders().createOrder({
      body: {
        intent: CheckoutPaymentIntent.Capture,
        purchaseUnits: [{
          referenceId: "mere-x-plan",
          customId: `${req.user.id}:${plan}`,
          invoiceId: requestId,
          description: `Mere X ${plan} — 30-day access`,
          amount: { currencyCode: currency(), value: selected.amount }
        }],
        applicationContext: {
          brandName: "Mere X",
          shippingPreference: "NO_SHIPPING",
          userAction: "PAY_NOW",
          returnUrl: `${base}/pricing?checkout=approved`,
          cancelUrl: `${base}/pricing?checkout=cancelled`
        }
      },
      paypalRequestId: requestId,
      prefer: "return=representation"
    }));
    const order = response.result;
    if (!order?.id) throw Object.assign(new Error("PayPal did not create an order."), { status: 502, code: "paypal_create_failed" });
    await query(
      `INSERT INTO payments (user_id, provider_order_id, plan, amount, currency, status, provider_status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [req.user.id, order.id, plan, selected.amount, currency(), order.status || "CREATED", JSON.stringify({ status: order.status })]
    );
    res.status(201).json({ id: order.id, status: order.status });
  }));

  router.post("/plan/free", requireAccountAuth, asyncRoute(async (req, res) => {
    await query(`UPDATE users SET plan = 'Free', plan_expires_at = NULL, updated_at = now() WHERE id = $1`, [req.user.id]);
    res.json({ plan: "Free" });
  }));

  router.post("/orders/:orderId/capture", requireAccountAuth, asyncRoute(async (req, res) => {
    const orderId = String(req.params.orderId || "").slice(0, 80);
    const paymentResult = await query(`SELECT * FROM payments WHERE provider_order_id = $1 AND user_id = $2 LIMIT 1`, [orderId, req.user.id]);
    const payment = paymentResult.rows[0];
    if (!payment) return res.status(404).json({ error: { code: "payment_not_found", message: "This payment does not belong to your account." } });
    if (payment.status === "COMPLETED") {
      return res.json({ status: "COMPLETED", plan: payment.plan, captureId: payment.provider_capture_id });
    }
    const response = await paypalRequest(() => orders().captureOrder({ id: orderId, paypalRequestId: crypto.randomUUID(), prefer: "return=representation" }));
    const order = response.result;
    const purchase = order?.purchaseUnits?.[0];
    const capture = purchase?.payments?.captures?.[0];
    const receivedAmount = capture?.amount?.value || purchase?.amount?.value;
    const receivedCurrency = capture?.amount?.currencyCode || purchase?.amount?.currencyCode;
    if (order?.status !== "COMPLETED" || receivedAmount !== Number(payment.amount).toFixed(2) || receivedCurrency !== payment.currency.trim()) {
      await query(`UPDATE payments SET status = $2, provider_status = $3, updated_at = now() WHERE id = $1`, [payment.id, order?.status || "FAILED", JSON.stringify({ status: order?.status })]);
      throw Object.assign(new Error("PayPal did not complete the expected payment."), { status: 409, code: "payment_not_completed" });
    }
    await transaction(async (runQuery) => {
      const locked = await runQuery(`SELECT status FROM payments WHERE id = $1 FOR UPDATE`, [payment.id]);
      if (locked.rows[0]?.status === "COMPLETED") return;
      await runQuery(
        `UPDATE payments SET provider_capture_id = $2, status = 'COMPLETED', payment_method = $3, provider_status = $4, captured_at = now(), updated_at = now() WHERE id = $1`,
        [payment.id, capture?.id || null, paymentMethod(order), JSON.stringify({ status: order.status, captureStatus: capture?.status })]
      );
      await grantPlan(runQuery, req.user.id, payment.plan);
    });
    res.json({ status: "COMPLETED", plan: payment.plan, captureId: capture?.id || null });
  }));

  router.get("/payments", requireAccountAuth, asyncRoute(async (req, res) => {
    const result = await query(
      `SELECT provider_order_id AS orderId, provider_capture_id AS captureId, plan, CAST(amount AS CHAR) AS amount, currency, status, payment_method AS paymentMethod, created_at AS createdAt, captured_at AS capturedAt
       FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [req.user.id]
    );
    res.json({ payments: result.rows });
  }));

  router.post("/webhook", asyncRoute(async (req, res) => {
    if (!(await verifyWebhook(req))) return res.status(400).json({ error: { code: "invalid_webhook", message: "Webhook signature verification failed." } });
    const eventId = String(req.body?.id || "");
    const eventType = String(req.body?.event_type || "UNKNOWN");
    if (!eventId) return res.status(400).end();
    const inserted = await query(
      `INSERT IGNORE INTO payment_webhook_events (provider_event_id, event_type, payload) VALUES ($1, $2, $3)`,
      [eventId, eventType, JSON.stringify(req.body)]
    );
    if (inserted.rowCount && eventType === "PAYMENT.CAPTURE.REFUNDED") {
      const captureId = String(req.body?.resource?.id || "");
      await query(`UPDATE payments SET status = 'REFUNDED', provider_status = $2, updated_at = now() WHERE provider_capture_id = $1`, [captureId, JSON.stringify({ eventType })]);
    }
    if (inserted.rowCount && eventType === "PAYMENT.CAPTURE.DENIED") {
      const captureId = String(req.body?.resource?.id || "");
      await query(`UPDATE payments SET status = 'DENIED', provider_status = $2, updated_at = now() WHERE provider_capture_id = $1`, [captureId, JSON.stringify({ eventType })]);
    }
    res.status(204).end();
  }));

  return router;
}
