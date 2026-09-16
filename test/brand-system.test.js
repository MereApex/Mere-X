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

test("the composer offers slash commands that route to real capabilities", async () => {
  const [workspacePage, workspaceScript] = await Promise.all([
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/js/app.js", import.meta.url), "utf8")
  ]);

  assert.match(workspacePage, /id="slashMenu"/);
  assert.match(workspacePage, /placeholder="Ask Mere X, or type \/ for commands"/);
  assert.match(workspaceScript, /const SLASH_COMMANDS = \[/);
  assert.match(workspaceScript, /function handleSlashKeydown\(event\)/);

  // Every command has to be reachable by name and do something real.
  const names = [...workspaceScript.matchAll(/\{ name: "([a-z-]+)", label: "/g)].map((match) => match[1]);
  assert.ok(names.length >= 20, `expected a full palette, found ${names.length}`);
  assert.equal(new Set(names).size, names.length, "slash command names must be unique");
  for (const required of ["image", "research", "voice", "settings", "new"]) {
    assert.ok(names.includes(required), `missing /${required}`);
  }
});
