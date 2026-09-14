import crypto from "node:crypto";

import express from "express";

import { credentialHash, requireAccountAuth } from "./auth.js";
import { query } from "./database.js";

const KEY_SCOPES = new Set(["messages", "embeddings", "images", "audio", "batches", "files", "admin"]);
const WEBHOOK_EVENTS = new Set(["batch.completed", "batch.failed", "usage.threshold", "key.created", "key.revoked", "limit.reached", "file.processed"]);
const SETTING_FIELDS = new Set(["defaultModel", "logRetentionDays", "zeroRetention", "promptCaching", "requireSso", "ipAllowlist"]);
const BILLING_FIELDS = new Set(["autoReload", "reloadThresholdUsd", "reloadAmountUsd", "monthlyLimitUsd", "alertAtPct"]);
const DEFAULT_SETTINGS = Object.freeze({
  defaultModel: "mere-nyx-5-5",
  logRetentionDays: 30,
  zeroRetention: false,
  promptCaching: true,
  requireSso: false,
  ipAllowlist: ""
});
const DEFAULT_BILLING = Object.freeze({
  creditsUsd: 0,
  autoReload: false,
  reloadThresholdUsd: 0,
  reloadAmountUsd: 0,
  monthlyLimitUsd: 0,
  alertAtPct: 0.8,
  paymentMethod: null,
  invoices: []
});
const DEFAULT_ONBOARDING = Object.freeze({ key: false, request: false, streaming: false, tools: false, production: false });

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function clean(value, max = 500) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function jsonObject(value, fallback = {}) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function jsonArray(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function timestamp(value) {
  const result = value ? new Date(value).getTime() : 0;
  return Number.isFinite(result) ? result : 0;
}

function requestIpHash(req) {
  return credentialHash(req.ip || req.socket?.remoteAddress || "unknown");
}

async function audit(req, action, target = "") {
  await query(
    `INSERT INTO developer_audit_events (user_id, action, target, ip_hash) VALUES ($1, $2, $3, $4)`,
    [req.user.id, clean(action, 120), clean(target, 500), requestIpHash(req)]
  );
}

function keyRecord(row) {
  return {
    id: row.id,
    name: row.name,
    prefix: row.key_prefix,
    lastFour: row.last_four,
    created: timestamp(row.created_at),
    lastUsed: timestamp(row.last_used_at) || null,
    scopes: jsonArray(row.scopes),
    limitUsd: Number(row.monthly_limit_usd || 0),
    spentUsd: Number(row.spent_usd || 0),
    status: row.status,
    env: row.environment
  };
}

function webhookRecord(row) {
  return {
    id: row.id,
    url: row.url,
    events: jsonArray(row.events),
    status: row.status,
    created: timestamp(row.created_at),
    delivered: Number(row.delivered || 0),
    failed: Number(row.failed || 0)
  };
}

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function emptyUsage(days = 90) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today.getTime() - (days - index - 1) * 86_400_000);
    return { date: dateKey(date), input: 0, output: 0, requests: 0, errors: 0, latency: 0, cost: 0 };
  });
}

function planLimits(plan) {
  const normalized = clean(plan, 40).toLowerCase();
  const tier = ({ starter: "Starter", plus: "Plus", pro: "Pro", max: "Max" })[normalized] || "Free";
  return { tier, rpm: 90, generationRpm: 20, authAttemptsPer15m: 30, paymentRpm: 30 };
}

async function preferences(userId) {
  const result = await query(`SELECT settings, billing, onboarding FROM developer_preferences WHERE user_id = $1`, [userId]);
  const row = result.rows[0];
  return {
    settings: { ...DEFAULT_SETTINGS, ...jsonObject(row?.settings) },
    billing: { ...DEFAULT_BILLING, ...jsonObject(row?.billing), creditsUsd: 0, paymentMethod: null, invoices: [] },
    onboarding: { ...DEFAULT_ONBOARDING, ...jsonObject(row?.onboarding) }
  };
}

async function savePreference(userId, category, values) {
  const current = await preferences(userId);
  const next = { ...current[category], ...values };
  const payload = JSON.stringify(next);
  await query(
    `INSERT INTO developer_preferences (user_id, settings, billing, onboarding)
     VALUES ($1, $2, $3, $4)
     ON DUPLICATE KEY UPDATE ${category} = VALUES(${category}), updated_at = now()`,
    [
      userId,
      category === "settings" ? payload : JSON.stringify(current.settings),
      category === "billing" ? payload : JSON.stringify(current.billing),
      category === "onboarding" ? payload : JSON.stringify(current.onboarding)
    ]
  );
  return next;
}

async function consoleState(req) {
  const [workspaceResult, keysResult, webhooksResult, paymentsResult, usageResult, logsResult, auditResult, prefs] = await Promise.all([
    query(`SELECT id, name, created_at FROM workspaces WHERE owner_id = $1 LIMIT 1`, [req.user.id]),
    query(
      `SELECT k.*,
        COALESCE((SELECT SUM(l.estimated_cost_usd) FROM developer_request_logs l WHERE l.api_key_id = k.id), 0) AS spent_usd
       FROM developer_api_keys k WHERE k.user_id = $1 ORDER BY k.created_at DESC`,
      [req.user.id]
    ),
    query(`SELECT * FROM developer_webhooks WHERE user_id = $1 ORDER BY created_at DESC`, [req.user.id]),
    query(`SELECT provider_order_id, plan, amount, currency, status, payment_method, created_at, captured_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [req.user.id]),
    query(
      `SELECT DATE(created_at) AS day, SUM(input_tokens) AS input_tokens, SUM(output_tokens) AS output_tokens,
        COUNT(*) AS requests, SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS errors,
        AVG(latency_ms) AS latency, SUM(estimated_cost_usd) AS cost
       FROM developer_request_logs WHERE user_id = $1 AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 90 DAY)
       GROUP BY DATE(created_at) ORDER BY day`,
      [req.user.id]
    ),
    query(`SELECT * FROM developer_request_logs WHERE user_id = $1 ORDER BY created_at DESC LIMIT 250`, [req.user.id]),
    query(`SELECT action, target, created_at FROM developer_audit_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100`, [req.user.id]),
    preferences(req.user.id)
  ]);

  const workspace = workspaceResult.rows[0] || {};
  const usage = emptyUsage();
  const usageByDay = new Map(usage.map((row) => [row.date, row]));
  usageResult.rows.forEach((row) => {
    const day = dateKey(new Date(row.day));
    if (!usageByDay.has(day)) return;
    Object.assign(usageByDay.get(day), {
      input: Number(row.input_tokens || 0),
      output: Number(row.output_tokens || 0),
      requests: Number(row.requests || 0),
      errors: Number(row.errors || 0),
      latency: Math.round(Number(row.latency || 0)),
      cost: Number(row.cost || 0)
    });
  });

  const invoices = paymentsResult.rows.map((row) => ({
    id: row.provider_order_id,
    period: new Date(row.captured_at || row.created_at).toLocaleDateString("en", { month: "long", year: "numeric", timeZone: "UTC" }),
    amountUsd: Number(row.amount || 0),
    currency: row.currency,
    status: row.status,
    issued: timestamp(row.captured_at || row.created_at),
    plan: row.plan
  }));
  const keys = keysResult.rows.map(keyRecord);
  const logs = logsResult.rows.map((row) => ({
    id: row.request_id,
    at: timestamp(row.created_at),
    endpoint: row.endpoint,
    model: row.model || "Mere X",
    status: Number(row.status_code),
    latency: Number(row.latency_ms || 0),
    input: Number(row.input_tokens || 0),
    output: Number(row.output_tokens || 0),
    key: row.api_key_id ? keys.find((key) => key.id === row.api_key_id)?.name || "API key" : "Studio",
    stop: row.stop_reason || null,
    error: row.error_code || null
  }));
  const onboarding = {
    ...prefs.onboarding,
    key: prefs.onboarding.key || keys.some((key) => key.status === "active"),
    request: prefs.onboarding.request || logs.some((log) => log.status < 400)
  };

  return {
    org: {
      name: (workspace.name || `${req.user.name}'s Studio`).replace(/ workspace$/i, " Studio"),
      id: workspace.id ? `org_${workspace.id}` : `user_${req.user.id}`,
      plan: req.user.plan || "Free",
      created: timestamp(workspace.created_at) || Date.now(),
      region: "global",
      seats: 1
    },
    user: { name: req.user.name, email: req.user.email, role: "Owner" },
    keys,
    webhooks: webhooksResult.rows.map(webhookRecord),
    webhookDeliveries: [],
    members: [{ name: req.user.name, email: req.user.email, role: "Owner", added: timestamp(workspace.created_at) || Date.now(), status: "active" }],
    audit: auditResult.rows.map((row) => ({ at: timestamp(row.created_at), actor: req.user.email, action: row.action, target: row.target, ip: "private" })),
    billing: { ...prefs.billing, invoices },
    limits: planLimits(req.user.plan),
    onboarding,
    settings: prefs.settings,
    usage90: usage,
    logs
  };
}

export function createConsoleRouter() {
  const router = express.Router();
  router.use(requireAccountAuth);

  router.get("/", asyncRoute(async (req, res) => {
    res.setHeader("Cache-Control", "private, no-store");
    res.json({ state: await consoleState(req) });
  }));

  router.post("/keys", asyncRoute(async (req, res) => {
    const name = clean(req.body?.name, 120);
    const environment = req.body?.env === "test" ? "test" : "live";
    const scopes = [...new Set((Array.isArray(req.body?.scopes) ? req.body.scopes : []).map((scope) => clean(scope, 40)).filter((scope) => KEY_SCOPES.has(scope)))];
    const monthlyLimit = Math.max(0, Math.min(1_000_000, Number(req.body?.limitUsd || 0)));
    if (!name) return res.status(400).json({ error: { code: "invalid_key_name", message: "Give the key a name." } });
    if (!scopes.length) scopes.push("messages");
    const id = crypto.randomUUID();
    const prefix = `merex-${environment}`;
    const secret = `${prefix}-${crypto.randomBytes(30).toString("base64url")}`;
    await query(
      `INSERT INTO developer_api_keys (id, user_id, name, token_hash, key_prefix, last_four, environment, scopes, monthly_limit_usd)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, req.user.id, name, credentialHash(secret), prefix, secret.slice(-4), environment, JSON.stringify(scopes), monthlyLimit]
    );
    await audit(req, "key.created", name);
    const result = await query(`SELECT *, 0 AS spent_usd FROM developer_api_keys WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    res.status(201).json({ key: { ...keyRecord(result.rows[0]), secret } });
  }));

  router.patch("/keys/:id", asyncRoute(async (req, res) => {
    const id = clean(req.params.id, 36);
    const name = clean(req.body?.name, 120);
    const revoke = req.body?.status === "revoked";
    if (!name && !revoke) return res.status(400).json({ error: { code: "invalid_key_update", message: "No valid key change was supplied." } });
    if (revoke) {
      await query(`UPDATE developer_api_keys SET status = 'revoked', revoked_at = now() WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
      await audit(req, "key.revoked", id);
    } else {
      await query(`UPDATE developer_api_keys SET name = $3 WHERE id = $1 AND user_id = $2`, [id, req.user.id, name]);
      await audit(req, "key.renamed", name);
    }
    const result = await query(`SELECT *, 0 AS spent_usd FROM developer_api_keys WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: { code: "key_not_found", message: "That API key was not found." } });
    res.json({ key: keyRecord(result.rows[0]) });
  }));

  router.delete("/keys/:id", asyncRoute(async (req, res) => {
    const id = clean(req.params.id, 36);
    const result = await query(`DELETE FROM developer_api_keys WHERE id = $1 AND user_id = $2 AND status = 'revoked'`, [id, req.user.id]);
    if (!result.rowCount) return res.status(409).json({ error: { code: "key_must_be_revoked", message: "Revoke this key before deleting its record." } });
    await audit(req, "key.deleted", id);
    res.status(204).end();
  }));

  router.post("/webhooks", asyncRoute(async (req, res) => {
    const events = [...new Set((Array.isArray(req.body?.events) ? req.body.events : []).map((event) => clean(event, 120)).filter((event) => WEBHOOK_EVENTS.has(event)))];
    let endpoint;
    try { endpoint = new URL(clean(req.body?.url, 2_000)); } catch { endpoint = null; }
    if (!endpoint || endpoint.protocol !== "https:" || endpoint.username || endpoint.password) {
      return res.status(400).json({ error: { code: "invalid_webhook_url", message: "Use a public HTTPS endpoint without embedded credentials." } });
    }
    if (!events.length) return res.status(400).json({ error: { code: "invalid_webhook_events", message: "Select at least one webhook event." } });
    const id = crypto.randomUUID();
    const secret = `whsec_${crypto.randomBytes(30).toString("base64url")}`;
    await query(
      `INSERT INTO developer_webhooks (id, user_id, url, events, signing_secret_hash) VALUES ($1, $2, $3, $4, $5)`,
      [id, req.user.id, endpoint.toString(), JSON.stringify(events), credentialHash(secret)]
    );
    await audit(req, "webhook.created", endpoint.origin);
    const result = await query(`SELECT * FROM developer_webhooks WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    res.status(201).json({ webhook: { ...webhookRecord(result.rows[0]), secret } });
  }));

  router.delete("/webhooks/:id", asyncRoute(async (req, res) => {
    const id = clean(req.params.id, 36);
    const result = await query(`DELETE FROM developer_webhooks WHERE id = $1 AND user_id = $2`, [id, req.user.id]);
    if (!result.rowCount) return res.status(404).json({ error: { code: "webhook_not_found", message: "That webhook was not found." } });
    await audit(req, "webhook.deleted", id);
    res.status(204).end();
  }));

  router.patch("/preferences/:category", asyncRoute(async (req, res) => {
    const category = clean(req.params.category, 20);
    const fields = category === "settings" ? SETTING_FIELDS : category === "billing" ? BILLING_FIELDS : null;
    if (!fields && category !== "onboarding") return res.status(404).json({ error: { code: "preference_not_found", message: "Unknown preference group." } });
    const input = jsonObject(req.body);
    const allowed = category === "onboarding" ? new Set(Object.keys(DEFAULT_ONBOARDING)) : fields;
    const values = Object.fromEntries(Object.entries(input).filter(([key]) => allowed.has(key)));
    if (!Object.keys(values).length) return res.status(400).json({ error: { code: "invalid_preferences", message: "No valid preferences were supplied." } });
    const saved = await savePreference(req.user.id, category, values);
    await audit(req, `${category}.updated`, Object.keys(values).join(", "));
    res.json({ [category]: saved });
  }));

  return router;
}

export function recordDeveloperRequest(req, res, next) {
  if (!req.user || !["POST", "PUT", "PATCH", "DELETE"].includes(req.method) || req.path.startsWith("/console") || req.path.startsWith("/auth") || req.path.startsWith("/paypal")) return next();
  const started = performance.now();
  const requestId = crypto.randomUUID();
  res.setHeader("X-Mere-X-Request-Id", requestId);
  res.once("finish", () => {
    const usage = res.locals.mereXUsage || {};
    query(
      `INSERT INTO developer_request_logs
       (request_id, user_id, api_key_id, endpoint, model, status_code, latency_ms, input_tokens, output_tokens, estimated_cost_usd, stop_reason, error_code)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [requestId, req.user.id, req.apiKeyId || null, req.originalUrl.split("?")[0], clean(usage.model, 120) || null, res.statusCode,
        Math.max(0, Math.round(performance.now() - started)), Number(usage.inputTokens || 0), Number(usage.outputTokens || 0),
        Number(usage.cost || 0), clean(usage.stopReason, 80) || null, res.statusCode >= 400 ? clean(usage.errorCode, 120) || `http_${res.statusCode}` : null]
    ).catch((error) => console.error("Mere X request log failed:", error.message));
  });
  next();
}
