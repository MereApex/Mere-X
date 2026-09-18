import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("a stale lazy route can never repaint over the latest navigation", async () => {
  const previous = {
    location: globalThis.location,
    history: globalThis.history,
    document: globalThis.document,
    window: globalThis.window,
    requestAnimationFrame: globalThis.requestAnimationFrame
  };

  const listeners = new Map();
  const location = {
    origin: "https://merex.ai",
    href: "https://merex.ai/slow",
    pathname: "/slow",
    search: "",
    hash: ""
  };
  const setLocation = (value) => {
    const url = new URL(value, location.origin);
    location.href = url.href;
    location.pathname = url.pathname;
    location.search = url.search;
    location.hash = url.hash;
  };
  const outlet = {
    classList: { add() {}, remove() {} },
    setAttribute() {},
    replaceChildren(node) { this.firstElementChild = node; },
    firstElementChild: null
  };

  globalThis.location = location;
  globalThis.history = {
    state: null,
    pushState(_state, _title, value) { setLocation(value); },
    replaceState(_state, _title, value) { setLocation(value); }
  };
  globalThis.document = {
    title: "",
    documentElement: { style: {} },
    head: { append() {} },
    addEventListener(type, listener) { listeners.set(type, listener); },
    querySelector() { return null; },
    getElementById() { return null; },
    createElement() { return { className: "", innerHTML: "" }; }
  };
  globalThis.window = { addEventListener() {}, scrollTo() {} };
  globalThis.requestAnimationFrame = (callback) => { queueMicrotask(() => callback(performance.now())); return 1; };

  let releaseSlow;
  const slow = new Promise((resolve) => { releaseSlow = resolve; });

  try {
    const router = await import(`../landing/src/lib/router.js?race=${Date.now()}`);
    router.route("/slow", () => slow);
    router.route("/fast", async () => ({ title: "Fast", render: () => "fast" }));
    router.start({ mount: outlet, progress: null });
    router.navigate("/fast");
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(router.currentRoute(), "/fast");
    assert.equal(outlet.firstElementChild?.innerHTML, "fast");

    releaseSlow({ title: "Slow", render: () => "slow" });
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(router.currentRoute(), "/fast");
    assert.equal(outlet.firstElementChild?.innerHTML, "fast");
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("navigation lifecycle is cancellable and leaves no stale listeners", async () => {
  const [router, main, home, search, reasoning] = await Promise.all([
    source("../landing/src/lib/router.js"),
    source("../landing/src/main.js"),
    source("../landing/src/pages/home.js"),
    source("../landing/src/pages/search.js"),
    source("../landing/src/pages/technology/reasoning.js")
  ]);

  assert.match(router, /sequence !== renderSequence/);
  assert.match(router, /pointerover/);
  assert.match(main, /cancelAnimationFrame\(motionFrame\)/);
  assert.doesNotMatch(`${home}\n${search}`, /import\([^\n]+router\.js[^\n]+onLeave/);
  assert.match(reasoning, /removeEventListener\("resize", onResize\)/);
});

test("public contact addresses use the merex.ai domain", async () => {
  const files = await Promise.all([
    source("../landing/src/data/site.js"),
    source("../landing/src/pages/search.js"),
    source("../landing/src/pages/not-found.js"),
    source("../landing/src/pages/safety/disclosure.js")
  ]);
  const combined = files.join("\n");

  assert.doesNotMatch(combined, /mere-x\.com/i);
  assert.match(combined, /hello@merex\.ai/);
});

test("production serves hashed route chunks and brand assets with durable caching", async () => {
  const server = await source("../server/index.js");
  assert.match(server, /app\.use\("\/assets"[^\n]+immutable: true, maxAge: "1y"/);
  assert.match(server, /app\.use\("\/brand"[^\n]+maxAge: "7d"/);
});
