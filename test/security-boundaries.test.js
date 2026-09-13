import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("workspace and console pages require an account session", async () => {
  const [server, auth] = await Promise.all([source("../server/index.js"), source("../server/auth.js")]);
  assert.match(server, /app\.use\("\/app", requirePageAuth/);
  assert.match(server, /app\.get\(\/\^\\\/console/);
  assert.match(server, /requirePageAuth, \(req, res\) => res\.sendFile/);
  assert.match(server, /app\.get\("\/checkout", requirePageAuth, \(req, res\) => res\.sendFile\(path\.join\(workspaceDist, "pricing", "index\.html"\)\)\)/);
  assert.match(auth, /\^\\\/checkout\(\?:\\\?\|\$\)\/\.test\(requested\)/);
});

test("ordinary sign-in cannot be hijacked by stale checkout intent", async () => {
  const [client, pricing] = await Promise.all([source("../src/js/app.js"), source("../src/js/pricing.js")]);
  assert.doesNotMatch(client, /localStorage\.getItem\("mere-x\.pending-plan"\)/);
  assert.doesNotMatch(pricing, /localStorage\.getItem\(PENDING_PLAN_KEY\)/);
  assert.match(client, /localStorage\.removeItem\("mere-x\.pending-plan"\)/);
  assert.match(pricing, /const requested = new URLSearchParams\(window\.location\.search\)\.get\("plan"\)/);
  assert.match(pricing, /\/login\?returnTo=\$\{encodeURIComponent\(returnTo\)\}/);
});

test("workspace sync persists queryable conversations and messages atomically", async () => {
  const [workspace, client, database] = await Promise.all([
    source("../server/workspace.js"),
    source("../src/js/app.js"),
    source("../server/database.js")
  ]);
  assert.match(workspace, /await transaction\(async \(run\) =>/);
  assert.match(workspace, /replaceWorkspaceRecords\(run, id, state\)/);
  assert.match(workspace, /insertRows\(run, "conversations"/);
  assert.match(workspace, /insertRows\(run, "messages"/);
  assert.match(client, /workspaceSyncInFlight/);
  assert.match(client, /pendingWorkspaceSync\.userId !== String\(currentUser\.id\)/);
  assert.match(database, /ER_LOCK_DEADLOCK/);
});

test("private APIs require authentication and API-key scopes", async () => {
  const [server, auth] = await Promise.all([source("../server/index.js"), source("../server/auth.js")]);
  assert.match(server, /app\.use\("\/api", requireAuth, enforceApiKeyScope, recordDeveloperRequest\)/);
  assert.match(auth, /WHERE k\.token_hash = \$1 AND k\.status = 'active'/);
  assert.match(auth, /code: "insufficient_scope"/);
  assert.match(auth, /req\.authMethod === "session"/);
});

test("optional plugin bootstrap cannot take down the public production site", async () => {
  const [server, connections] = await Promise.all([source("../server/index.js"), source("../server/plugin-connections.js")]);
  assert.match(server, /if \(databaseConfigured\(\)\) await initConnections\(\)/);
  assert.doesNotMatch(connections, /export async function initConnections\(\) \{\s*encryptionKey\(\)/);
});

test("live voice uses the authenticated server-side WebRTC handshake", async () => {
  const [client, server] = await Promise.all([source("../src/js/app.js"), source("../server/index.js")]);
  assert.match(client, /new RTCPeerConnection\(\)/);
  assert.match(client, /fetch\("\/api\/realtime\/session"/);
  assert.doesNotMatch(client, /api\.openai\.com/);
  assert.match(server, /openai\(\)\.realtime\.calls\.create\(\{ sdp, session: sessionConfig \}/);
  assert.doesNotMatch(server, /form\.set\("sdp", sdp\)/);
  assert.match(server, /res\.type\("application\/sdp"\)\.send\(answer\)/);
});

test("guest access and seeded console data are absent", async () => {
  const [html, client, store, dashboard, usage, logs] = await Promise.all([
    source("../index.html"),
    source("../src/js/app.js"),
    source("../landing/src/lib/store.js"),
    source("../landing/src/console/dashboard.js"),
    source("../landing/src/console/usage.js"),
    source("../landing/src/console/logs.js")
  ]);
  assert.doesNotMatch(`${html}\n${client}`, /guest|explore without/i);
  assert.doesNotMatch(`${store}\n${dashboard}\n${usage}\n${logs}`, /Math\.random|seeded\(|Meridian|Alex Morgan|credit balance/i);
});
