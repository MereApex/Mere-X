import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  workspace: new URL("../src/assets/mere-x-logo-web.png", import.meta.url),
  landing: new URL("../landing/public/brand/mere-x-mark-web.png", import.meta.url),
  favicon: new URL("../landing/public/brand/favicon-96.png", import.meta.url)
};

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("every Mere X surface uses the same transparent master mark", async () => {
  const [workspace, landing, favicon] = await Promise.all(Object.values(paths).map((path) => readFile(path)));

  assert.deepEqual(landing, workspace);
  assert.equal(workspace.subarray(1, 4).toString(), "PNG");
  assert.equal(favicon.subarray(1, 4).toString(), "PNG");
  assert.equal(workspace.readUInt32BE(16), 960);
  assert.equal(workspace.readUInt32BE(20), 640);
  assert.equal(workspace[24], 8, "the master must remain an 8-bit image");
  assert.equal(workspace[25], 6, "the master must retain an RGBA alpha channel");
  assert.ok(workspace.length < 600_000, "the shared web logo should stay lightweight");
  assert.ok(favicon.length < 32_000, "the favicon should not download the full master artwork");
});

test("the brand reads as the Orbitron wordmark on every surface", async () => {
  const [workspacePage, workspaceStyles, landingNav, landingFooter] = await Promise.all([
    source("../index.html"),
    source("../src/styles/app.css"),
    source("../landing/src/components/nav.js"),
    source("../landing/src/components/footer.js")
  ]);

  assert.doesNotMatch(workspacePage, /hero-ribbon-panel|hero-logo-master|hero-mark/);
  assert.match(workspacePage, /class="app-boot-mark">MERE X</);
  assert.match(workspaceStyles, /\.brand-name \{[^}]*font-family: var\(--font-display\)/);
  for (const style of [workspaceStyles]) assert.match(style, /content: "˚"/);

  for (const markup of [landingNav, landingFooter]) {
    assert.match(markup, /<span>MERE X<\/span><span class="brand-deg"/);
  }
});

test("both surfaces ship one monochrome dark theme and no theme switch", async () => {
  const [workspaceStyles, workspaceScript, workspacePage, tokens, landingPage] = await Promise.all([
    source("../src/styles/app.css"),
    source("../src/js/app.js"),
    source("../index.html"),
    source("../landing/src/styles/tokens.css"),
    source("../landing/index.html")
  ]);

  assert.doesNotMatch(workspaceStyles, /data-theme/);
  assert.doesNotMatch(workspaceScript, /applyTheme|themePreference|data-theme-option/);
  assert.doesNotMatch(workspacePage, /data-theme|theme-picker/);
  assert.doesNotMatch(landingPage, /data-theme/);
  assert.match(workspaceStyles, /--bg-1: #0a0a0a;/);
  assert.match(workspaceStyles, /--ink: #f5f5f5;/);
  assert.match(workspaceStyles, /color-scheme: dark;/);
  assert.match(tokens, /--paper:\s+#0a0a0a;/);
  assert.match(tokens, /--ink:\s+#f5f5f5;/);
  assert.match(tokens, /color-scheme: dark;/);
  // Monochrome means no colour accents anywhere in the tokens.
  assert.doesNotMatch(tokens, /#(?:15803d|b45309|b91c1c|475569|64748b)/);
});

test("an authenticated visitor never sees the sign-in screen flash", async () => {
  const [workspacePage, workspaceStyles, workspaceScript] = await Promise.all([
    source("../index.html"),
    source("../src/styles/app.css"),
    source("../src/js/app.js")
  ]);

  assert.match(workspacePage, /<html lang="en" class="app-booting">/);
  assert.doesNotMatch(workspacePage, /<html[^>]*class="[^"]*auth-open/);
  assert.match(workspaceStyles, /\.app-booting \.auth-screen \{ display: none !important; \}/);
  assert.match(workspaceScript, /classList\.remove\("auth-open", "app-booting"\)/);
  assert.match(workspaceScript, /function showAuthScreen\(\)/);
});

test("the workspace is a conversation with a code agent, not an IDE", async () => {
  const [workspacePage, workspaceScript] = await Promise.all([
    source("../index.html"),
    source("../src/js/app.js")
  ]);

  for (const id of ["sidebar", "threadList", "thread", "composerForm", "promptInput", "changesPanel", "previewPane", "fileModal", "commandMenu", "mentionMenu", "paletteModal"]) {
    assert.match(workspacePage, new RegExp(`id="${id}"`), `missing #${id}`);
  }
  assert.match(workspacePage, /data-mode="agent"[\s\S]*data-mode="plan"[\s\S]*data-mode="ask"/);
  assert.match(workspacePage, /<span>Fast<\/span><span>Medium<\/span><span>High<\/span><span>Extra High<\/span>/);
  assert.match(workspacePage, /Mere 4.2 Peak[\s\S]*Mere 4.2 Core[\s\S]*Mere 4.0 Lite/);

  // No editor, file tree or terminal: the agent does the editing and the thread shows it.
  assert.doesNotMatch(workspacePage, /id="(fileTree|editorHost|editorReview|terminal|statusBar)"/);
  assert.doesNotMatch(workspaceScript, /@codemirror|from "\.\/editor\.js"/);
  assert.match(workspaceScript, /function openFileViewer\(path, line = 0\)/);
  assert.match(workspaceScript, /function openDiff\(path/);

  // Everything that was not about code is gone from the product.
  assert.doesNotMatch(workspacePage, /voice-stage|imageViewer|dictateButton|data-tool="Images"|Deep research|Canvas/);
  assert.doesNotMatch(workspaceScript, /createImage|startRealtimeVoice|speakMessage|RTCPeerConnection|automation/i);
  assert.doesNotMatch(workspacePage, /Mere \w+ 5\.5|Mere X 5\.5/);
  assert.doesNotMatch(workspaceScript, /Mere \w+ 5\.5|"DEEP"/);
});

test("the command menu and the mention menu share one keyboard model", async () => {
  const workspaceScript = await source("../src/js/app.js");
  assert.match(workspaceScript, /function commandItems\(query\)/);
  assert.match(workspaceScript, /function openMentionMenu\(info\)/);
  assert.match(workspaceScript, /function chooseMenu\(/);
  const ids = [...workspaceScript.matchAll(/\{ id: "([a-z-]+)", label: "/g)].map((match) => match[1]);
  assert.ok(ids.length >= 18, `expected a full registry, found ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length, "command ids must be unique");
  for (const required of ["new", "agent", "plan", "ask", "model", "effort", "open", "changes", "settings"]) {
    assert.ok(ids.includes(required), `missing /${required}`);
  }
  const leaves = [...workspaceScript.matchAll(/\{ id: "[a-z-]+", label: [^\n]*?\}(?= ?,?\n)/g)].map((match) => match[0]);
  const inert = leaves.filter((entry) => !/run:|children:/.test(entry));
  assert.equal(inert.length, 0, `commands with no behaviour: ${inert.join(" | ")}`);
});

test("the models carry distinct generations everywhere the public sees them", async () => {
  const [server, models, site, workspacePage] = await Promise.all([
    source("../server/index.js"),
    source("../landing/src/data/models.js"),
    source("../landing/src/data/site.js"),
    source("../index.html")
  ]);
  for (const text of [server, models, site, workspacePage]) {
    assert.match(text, /Mere 4.2 Peak/);
    assert.match(text, /Mere 4.2 Core/);
    assert.match(text, /Mere 4.0 Lite/);
    assert.doesNotMatch(text, /Max 5\.5|Core 5\.5|Lite 5\.5|Mere X 5\.5/);
  }
  assert.match(models, /id: "mere-4-2-peak"/);
  assert.doesNotMatch(models, /mere-iris|mere-lyra/);
});
