/* ============================================================
   STORE — authenticated developer-console state.
   The database-backed control plane is the source of truth.
   ============================================================ */

const listeners = new Set();

const DEFAULT_STATE = Object.freeze({
  org: { name: "Mere Code", id: "", plan: "Free", created: Date.now(), region: "global", seats: 1 },
  user: { name: "Member", email: "", role: "Owner" },
  keys: [],
  webhooks: [],
  webhookDeliveries: [],
  members: [],
  audit: [],
  billing: {
    creditsUsd: 0,
    autoReload: false,
    reloadThresholdUsd: 0,
    reloadAmountUsd: 0,
    monthlyLimitUsd: 0,
    alertAtPct: 0.8,
    paymentMethod: null,
    invoices: []
  },
  limits: { tier: "Free", rpm: 90, generationRpm: 20, authAttemptsPer15m: 30, paymentRpm: 30 },
  onboarding: { key: false, request: false, streaming: false, tools: false, production: false },
  settings: {
    defaultModel: "mere-nyx-2",
    logRetentionDays: 30,
    zeroRetention: false,
    promptCaching: true,
    requireSso: false,
    ipAllowlist: ""
  },
  usage90: [],
  logs: []
});

let state = structuredClone(DEFAULT_STATE);
let hydration = null;
let hydratedAt = 0;

function notify() {
  listeners.forEach((listener) => listener(state));
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, options);
  if (response.ok) return response.status === 204 ? null : response.json();
  if (response.status === 401) {
    const returnTo = location.pathname + location.search;
    location.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    throw new Error("Sign in to continue.");
  }
  let payload = null;
  try { payload = await response.json(); } catch { /* use the status fallback */ }
  throw new Error(payload?.error?.message || `Request failed (${response.status})`);
}

function replaceState(next) {
  state = { ...structuredClone(DEFAULT_STATE), ...(next || {}) };
  notify();
  return state;
}

export async function hydrateConsole(force = false) {
  if (!force && hydratedAt && Date.now() - hydratedAt < 30_000) return state;
  if (hydration && !force) return hydration;
  hydration = apiJson("/api/console")
    .then((result) => {
      hydratedAt = Date.now();
      return replaceState(result.state);
    })
    .finally(() => { hydration = null; });
  return hydration;
}

export function getState() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function update(mutator) {
  mutator(state);
  notify();
  return state;
}

/* ---- Derived selectors --------------------------------- */

export function usageWindow(days = 30) {
  return state.usage90.slice(Math.max(0, state.usage90.length - days));
}

export function usageTotals(days = 30) {
  const rows = usageWindow(days);
  const totals = rows.reduce(
    (acc, row) => {
      acc.input += Number(row.input || 0);
      acc.output += Number(row.output || 0);
      acc.requests += Number(row.requests || 0);
      acc.errors += Number(row.errors || 0);
      acc.latency += Number(row.latency || 0);
      acc.cost += Number(row.cost || 0);
      return acc;
    },
    { input: 0, output: 0, requests: 0, errors: 0, latency: 0, cost: 0 }
  );
  totals.tokens = totals.input + totals.output;
  totals.avgLatency = Math.round(totals.latency / Math.max(1, rows.filter((row) => row.requests).length));
  totals.errorRate = totals.errors / Math.max(1, totals.requests);
  return totals;
}

export function spendByModel(days = 30) {
  const cutoff = Date.now() - days * 86_400_000;
  const grouped = new Map();
  state.logs.filter((row) => row.at >= cutoff).forEach((row) => {
    const name = row.model || "Mere X";
    const current = grouped.get(name) || { model: name, input: 0, output: 0, tokens: 0, cost: 0 };
    current.input += Number(row.input || 0);
    current.output += Number(row.output || 0);
    current.tokens = current.input + current.output;
    grouped.set(name, current);
  });
  const totalCost = usageWindow(days).reduce((sum, row) => sum + Number(row.cost || 0), 0);
  const totalTokens = [...grouped.values()].reduce((sum, row) => sum + row.tokens, 0);
  grouped.forEach((row) => { row.cost = totalTokens ? totalCost * (row.tokens / totalTokens) : 0; });
  return [...grouped.values()].sort((a, b) => b.cost - a.cost);
}

export function trendDelta(days = 30) {
  const current = state.usage90.slice(-days);
  const previous = state.usage90.slice(-days * 2, -days);
  const sum = (rows) => rows.reduce((total, row) => total + Number(row.input || 0) + Number(row.output || 0), 0);
  const now = sum(current);
  const before = sum(previous);
  return before ? (now - before) / before : 0;
}

/* ---- Database-backed mutations ------------------------- */

export async function createKey(input) {
  const result = await apiJson("/api/console/keys", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  update((current) => {
    current.keys.unshift(result.key);
    current.onboarding.key = true;
  });
  return result.key;
}

export async function revokeKey(id) {
  const result = await apiJson(`/api/console/keys/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "revoked" })
  });
  update((current) => {
    const index = current.keys.findIndex((key) => key.id === id);
    if (index >= 0) current.keys[index] = result.key;
  });
}

export async function renameKey(id, name) {
  const result = await apiJson(`/api/console/keys/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name })
  });
  update((current) => {
    const index = current.keys.findIndex((key) => key.id === id);
    if (index >= 0) current.keys[index] = result.key;
  });
}

export async function deleteKey(id) {
  await apiJson(`/api/console/keys/${encodeURIComponent(id)}`, { method: "DELETE" });
  update((current) => { current.keys = current.keys.filter((key) => key.id !== id); });
}

export async function addWebhook(url, events) {
  const result = await apiJson("/api/console/webhooks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, events })
  });
  update((current) => { current.webhooks.unshift(result.webhook); });
  return result.webhook;
}

export async function removeWebhook(id) {
  await apiJson(`/api/console/webhooks/${encodeURIComponent(id)}`, { method: "DELETE" });
  update((current) => { current.webhooks = current.webhooks.filter((webhook) => webhook.id !== id); });
}

async function savePreference(category, field, value) {
  update((current) => { current[category][field] = value; });
  try {
    const result = await apiJson(`/api/console/preferences/${category}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value })
    });
    update((current) => { current[category] = { ...current[category], ...result[category] }; });
  } catch (error) {
    await hydrateConsole(true).catch(() => {});
    throw error;
  }
}

export function setSetting(field, value) {
  return savePreference("settings", field, value);
}

export function setBilling(field, value) {
  return savePreference("billing", field, value);
}

export function completeStep(step) {
  if (!Object.prototype.hasOwnProperty.call(state.onboarding, step) || state.onboarding[step]) return Promise.resolve();
  return savePreference("onboarding", step, true);
}

export function fullKeyString(key) {
  return key.secret || "";
}

export function maskedKeyString(key) {
  return `${key.prefix}-${"•".repeat(24)}${key.lastFour || ""}`;
}
