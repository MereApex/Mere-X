import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  workspace: new URL("../src/assets/mere-x-logo-web.png", import.meta.url),
  landing: new URL("../landing/public/brand/mere-x-mark-web.png", import.meta.url),
  favicon: new URL("../landing/public/brand/favicon-96.png", import.meta.url)
};

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

test("the brand reads as the Orbitron wordmark, not a dimensional emblem", async () => {
  const [workspacePage, workspaceStyles, landingNav, landingFooter] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/app.css", import.meta.url), "utf8"),
    readFile(new URL("../landing/src/components/nav.js", import.meta.url), "utf8"),
    readFile(new URL("../landing/src/components/footer.js", import.meta.url), "utf8")
  ]);

  // The cinematic ribbon intro and the oversized mark above the composer were
  // both retired; the wordmark carries the brand on every surface now.
  assert.doesNotMatch(workspacePage, /hero-ribbon-panel|hero-logo-master|hero-mark/);
  assert.doesNotMatch(workspaceStyles, /hero-mark|hero-logo-motion/);
  assert.match(workspacePage, /class="app-boot-mark">MERE X</);
  assert.match(workspaceStyles, /\.brand-name \{[^}]*font-family: var\(--font-display\)/);

  for (const source of [landingNav, landingFooter]) {
    assert.match(source, /<span>MERE X<\/span><span class="brand-deg"/);
  }
});

test("the workspace ships one white theme and no theme switch", async () => {
  const [workspacePage, workspaceStyles, workspaceScript] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/app.css", import.meta.url), "utf8"),
    readFile(new URL("../src/js/app.js", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(workspaceStyles, /data-theme/);
  assert.doesNotMatch(workspaceScript, /applyTheme|themePreference|data-theme-option/);
  assert.doesNotMatch(workspacePage, /data-theme|theme-picker/);
  assert.match(workspaceStyles, /--ink: #000000;/);
  assert.match(workspaceStyles, /--cream-0: #ffffff;/);
});

test("an authenticated visitor never sees the sign-in screen flash", async () => {
  const [workspacePage, workspaceStyles, workspaceScript] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/app.css", import.meta.url), "utf8"),
    readFile(new URL("../src/js/app.js", import.meta.url), "utf8")
  ]);

  // The document boots into a neutral splash; only the session lookup decides
  // whether sign-in or the workspace is revealed.
  assert.match(workspacePage, /<html lang="en" class="app-booting">/);
  assert.doesNotMatch(workspacePage, /<html[^>]*class="[^"]*auth-open/);
  assert.match(workspaceStyles, /\.app-booting \.auth-screen \{ display: none !important; \}/);
  assert.match(workspaceScript, /classList\.remove\("auth-open", "app-booting"\)/);
  assert.match(workspaceScript, /function showAuthScreen\(\)/);
});

test("one command registry serves both the + button and the / palette", async () => {
  const [workspacePage, workspaceScript] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/js/app.js", import.meta.url), "utf8")
  ]);

  assert.match(workspacePage, /id="commandMenu"/);
  assert.match(workspacePage, /placeholder="Ask Mere X, or type \/ for commands"/);
  assert.doesNotMatch(workspacePage, /id="attachmentPopover"/);
  assert.match(workspaceScript, /function commandGroups\(\)/);
  assert.match(workspaceScript, /function handleCommandKeydown\(event\)/);
  // "+" must open the same menu rather than a popover of its own.
  assert.match(workspaceScript, /attachmentButton\.addEventListener\("click"[\s\S]{0,220}openCommandMenu\("plus"\)/);

  // Entries are written inline, or spread over lines when they carry a submenu.
  const ids = [...workspaceScript.matchAll(/\bid: "([a-z-]+)",\s*\n?\s*label: "/g)].map((match) => match[1]);
  assert.ok(ids.length >= 35, `expected a full registry, found ${ids.length}`);
  assert.equal(new Set(ids).size, ids.length, "command ids must be unique — rows are matched by them");
  for (const required of ["image", "research", "voice", "settings", "new", "model", "effort"]) {
    assert.ok(ids.includes(required), `missing /${required}`);
  }

  // Every leaf command has to do something real.
  const leaves = [...workspaceScript.matchAll(/\{ id: "[a-z-]+", label: "[^"]+", hint: [^}]*?\}/g)].map((m) => m[0]);
  const inert = leaves.filter((entry) => !/run:|tool:|children:/.test(entry));
  assert.equal(inert.length, 0, `commands with no behaviour: ${inert.join(" | ")}`);
});

test("the voice stage is ink, bracketed, and unbranded", async () => {
  const [workspacePage, workspaceStyles] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/app.css", import.meta.url), "utf8")
  ]);

  assert.doesNotMatch(workspacePage, /voice-orb|mere-x-logo-web\.png" alt="" \/><\/span>\s*<\/div>/);
  assert.doesNotMatch(workspaceStyles, /voice-orb|voice-stage-atmosphere/);
  assert.match(workspacePage, /class="voice-corner voice-corner-tl"/);
  assert.match(workspaceStyles, /\.voice-stage \{[^}]*background: var\(--ink\)/);
});
