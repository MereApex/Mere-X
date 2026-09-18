import crypto from "node:crypto";
import path from "node:path";

import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import multer from "multer";
import OpenAI, { toFile } from "openai";

import { rootDirectory as root } from "./env.js";
import { initDatabase, databaseConfigured, query } from "./database.js";
import { createAuthRouter, enforceApiKeyScope, optionalAuth, requireAccountAuth, requireAuth, requirePageAuth } from "./auth.js";
import { createWorkspaceRouter } from "./workspace.js";
import { createPayPalRouter } from "./paypal.js";
import { createConsoleRouter, recordDeveloperRequest } from "./console.js";
import { consumeUsage, resolveAgentAccess, usageSummary } from "./entitlements.js";
import { AGENT_MODES, SERVER_TOOLS, agentInstructions, isNewTurn, normalizeItems, projectContextText, toolsForMode } from "./agent.js";
import { PLUGIN_PROVIDERS, credentialsFor, toolsForPlugin } from "./plugin-providers.js";
import {
  accessTokenFor,
  connectedPluginIds,
  connectionSummary,
  forgetConnection,
  initConnections,
  readState,
  saveConnection,
  signState
} from "./plugin-connections.js";

const isProduction = process.argv.includes("--production") || process.env.NODE_ENV === "production";
const port = Number(process.env.PORT || 5173);

/* The three Mere models. Each is a distinct line with its own generation
   number; the environment decides which backend serves it. */
const MODEL_PROFILES = Object.freeze({
  nyx: { publicName: "Mere Nyx 2", model: process.env.OPENAI_MODEL_NYX || "gpt-5.6-luna" },
  orion: { publicName: "Mere Orion 3", model: process.env.OPENAI_MODEL_ORION || "gpt-5.6-terra" },
  apex: { publicName: "Mere Apex 4", model: process.env.OPENAI_MODEL_APEX || "gpt-5.6-sol" }
});

const MODELS = Object.freeze({
  Fast: MODEL_PROFILES.nyx.model,
  embedding: process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-large",
  moderation: process.env.OPENAI_MODERATION_MODEL || "omni-moderation-latest"
});

/* Four depths of thinking. Fast answers with no deliberation at all; Extra
   High is for the refactor that has to be right the first time. */
const EFFORTS = Object.freeze({ Fast: "none", Medium: "medium", High: "high", "Extra High": "xhigh" });
const OUTPUT_BUDGET = Object.freeze({ Fast: 12_000, Medium: 16_000, High: 24_000, "Extra High": 32_000 });
const MAX_MESSAGE_CHARACTERS = 80_000;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

let openaiClient;
function openai() {
  if (!process.env.OPENAI_API_KEY) {
    const error = new Error("Mere X's AI service is not configured. Add the server credentials and restart Mere X.");
    error.status = 503;
    error.code = "ai_not_configured";
    throw error;
  }
  openaiClient ||= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 10 * 60 * 1000, maxRetries: 2 });
  return openaiClient;
}

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://accounts.google.com", "https://www.paypal.com", "https://www.sandbox.paypal.com", "https://www.paypalobjects.com", "https://pay.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      connectSrc: ["'self'", "https://*.paypal.com", "https://*.paypalobjects.com", "https://*.google.com", "https://*.googleapis.com"],
      frameSrc: ["'self'", "https://accounts.google.com", "https://*.paypal.com", "https://*.paypalobjects.com", "https://pay.google.com"],
      workerSrc: ["'self'", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'", "https://*.paypal.com"]
    }
  },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" }
}));
app.use((req, res, next) => {
  res.setHeader("Permissions-Policy", "microphone=(), camera=(), payment=(self)");
  next();
});
app.use(express.json({ limit: "6mb" }));
/* The desktop app (Tauri) calls the API from its own origin with a bearer
   session instead of a cookie; it gets CORS, everything else must be
   same-origin. */
const DESKTOP_ORIGINS = new Set(["http://tauri.localhost", "https://tauri.localhost", "tauri://localhost"]);
app.use("/api", (req, res, next) => {
  const origin = req.get("origin");
  if (origin && DESKTOP_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, X-Mere-Client");
    res.setHeader("Access-Control-Max-Age", "600");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") return res.status(204).end();
    return next();
  }
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (!origin) return next();
  try {
    if (new URL(origin).host === req.get("host")) return next();
  } catch { /* reject malformed origins below */ }
  return res.status(403).json({ error: { code: "origin_rejected", message: "This request did not originate from Mere X." } });
});

const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 240,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "rate_limit", message: "Too many requests. Wait a moment and try again." } }
});
/* An agent turn is many rounds: one request per tool batch. */
const generationLimiter = rateLimit({
  windowMs: 60_000,
  limit: 90,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "generation_rate_limit", message: "Generation limit reached. Wait a moment and try again." } }
});
const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "auth_rate_limit", message: "Too many account attempts. Try again later." } }
});
const paymentLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: { code: "payment_rate_limit", message: "Too many payment requests. Wait a moment and try again." } }
});
app.use("/api", apiLimiter);
await initDatabase();
if (databaseConfigured()) await initConnections();
app.use("/api", optionalAuth);
app.use("/api/auth", authLimiter, createAuthRouter());
app.use("/api/workspace", createWorkspaceRouter());
app.use("/api/paypal", paymentLimiter, createPayPalRouter());
app.use("/api/console", createConsoleRouter());

app.get("/.well-known/apple-developer-merchantid-domain-association", (req, res) => {
  const association = process.env.PAYPAL_APPLE_PAY_DOMAIN_ASSOCIATION;
  if (!association) return res.status(404).end();
  const value = association.startsWith("base64:")
    ? Buffer.from(association.slice("base64:".length), "base64").toString("utf8")
    : association.replace(/\\n/g, "\n");
  res.type("text/plain").setHeader("Cache-Control", "public, max-age=3600");
  return res.send(value);
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 8 }
});

function cleanText(value, max = MAX_MESSAGE_CHARACTERS) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}

function cleanName(value) {
  return path.basename(String(value || "file")).replace(/[^\p{L}\p{N}._()\- ]/gu, "_").slice(0, 160) || "file";
}

function publicError(error) {
  if (error?.code && [
    "database_not_configured", "paypal_not_configured", "paypal_authentication", "paypal_create_failed",
    "paypal_request_failed", "payment_not_completed", "usage_limit_5h", "usage_limit_week",
    "model_plan_required", "effort_plan_required", "invalid_usage_category"
  ].includes(error.code)) {
    return { status: Number(error.status || 500), code: error.code, message: error.message };
  }
  if (error?.code === "content_blocked") return { status: 400, code: error.code, message: error.message };
  if (error?.code === "ai_not_configured") return { status: 503, code: error.code, message: error.message };
  const status = Number(error?.status || 500);
  if (status === 401) return { status: 503, code: "ai_authentication", message: "Mere X's AI service credentials are invalid or revoked." };
  if (status === 403) return { status: 403, code: "ai_access", message: "This Mere X plan cannot access the selected feature." };
  if (status === 429) return { status: 429, code: "ai_rate_limit", message: "Mere X's current capacity or account quota was reached. Try again shortly." };
  if (status >= 400 && status < 500) return { status, code: error?.code || "invalid_request", message: "Mere X could not accept this request. Check the input and try again." };
  return { status: 502, code: "ai_unavailable", message: "Mere X could not complete the request. Try again." };
}

function sendError(res, error) {
  const safe = publicError(error);
  if (!res.headersSent) res.status(safe.status).json({ error: { code: safe.code, message: safe.message } });
  return safe;
}

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function moderate(client, input) {
  if (!input) return;
  const result = await client.moderations.create({ model: MODELS.moderation, input });
  if (result.results?.some((entry) => entry.flagged)) {
    const error = new Error("This request was blocked by Mere X's safety checks.");
    error.status = 400;
    error.code = "content_blocked";
    throw error;
  }
}

/* Connections belong to a person, not to a browser tab, so they hang off a
   stable hash of the workspace identity rather than the raw value. */
function redirectUri(req, pluginId) {
  const host = req.get("x-forwarded-host") || req.get("host");
  const protocol = req.get("x-forwarded-proto") || req.protocol;
  return `${protocol}://${host}/api/plugins/${pluginId}/callback`;
}

/* The popup reports back to the workspace that opened it and closes itself. */
function closePopupPage(payload) {
  const body = JSON.stringify(payload);
  return `<!doctype html><meta charset="utf-8"><title>Mere X</title>` +
    `<body style="margin:0;display:grid;place-items:center;height:100vh;font:15px system-ui;background:#0a0a0a;color:#e5e5e5">` +
    `<p>${payload.ok ? "Connected. You can close this window." : "Connection cancelled."}</p>` +
    `<script>try{window.opener&&window.opener.postMessage(${body},"*")}catch(e){}setTimeout(function(){window.close()},400)</script>`;
}

async function exchangeCode(pluginId, code, uri) {
  const config = PLUGIN_PROVIDERS[pluginId];
  const credentials = credentialsFor(pluginId);
  const headers = { Accept: "application/json" };
  let body;

  if (config.tokenAuth === "basic") {
    headers.Authorization = `Basic ${Buffer.from(`${credentials.clientId}:${credentials.clientSecret}`).toString("base64")}`;
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ grant_type: "authorization_code", code, redirect_uri: uri });
  } else {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: uri,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret
    });
  }

  const response = await fetch(config.tokenUrl, { method: "POST", headers, body });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload || payload.error) {
    throw new Error(`${PLUGIN_PROVIDERS[pluginId].label} refused the connection.`);
  }
  return payload;
}

app.get("/api/plugins", requireAccountAuth, asyncRoute(async (req, res) => {
  const user = req.user.id;
  const plugins = Object.entries(PLUGIN_PROVIDERS).map(([id, config]) => {
    const summary = connectionSummary(user, id);
    return {
      id,
      label: config.label,
      configured: Boolean(credentialsFor(id)),
      connected: Boolean(summary),
      account: summary?.account || "",
      connectedAt: summary?.connectedAt || "",
      redirectUri: redirectUri(req, id),
      tools: toolsForPlugin(id).map((tool) => tool.name)
    };
  });
  res.json({ plugins });
}));

app.get("/api/plugins/:id/authorize", requireAccountAuth, asyncRoute(async (req, res) => {
  const pluginId = cleanText(req.params.id, 60);
  const config = PLUGIN_PROVIDERS[pluginId];
  if (!config) return res.status(404).json({ error: { code: "unknown_plugin", message: "Mere X cannot connect to that service yet." } });

  const credentials = credentialsFor(pluginId);
  if (!credentials) {
    return res.status(503).json({
      error: {
        code: "plugin_not_configured",
        message: `${config.label} needs an OAuth app first. Add MERE_X_${config.provider.toUpperCase().replace(/-/g, "_")}_CLIENT_ID and _CLIENT_SECRET to .env.local, with ${redirectUri(req, pluginId)} as the redirect URL.`
      }
    });
  }

  const state = signState({ pluginId, user: req.user.id });
  const params = new URLSearchParams({
    client_id: credentials.clientId,
    redirect_uri: redirectUri(req, pluginId),
    response_type: "code",
    state,
    ...(config.authorizeParams || {})
  });
  if (config.scope) params.set("scope", config.scope);
  res.redirect(`${config.authorizeUrl}?${params}`);
}));

app.get("/api/plugins/:id/callback", asyncRoute(async (req, res) => {
  const pluginId = cleanText(req.params.id, 60);
  const config = PLUGIN_PROVIDERS[pluginId];
  const state = readState(req.query.state);
  res.type("html");

  if (!config || !state || state.pluginId !== pluginId || !req.query.code) {
    return res.status(400).send(closePopupPage({ ok: false, source: "mere-x-plugin", pluginId }));
  }

  try {
    const payload = await exchangeCode(pluginId, String(req.query.code), redirectUri(req, pluginId));
    const accessToken = config.tokenFromPayload ? config.tokenFromPayload(payload) : payload.access_token;
    if (!accessToken) throw new Error("No access token was returned.");

    const account = config.identityFromPayload
      ? config.identityFromPayload(payload)
      : await config.identity(accessToken).catch(() => `${config.label} account`);

    await saveConnection(state.user, pluginId, {
      account,
      scope: payload.scope || config.scope || "",
      accessToken,
      refreshToken: payload.refresh_token || "",
      expiresAt: payload.expires_in ? Date.now() + payload.expires_in * 1_000 : 0
    });
    res.send(closePopupPage({ ok: true, source: "mere-x-plugin", pluginId, account }));
  } catch (error) {
    res.status(502).send(closePopupPage({ ok: false, source: "mere-x-plugin", pluginId, message: error.message }));
  }
}));

app.delete("/api/plugins/:id", requireAccountAuth, asyncRoute(async (req, res) => {
  const pluginId = cleanText(req.params.id, 60);
  const removed = await forgetConnection(req.user.id, pluginId);
  res.status(removed ? 204 : 404).end();
}));

/* Only integrations that are both genuinely connected and switched on for
   this project may act, and every call they expose is read-only. */
async function pluginToolsFor(user, context) {
  if (!user) return [];
  const attached = (Array.isArray(context?.plugins) ? context.plugins : [])
    .map((plugin) => cleanText(typeof plugin === "string" ? plugin : plugin?.id, 60))
    .filter(Boolean);
  const connected = new Set(connectedPluginIds(user));
  const usable = attached.filter((id) => connected.has(id) && PLUGIN_PROVIDERS[id]);

  return usable.flatMap((pluginId) => toolsForPlugin(pluginId).map((tool) => ({
    pluginId,
    definition: {
      type: "function",
      name: tool.name,
      description: `${tool.description} (via the connected ${PLUGIN_PROVIDERS[pluginId].label} account)`,
      parameters: tool.parameters
    },
    async run(args) {
      const token = await accessTokenFor(user, pluginId);
      if (!token) return `The ${PLUGIN_PROVIDERS[pluginId].label} connection is no longer valid. Ask the person to reconnect it in Integrations.`;
      return tool.run(args, token);
    }
  })));
}

/* ------------------------------------------------------------
   read_url: a public page as readable text. Private networks and
   anything that is not http(s) are refused before a byte is sent.
   ------------------------------------------------------------ */
const PRIVATE_HOST = /^(localhost|127\.|10\.|0\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|\[::1\]|\[fc|\[fd|\[fe80)/i;

function htmlToText(html) {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr|\/pre)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .trim();
}

async function readUrl(rawUrl) {
  let url;
  try {
    url = new URL(String(rawUrl || "").trim());
  } catch {
    return "read_url needs a full http(s) URL.";
  }
  if (!/^https?:$/.test(url.protocol)) return "Only http and https URLs can be read.";
  if (PRIVATE_HOST.test(url.hostname)) return "Private and local addresses cannot be read.";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "MereXCode/1.0 (+https://merex.ai)", Accept: "text/html,text/plain,text/markdown,application/json;q=0.9,*/*;q=0.5" }
    });
    if (!response.ok) return `${url.hostname} answered ${response.status}.`;
    const type = String(response.headers.get("content-type") || "");
    if (!/text\/|json|xml|javascript|markdown/i.test(type)) return `${url.pathname.split("/").pop() || url.hostname} is ${type || "binary"}; only text can be read.`;
    const reader = response.body.getReader();
    const chunks = [];
    let bytes = 0;
    while (bytes < 2_000_000) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      bytes += value.length;
    }
    reader.cancel().catch(() => {});
    const raw = Buffer.concat(chunks).toString("utf8");
    const text = /html/i.test(type) ? htmlToText(raw) : raw;
    const cut = text.length > 24_000;
    return `${url.href}\n\n${text.slice(0, 24_000)}${cut ? "\n\n… truncated; ask for a more specific page if you need the rest" : ""}`;
  } catch (error) {
    return `Could not read ${url.hostname}: ${error.name === "AbortError" ? "timed out" : cleanText(error.message, 200)}`;
  } finally {
    clearTimeout(timer);
  }
}

const serverTools = { read_url: (args) => readUrl(args?.url) };

function writeEvent(res, value) {
  if (res.destroyed || res.writableEnded) return;
  res.write(`${JSON.stringify(value)}\n`);
}

/* One line per stage so the workspace can show what is happening while the
   model has not said anything yet. */
function writeStatus(res, stage, label, detail = "") {
  writeEvent(res, { type: "status", stage, label, detail: cleanText(detail, 240), at: Date.now() });
}

/* Proxies drop a connection that stays silent, and a hard problem can be
   silent for minutes. A ping every fifteen seconds is invisible to the reader
   and keeps the route open. */
function keepStreamAlive(res) {
  const timer = setInterval(() => {
    if (res.destroyed || res.writableEnded) { clearInterval(timer); return; }
    writeEvent(res, { type: "ping", at: Date.now() });
  }, 15_000);
  timer.unref?.();
  return () => clearInterval(timer);
}

/* Reasoning summaries are the only window into a long think. If the model
   refuses the option, the same request goes out once more without it. */
async function createResponseStream(client, params) {
  try {
    return await client.responses.create(params);
  } catch (error) {
    const message = String(error?.message || "");
    if (params.reasoning?.summary && /summary/i.test(message)) {
      const { summary, ...reasoning } = params.reasoning;
      return client.responses.create({ ...params, reasoning });
    }
    throw error;
  }
}

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    configured: Boolean(process.env.OPENAI_API_KEY),
    database: databaseConfigured(),
    payments: Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET),
    service: "Mere X"
  });
});

// Product APIs are account-only. Public health, authentication, payment setup,
// and OAuth callbacks are registered above this boundary.
app.use("/api", requireAuth, enforceApiKeyScope, recordDeveloperRequest);

app.get("/api/usage", asyncRoute(async (req, res) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.json(await usageSummary(req.user));
}));

/* Screenshots and reference documents attached to a prompt. */
app.post("/api/files", generationLimiter, upload.array("files", 8), asyncRoute(async (req, res) => {
  const client = openai();
  if (!req.files?.length) return res.status(400).json({ error: { code: "missing_files", message: "Choose at least one file." } });
  const uploaded = [];
  try {
    for (const file of req.files) {
      const name = cleanName(file.originalname);
      const remote = await client.files.create({ file: await toFile(file.buffer, name, { type: file.mimetype }), purpose: "user_data" });
      uploaded.push({ id: remote.id, name, size: remote.bytes ?? file.size, type: file.mimetype || "application/octet-stream", remote: true });
      if (req.user) {
        await query(
          `INSERT INTO user_files (user_id, external_id, name, mime_type, size_bytes, storage_key, metadata) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [req.user.id, remote.id, name, file.mimetype || "application/octet-stream", remote.bytes ?? file.size, remote.id, JSON.stringify({ provider: "openai", purpose: "user_data" })]
        );
      }
    }
    res.status(201).json({ files: uploaded });
  } catch (error) {
    await Promise.allSettled(uploaded.map((file) => client.files.delete(file.id)));
    throw error;
  }
}));

app.delete("/api/files/:id", generationLimiter, asyncRoute(async (req, res) => {
  const id = cleanText(req.params.id, 120);
  if (!/^file-[A-Za-z0-9_-]+$/.test(id)) return res.status(400).json({ error: { code: "invalid_file", message: "Invalid file identifier." } });
  if (req.user) {
    const owned = await query(`SELECT id FROM user_files WHERE user_id = $1 AND external_id = $2 LIMIT 1`, [req.user.id, id]);
    if (!owned.rowCount) return res.status(404).json({ error: { code: "missing_file", message: "That file does not belong to this account." } });
  }
  await openai().files.delete(id);
  if (req.user) await query(`DELETE FROM user_files WHERE user_id = $1 AND external_id = $2`, [req.user.id, id]);
  res.status(204).end();
}));

/* A sidebar full of truncated first prompts tells you nothing, so the model
   reads the opening exchange and names the thread the way a person would. */
app.post("/api/title", generationLimiter, asyncRoute(async (req, res) => {
  const client = openai();
  const messages = (Array.isArray(req.body?.messages) ? req.body.messages : []).slice(0, 4)
    .map((message) => ({ role: message?.role === "assistant" ? "assistant" : "user", text: cleanText(message?.text, 1_200) }))
    .filter((message) => message.text);
  if (!messages.length) return res.status(400).json({ error: { code: "missing_messages", message: "There is nothing to name yet." } });

  const transcript = messages.map((message) => `${message.role === "user" ? "User" : "Mere X"}: ${message.text}`).join("\n\n");
  const response = await client.responses.create({
    model: MODELS.Fast,
    instructions: "Name this coding thread the way an engineer would label it: what it is actually about, as a specific noun phrase of two to five words, in the language the user is using. No quotation marks, no closing punctuation, no filler words such as task, request, help, fix or question. Reply with the title and nothing else.",
    input: transcript,
    reasoning: { effort: "low" },
    max_output_tokens: 1_000,
    store: false
  });

  const title = cleanText(response.output_text, 120)
    .split("\n")[0]
    .replace(/^[\s"'‘’“”«»]+/, "")
    .replace(/[\s"'‘’“”«».]+$/, "");
  res.json({ title: title.slice(0, 60) });
}));

/* ------------------------------------------------------------
   The agent. One request is one model round: the client sends the
   whole exchange as Responses items, the model streams text and
   tool calls, and every completed output item is echoed back so the
   client can run the tools and continue with the next request.
   ------------------------------------------------------------ */
app.post("/api/agent", generationLimiter, asyncRoute(async (req, res) => {
  const client = openai();
  const items = normalizeItems(req.body?.items);
  if (!items.length) return res.status(400).json({ error: { code: "missing_items", message: "There is nothing to work on yet." } });

  const requestContext = req.body?.context && typeof req.body.context === "object" ? req.body.context : {};
  const access = resolveAgentAccess(req.user, requestContext);
  const mode = AGENT_MODES.includes(requestContext.mode) ? requestContext.mode : "agent";
  const profile = MODEL_PROFILES[access.model];
  const effort = access.effort;
  const newTurn = isNewTurn(items);

  if (newTurn) {
    await consumeUsage(req.user, "message", { model: access.model, effort, metadata: { mode } });
    const prompt = items[items.length - 1].content.filter((part) => part.type === "input_text").map((part) => part.text).join("\n");
    await moderate(client, prompt.slice(0, 20_000));
  }

  const pluginTools = await pluginToolsFor(req.user?.id, requestContext);
  const tools = [
    ...toolsForMode(mode, { web: requestContext.web === true, mcp: requestContext.mcp, nested: requestContext.nested === true, desktop: requestContext.desktop === true }),
    ...pluginTools.map((tool) => tool.definition)
  ];
  const safetyIdentifier = crypto.createHash("sha256").update(`mere-x:${req.user.id}`).digest("hex").slice(0, 64);

  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  const stopKeepAlive = keepStreamAlive(res);
  res.locals.mereXUsage = { model: profile.publicName };

  try {
    writeStatus(res, newTurn ? "received" : "continuing", newTurn ? "Starting" : "Continuing", `${profile.publicName} · ${effort}`);
    const input = [
      { type: "message", role: "user", content: [{ type: "input_text", text: projectContextText(requestContext) }] },
      ...items
    ];

    /* Plugin calls are answered here, on the server, with the person's token;
       everything else is answered by the browser in the next request. */
    let completed = null;
    let usage = null;
    for (let round = 0; round < 3; round += 1) {
      writeStatus(res, "thinking", round ? "Thinking again" : "Thinking", `${profile.publicName} · ${effort}`);
      let wroteText = false;
      const stream = await createResponseStream(client, {
        model: profile.model,
        input,
        instructions: agentInstructions({ modelName: profile.publicName, mode, context: requestContext }),
        reasoning: { effort: EFFORTS[effort], summary: EFFORTS[effort] === "none" ? undefined : "auto" },
        tools,
        tool_choice: tools.length ? "auto" : undefined,
        parallel_tool_calls: true,
        include: ["reasoning.encrypted_content"],
        max_output_tokens: OUTPUT_BUDGET[effort],
        safety_identifier: safetyIdentifier,
        store: false,
        stream: true
      });

      completed = null;
      for await (const event of stream) {
        if (res.destroyed || res.writableEnded) break;
        if (event.type === "response.output_text.delta") {
          if (!wroteText) { wroteText = true; writeStatus(res, "writing", "Writing"); }
          writeEvent(res, { type: "delta", delta: event.delta });
        } else if (event.type === "response.reasoning_summary_text.delta" && event.delta) {
          writeEvent(res, { type: "thought", delta: event.delta });
        } else if (event.type === "response.reasoning_summary_part.added") {
          writeEvent(res, { type: "thought", delta: "\n\n" });
        } else if (event.type === "response.output_item.added" && event.item?.type === "function_call") {
          writeEvent(res, { type: "call_start", name: cleanText(event.item.name, 80), call_id: event.item.call_id || "" });
        } else if (event.type === "response.function_call_arguments.delta" && event.delta) {
          writeEvent(res, { type: "call_delta", delta: event.delta, item_id: event.item_id || "" });
        } else if (event.type === "response.output_item.done" && event.item) {
          writeEvent(res, { type: "item", item: event.item });
        } else if (event.type === "response.web_search_call.searching" || event.type === "response.web_search_call.in_progress") {
          writeStatus(res, "search", "Searching the web");
        } else if (event.type === "response.web_search_call.completed") {
          writeStatus(res, "search-done", "Reading the results");
        } else if (event.type === "response.completed") {
          completed = event.response;
          usage = event.response?.usage || usage;
        } else if (event.type === "response.incomplete") {
          completed = event.response;
          usage = event.response?.usage || usage;
          writeEvent(res, { type: "incomplete", reason: cleanText(event.response?.incomplete_details?.reason, 80) });
        } else if (event.type === "error") {
          throw new Error(event.message || "Mere X response stream failed.");
        }
      }
      if (res.destroyed || res.writableEnded) break;

      const calls = (completed?.output || []).filter((item) => item.type === "function_call");
      const answeredHere = (call) => SERVER_TOOLS.includes(call.name) || pluginTools.some((tool) => tool.definition.name === call.name);
      const serverCalls = calls.filter(answeredHere);
      if (!serverCalls.length) break;

      const outputs = [];
      for (const call of serverCalls) {
        const tool = pluginTools.find((candidate) => candidate.definition.name === call.name);
        writeStatus(res, SERVER_TOOLS.includes(call.name) ? "read" : "plugin", SERVER_TOOLS.includes(call.name) ? "Reading a page" : `Calling ${cleanText(call.name, 80)}`);
        let output;
        try {
          const args = JSON.parse(call.arguments || "{}");
          output = String(tool ? await tool.run(args) : await serverTools[call.name](args));
        } catch (error) {
          output = `${call.name} failed: ${cleanText(error.message, 300)}`;
        }
        const outputItem = { type: "function_call_output", call_id: call.call_id, output };
        writeEvent(res, { type: "item", item: outputItem });
        outputs.push(outputItem);
      }
      /* A round that also asked the browser for something ends here; the
         browser answers its calls and sends everything back. */
      if (serverCalls.length !== calls.length) break;
      input.push(...(completed.output || []), ...outputs);
    }

    if (usage) {
      res.locals.mereXUsage.inputTokens = Number(usage.input_tokens || 0);
      res.locals.mereXUsage.outputTokens = Number(usage.output_tokens || 0);
    }
    const pending = (completed?.output || []).filter((item) => item.type === "function_call" && !SERVER_TOOLS.includes(item.name) && !pluginTools.some((tool) => tool.definition.name === item.name)).length;
    if (!res.destroyed && !res.writableEnded) writeEvent(res, { type: "done", model: profile.publicName, usage, pending });
    stopKeepAlive();
    res.end();
  } catch (error) {
    stopKeepAlive();
    const safe = publicError(error);
    const detail = String(error?.message || "");
    /* A misconfigured MCP server is the person's to fix; say which one. */
    if (/mcp/i.test(detail)) {
      const label = (detail.match(/server_label['"]?:?\s*['"]?([A-Za-z0-9_-]+)/) || [])[1];
      safe.code = "mcp_unreachable";
      safe.message = `An MCP server${label ? ` (${label})` : ""} could not be used: ${cleanText(detail.replace(/^\d+\s*/, ""), 240)}. Remove it in Integrations or check its URL and token.`;
    }
    console.error("Mere X agent turn failed:", error?.status || "", detail.slice(0, 300));
    writeEvent(res, { type: "error", error: { code: safe.code, message: safe.message } });
    res.end();
  }
}));

app.post("/api/embeddings", generationLimiter, asyncRoute(async (req, res) => {
  const input = Array.isArray(req.body?.input)
    ? req.body.input.slice(0, 100).map((value) => cleanText(value, 20_000)).filter(Boolean)
    : cleanText(req.body?.input, 20_000);
  if (!input || !input.length) return res.status(400).json({ error: { code: "missing_input", message: "Embedding input is required." } });
  const result = await openai().embeddings.create({ model: MODELS.embedding, input, encoding_format: "float" });
  res.json({ model: "Mere Atlas", data: result.data, usage: result.usage });
}));

app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "Each file must be 25 MB or smaller." : "The upload could not be accepted.";
    return res.status(400).json({ error: { code: error.code.toLowerCase(), message } });
  }
  sendError(res, error);
});

if (isProduction) {
  const dist = path.join(root, "dist");
  const workspaceDist = path.join(dist, "app");
  const landingDist = path.join(dist, "site");

  app.use("/app/assets", express.static(path.join(workspaceDist, "assets"), { index: false, immutable: true, maxAge: "1y" }));
  app.use("/app/icons", express.static(path.join(workspaceDist, "icons"), { index: false, immutable: true, maxAge: "1y" }));
  app.get("/app/manifest.webmanifest", (req, res) => {
    res.type("application/manifest+json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    res.sendFile(path.join(workspaceDist, "manifest.webmanifest"));
  });
  app.get("/app/sw.js", (req, res) => {
    res.type("application/javascript");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Service-Worker-Allowed", "/app/");
    res.sendFile(path.join(workspaceDist, "sw.js"));
  });
  app.get("/login", (req, res) => res.sendFile(path.join(workspaceDist, "index.html")));
  app.use("/app", requirePageAuth, express.static(workspaceDist, { index: false }));
  app.get(/^\/app(?:\/.*)?$/, requirePageAuth, (req, res) => res.sendFile(path.join(workspaceDist, "index.html")));
  app.get("/checkout", requirePageAuth, (req, res) => res.sendFile(path.join(workspaceDist, "pricing", "index.html")));
  app.get(/^\/console(?:\/.*)?$/, requirePageAuth, (req, res) => res.sendFile(path.join(landingDist, "index.html")));
  app.use("/assets", express.static(path.join(landingDist, "assets"), { index: false, immutable: true, maxAge: "1y" }));
  app.use("/brand", express.static(path.join(landingDist, "brand"), { index: false, maxAge: "7d" }));
  app.use(express.static(landingDist, { index: false }));
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    return res.sendFile(path.join(landingDist, "index.html"));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ root, server: { middlewareMode: true }, appType: "mpa" });
  app.use(vite.middlewares);
}

app.listen(port, () => {
  const status = process.env.OPENAI_API_KEY ? "AI configured" : "AI credentials required";
  console.log(`Mere X running at http://localhost:${port} (${status})`);
});
