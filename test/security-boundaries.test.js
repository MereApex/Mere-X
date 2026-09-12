import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("workspace and console pages require an account session", async () => {
  const server = await source("../server/index.js");
  assert.match(server, /app\.use\("\/app", requirePageAuth/);
  assert.match(server, /app\.get\(\/\^\\\/console/);
  assert.match(server, /requirePageAuth, \(req, res\) => res\.sendFile/);
  assert.match(server, /app\.get\("\/checkout", requirePageAuth, \(req, res\) => res\.sendFile\(path\.join\(workspaceDist, "pricing", "index\.html"\)\)\)/);
});

test("private APIs require authentication and API-key scopes", async () => {
  const [server, auth] = await Promise.all([source("../server/index.js"), source("../server/auth.js")]);
  assert.match(server, /app\.use\("\/api", requireAuth, enforceApiKeyScope, recordDeveloperRequest\)/);
  assert.match(auth, /WHERE k\.token_hash = \$1 AND k\.status = 'active'/);
  assert.match(auth, /code: "insufficient_scope"/);
  assert.match(auth, /req\.authMethod === "session"/);
});

test("live voice uses the authenticated server-side WebRTC handshake", async () => {
  const [client, server] = await Promise.all([source("../src/js/app.js"), source("../server/index.js")]);
  assert.match(client, /new RTCPeerConnection\(\)/);
  assert.match(client, /fetch\("\/api\/realtime\/session"/);
  assert.doesNotMatch(client, /api\.openai\.com/);
  assert.match(server, /fetch\("https:\/\/api\.openai\.com\/v1\/realtime\/calls"/);
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
