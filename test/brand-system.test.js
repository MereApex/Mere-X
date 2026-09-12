import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const paths = {
  workspace: new URL("../src/assets/mere-x-logo.png", import.meta.url),
  landing: new URL("../landing/public/brand/mere-x-mark.png", import.meta.url),
  favicon: new URL("../landing/public/brand/favicon.png", import.meta.url)
};

test("every Mere X surface uses the same transparent master mark", async () => {
  const [workspace, landing, favicon] = await Promise.all(Object.values(paths).map((path) => readFile(path)));

  assert.deepEqual(landing, workspace);
  assert.deepEqual(favicon, workspace);
  assert.equal(workspace.subarray(1, 4).toString(), "PNG");
  assert.equal(workspace.readUInt32BE(16), 1536);
  assert.equal(workspace.readUInt32BE(20), 1024);
  assert.equal(workspace[24], 8, "the master must remain an 8-bit image");
  assert.equal(workspace[25], 6, "the master must retain an RGBA alpha channel");
});

test("landing and workspace retain the folding intro and seamless final layer", async () => {
  const [orb, landingStyles, workspacePage, workspaceStyles, app] = await Promise.all([
    readFile(new URL("../landing/src/components/orb.js", import.meta.url), "utf8"),
    readFile(new URL("../landing/src/styles/site.css", import.meta.url), "utf8"),
    readFile(new URL("../index.html", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/app.css", import.meta.url), "utf8"),
    readFile(new URL("../src/js/app.js", import.meta.url), "utf8")
  ]);

  assert.equal((orb.match(/class="mx-slice /g) || []).length, 4);
  assert.match(orb, /class="mx-mark-master"/);
  assert.match(landingStyles, /\[data-theme="dark"\] \.mx-mark-master \{ filter: invert\(1\); \}/);
  assert.equal((workspacePage.match(/class="hero-logo-piece /g) || []).length, 4);
  assert.match(workspacePage, /class="hero-logo-master"/);
  assert.match(workspaceStyles, /@keyframes workspaceMasterIn/);
  assert.match(workspaceStyles, /html\[data-theme="dark"\] img\[src\*="mere-x-logo"\]/);
  assert.match(app, /function restartBrandIntro\(\)/);
});
