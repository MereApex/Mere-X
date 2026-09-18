import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("workspace pages require an account session", async () => {
  const [server, auth] = await Promise.all([source("../server/index.js"), source("../server/auth.js")]);
  assert.match(server, /app\.use\("\/app", requirePageAuth/);
  assert.match(server, /requirePageAuth, \(req, res\) => res\.sendFile/);
  assert.match(server, /app\.get\("\/checkout", requirePageAuth, \(req, res\) => res\.sendFile\(path\.join\(workspaceDist, "pricing", "index\.html"\)\)\)/);
  assert.match(server, /app\.get\("\/app\/manifest\.webmanifest"/);
  assert.match(server, /app\.get\("\/app\/sw\.js"/);
  assert.match(server, /Service-Worker-Allowed/);
  assert.match(auth, /\^\\\/checkout\(\?:\\\?\|\$\)\/\.test\(requested\)/);
});

test("ordinary sign-in cannot be hijacked by stale checkout intent", async () => {
  const [client, pricing] = await Promise.all([source("../src/js/app.js"), source("../src/js/pricing.js")]);
  assert.doesNotMatch(client, /localStorage\.getItem\("mere-x\.pending-plan"\)/);
  assert.doesNotMatch(pricing, /localStorage\.getItem\(PENDING_PLAN_KEY\)/);
  assert.match(client, /localStorage\.removeItem\("mere-x\.pending-plan"\)/);
  assert.match(pricing, /const requested = new URLSearchParams\(window\.location\.search\)\.get\("plan"\)/);
  assert.match(pricing, /\/login\?returnTo=\$\{encodeURIComponent\(returnTo\)\}/);
  assert.match(client, /workspaceMutationVersion !== ifUnchangedSince/);
});

test("Google identity loads in parallel with the account session", async () => {
  const client = await source("../src/js/app.js");
  const preload = client.indexOf("const googleIdentity = loadGoogleIdentity()");
  const session = client.indexOf('apiJson("/api/auth/session")');
  assert.ok(preload >= 0 && session > preload);
  assert.match(client, /Math\.min\(360, availableWidth\)/);
});

test("workspace sync persists queryable threads and messages atomically", async () => {
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

test("private APIs are account-session only", async () => {
  const [server, auth] = await Promise.all([source("../server/index.js"), source("../server/auth.js")]);
  assert.match(server, /app\.use\("\/api", requireAuth\)/);
  /* Sessions are the only credential: no developer keys, no scopes. */
  assert.doesNotMatch(auth, /developer_api_keys|apiKeyScopes|enforceApiKeyScope|insufficient_scope/);
  assert.match(auth, /sessionTokenFromRequest/);
});

test("optional integration bootstrap cannot take down the public production site", async () => {
  const [server, connections, providers] = await Promise.all([
    source("../server/index.js"),
    source("../server/plugin-connections.js"),
    source("../server/plugin-providers.js")
  ]);
  assert.match(server, /if \(databaseConfigured\(\)\) await initConnections\(\)/);
  assert.doesNotMatch(connections, /export async function initConnections\(\) \{\s*encryptionKey\(\)/);
  // Only services around a codebase remain connectable.
  assert.match(providers, /github: \{/);
  assert.match(providers, /linear: \{/);
  assert.match(providers, /figma: \{/);
  assert.doesNotMatch(providers, /gmail|google-calendar|google-drive|slack|notion/);
});

test("the agent route runs tools in the browser and never trusts the echoed exchange", async () => {
  const [server, agent, client, tools] = await Promise.all([
    source("../server/index.js"),
    source("../server/agent.js"),
    source("../src/js/agent.js"),
    source("../src/js/agent-tools.js")
  ]);
  assert.match(server, /app\.post\("\/api\/agent"/);
  assert.match(server, /normalizeItems\(req\.body\?\.items\)/);
  assert.match(server, /include: \["reasoning\.encrypted_content"\]/);
  assert.match(server, /store: false/);
  assert.match(server, /Fast: "none", Medium: "medium", High: "high", "Extra High": "xhigh"/);
  assert.match(agent, /if \(!TOOL_NAMES\.includes\(name\)/);
  assert.match(agent, /clean\(item\.output, MAX_OUTPUT\)/);
  assert.match(client, /fetch\("\/api\/agent"|streamAgentRound/);
  assert.match(tools, /new Worker\(url\)/);
  assert.match(tools, /self\.fetch = undefined/);
  // Everything that left the product left the server too.
  assert.doesNotMatch(server, /images\.generate|audio\.speech|transcriptions|realtime|live\.create|code_interpreter/);
});

test("plan limits and model access are server enforced", async () => {
  const [server, entitlements, database] = await Promise.all([
    source("../server/index.js"),
    source("../server/entitlements.js"),
    source("../server/database.js")
  ]);
  assert.match(server, /resolveAgentAccess\(req\.user, requestContext\)/);
  assert.match(server, /consumeUsage\(req\.user, "message"/);
  assert.match(entitlements, /SELECT id FROM users WHERE id = \$1 FOR UPDATE/);
  assert.match(entitlements, /EFFORT_KEYS = Object\.freeze\(\["Fast", "Medium", "High", "Extra High"\]\)/);
  assert.match(database, /CREATE TABLE IF NOT EXISTS usage_events/);
});

test("guest access is absent", async () => {
  const [html, client] = await Promise.all([
    source("../index.html"),
    source("../src/js/app.js")
  ]);
  assert.doesNotMatch(`${html}\n${client}`, /guest|explore without/i);
});

test("the developer API, its SDKs and the console are gone", async () => {
  const [main, site, nav, server, search] = await Promise.all([
    source("../landing/src/main.js"),
    source("../landing/src/data/site.js"),
    source("../landing/src/components/nav.js"),
    source("../server/index.js"),
    source("../landing/src/pages/search.js")
  ]);
  /* No routes, no links, no server surface. */
  assert.doesNotMatch(`${main}\n${site}\n${nav}\n${search}`, /\/console|\/docs|\/products\/api/);
  assert.doesNotMatch(server, /api\/console|createConsoleRouter|api\/embeddings/);
  for (const gone of ["landing/src/console", "landing/src/pages/docs.js", "landing/src/data/docs.js",
                      "landing/src/pages/products/api.js", "landing/src/lib/store.js", "server/console.js"]) {
    assert.equal(existsSync(new URL(`../${gone}`, import.meta.url)), false, `${gone} should be deleted`);
  }
});
