/* ============================================================
   DEMO — the Mere Code desktop app, replayed.
   A window of the desktop program working through one real
   change: it searches, reads (the editor is scanned as it reads),
   plans, lands the edit in the editor, writes a test with an
   inline completion accepted by Tab, runs the suite in the
   terminal, and hands the diff back — the pointer reviews it and
   accepts. Chapters are clickable, the replay loops on screen.
   ============================================================ */

import { icon, cornerFrame } from "../lib/icons.js";
import { escapeHtml } from "../lib/dom.js";

const PROMPT = "The retry wrapper double-counts failures when the circuit breaker is half-open. Find it, fix it and make sure the suite still passes.";

export const CHAPTERS = [
  { key: "understand", n: "01", title: "Understand", body: "Searches the codebase and reads only the files that matter.", caption: "It follows the call graph instead of guessing from the open file." },
  { key: "plan", n: "02", title: "Plan", body: "States the cause and the steps before touching anything.", caption: "Every step is written down, so you can stop it before it starts." },
  { key: "edit", n: "03", title: "Edit", body: "Lands exact replacements and writes the test, in the editor.", caption: "No rewrites, no reformatting — the two lines that fix it and a test that proves it." },
  { key: "verify", n: "04", title: "Verify", body: "Runs the suite in a real terminal and reports what changed.", caption: "You read the diff, accept it or revert it. The agent never claims what it did not run." }
];

const BREAKER = [
  { n: 140, text: "  /** One guarded attempt while half-open. */", cls: "c" },
  { n: 141, text: "  private async probe(): Promise<void> {" },
  { n: 142, text: '    this.state = "half-open";' },
  { n: 143, text: "    this.failureCount += 1;", del: true },
  { n: 144, text: "    const result = await this.attempt();" },
  { n: 145, text: "    this.onResult(result);" },
  { add: "    if (!result.ok) this.failureCount += 1;" },
  { add: "    else this.reset();" },
  { n: 146, text: "  }" },
  { n: 147, text: "" },
  { n: 148, text: "  private reset() {" },
  { n: 149, text: "    this.failureCount = 0;" },
  { n: 150, text: '    this.state = "closed";' },
  { n: 151, text: "  }" }
];

const RETRY = [
  { n: 58, text: "export async function withRetry<T>(fn: Task<T>, opts: RetryOptions) {" },
  { n: 59, text: "  for (let attempt = 0; attempt <= opts.retries; attempt += 1) {" },
  { n: 60, text: '    if (breaker.state === "half-open" && attempt > 0) break;' },
  { n: 61, text: "    const result = await breaker.exec(fn);" },
  { n: 62, text: "    if (result.ok) return result.value;" },
  { n: 63, text: "    await sleep(backoff(attempt, opts));" },
  { n: 64, text: "  }" },
  { n: 65, text: "  throw new RetryExhausted(opts.retries);" },
  { n: 66, text: "}" },
  { n: 67, text: "" },
  { n: 68, text: "function backoff(attempt: number, opts: RetryOptions) {" },
  { n: 69, text: "  return Math.min(opts.cap, opts.base * 2 ** attempt);" },
  { n: 70, text: "}" },
  { n: 71, text: "" }
];

/* The test file: the first lines are typed, the rest arrives as an
   inline completion and is accepted with Tab. */
const TEST = [
  { typed: 'import { describe, expect, it } from "vitest";' },
  { typed: 'import { CircuitBreaker } from "../src/resilience/breaker";' },
  { typed: "" },
  { typed: 'describe("half-open probe", () => {' },
  { typed: '  it("counts only failed probes", async () => {' },
  { typed: "    const breaker = new CircuitBreaker({ threshold: 2 });" },
  { ghost: "    await breaker.trip();" },
  { ghost: "    await breaker.probe(() => ok());" },
  { ghost: "    expect(breaker.failureCount).toBe(0);" },
  { ghost: '    expect(breaker.state).toBe("closed");' },
  { ghost: "  });" },
  { ghost: "});" }
];

const TERMINAL = [
  { text: "> checkout-service@2.4.1 test", cls: "dim" },
  { text: "> vitest run", cls: "dim" },
  { text: "" },
  { text: " RUN  v2.1.8  /checkout-service", cls: "run" },
  { text: " ✓ test/retry.test.ts  (8 tests)  96ms", cls: "ok" },
  { text: " ✓ test/breaker.test.ts  (13 tests)  412ms", cls: "ok" },
  { text: "" },
  { text: " Test Files  2 passed (2)", cls: "sum" },
  { text: "      Tests  21 passed (21)", cls: "sum" },
  { text: "   Duration  1.02s", cls: "dim" }
];

/* The timeline, in ms after the prompt has been typed. */
const STEPS = [
  { t: 0, chapter: 0, kind: "prompt" },
  { t: 450, kind: "status", text: "Thinking" },
  { t: 1500, kind: "thought", text: "Thought for 3s" },
  { t: 1950, kind: "call", icon: "search", label: "Searched", target: "\"half-open\"", meta: "6 results", search: true, status: "Agent · searching" },
  { t: 2750, kind: "call", icon: "file", label: "Read", target: "src/resilience/breaker.ts", meta: "L120–168", editor: "breaker", read: true, status: "Agent · reading breaker.ts" },
  { t: 3650, kind: "call", icon: "file", label: "Read", target: "src/resilience/retry.ts", meta: "L52–74", editor: "retry", read: true, status: "Agent · reading retry.ts" },
  { t: 4950, chapter: 1, kind: "text", text: "Found it. <code>probe()</code> increments <code>failureCount</code> before the result is known, so a successful half-open probe still counts as a failure and the breaker never closes.", editor: "breaker" },
  { t: 6050, kind: "plan", items: ["Count only failed probes in breaker.ts", "Add a regression test for the half-open path", "Run the suite"] },
  { t: 7400, chapter: 2, kind: "call", icon: "code", label: "Edited", target: "src/resilience/breaker.ts", meta: "+2 −1", edit: true, status: "Agent · editing breaker.ts" },
  { t: 10700, kind: "check", index: 0 },
  { t: 11000, kind: "call", icon: "plus", label: "Created", target: "test/breaker.test.ts", meta: "+12", test: true, status: "Agent · writing breaker.test.ts" },
  { t: 14400, kind: "check", index: 1 },
  { t: 14800, chapter: 3, kind: "call", icon: "terminal", label: "Ran", target: "npm test", meta: "", terminal: true, status: "Agent · running tests" },
  { t: 18500, kind: "meta", meta: "21 passed" },
  { t: 18600, kind: "check", index: 2 },
  { t: 19000, kind: "text", text: "Moved the increment into the failure branch and added a regression test for the half-open probe. All 21 tests pass.", status: "Agent · done · 2 files changed" },
  { t: 19800, kind: "changes" },
  { t: 20800, kind: "review" },
  { t: 22600, kind: "accept" },
  { t: 23800, kind: "accepted", status: "2 files accepted" },
  { t: 27200, kind: "restart" }
];
const LOOP_MS = STEPS[STEPS.length - 1].t;
const CHAPTER_START = CHAPTERS.map((_, index) => STEPS.find((step) => step.chapter === index).t);

function codeLine(line) {
  if (line.add !== undefined) return `<div class="dm-line is-add" data-add="${escapeHtml(line.add)}"><span class="dm-num"></span><span class="dm-gutter">+</span><span class="dm-src"></span></div>`;
  if (line.typed !== undefined || line.ghost !== undefined) {
    const text = line.typed ?? line.ghost;
    return `<div class="dm-line ${line.ghost !== undefined ? "is-ghost" : "is-typed"}" data-text="${escapeHtml(text)}"><span class="dm-num"></span><span class="dm-gutter"></span><span class="dm-src"></span></div>`;
  }
  return `<div class="dm-line${line.del ? " is-del" : ""}${line.cls ? ` is-${line.cls}` : ""}" data-n="${line.n}"><span class="dm-num">${line.n}</span><span class="dm-gutter">${line.del ? "−" : ""}</span><span class="dm-src">${escapeHtml(line.text)}</span></div>`;
}

function minimap() {
  const widths = [60, 82, 40, 70, 88, 30, 55, 76, 64, 20, 48, 84, 36, 70, 58, 26, 66, 90, 44, 72, 38, 62, 80, 28];
  return `<div class="dm-minimap" aria-hidden="true">${widths.map((w) => `<i style="width:${w}%"></i>`).join("")}<b data-demo-minimap-view></b></div>`;
}

export function demoMarkup() {
  const rail = ["file", "search", "branch", "terminal", "orbit"].map((name, index) => `<span class="dm-rail-btn${index === 0 ? " is-active" : ""}">${icon(name, "icon").value}</span>`).join("");
  const tree = [
    { d: 0, folder: true, open: true, name: "src" },
    { d: 1, folder: true, name: "api" },
    { d: 1, folder: true, open: true, name: "resilience" },
    { d: 2, name: "breaker.ts", key: "breaker", active: true, dot: true },
    { d: 2, name: "retry.ts", key: "retry" },
    { d: 2, name: "types.ts" },
    { d: 0, folder: true, open: true, name: "test" },
    { d: 1, name: "retry.test.ts" },
    { d: 1, name: "breaker.test.ts", key: "test", fresh: true },
    { d: 0, name: "package.json" },
    { d: 0, name: "vitest.config.ts" }
  ].map((row, index) => `<div class="dm-row d${row.d}${row.active ? " is-active" : ""}${row.fresh ? " dm-row-new" : ""}" style="--i:${index}"${row.key ? ` data-demo-tree="${row.key}"` : ""}>${row.folder ? icon(row.open ? "chevron-down" : "chevron-right", "icon dm-caret").value : ""}${icon(row.folder ? "folder" : "file", "icon").value}${row.name}${row.dot ? '<i class="dm-dot" data-demo-modified></i>' : ""}${row.fresh ? "<em>U</em>" : ""}</div>`).join("");

  return `
    <div class="demo-stage" data-demo-stage>
      <ol class="demo-steps" data-demo-steps>
        ${CHAPTERS.map((chapter, index) => `
          <li class="demo-step${index === 0 ? " is-active" : ""}" data-demo-step="${index}" role="button" tabindex="0" title="Jump to ${chapter.title}">
            <span class="demo-step-n">${chapter.n}</span>
            <span class="demo-step-title">${chapter.title}</span>
            <span class="demo-step-body">${chapter.body}</span>
            <i class="demo-step-bar"><b data-demo-step-bar></b></i>
          </li>`).join("")}
      </ol>

      <div class="demo-frame" data-demo-frame>
        <div class="demo-beam" aria-hidden="true"></div>
        <div class="demo-glow" aria-hidden="true"><i></i><i></i></div>
        <div class="demo-corners" aria-hidden="true">${cornerFrame().value}</div>
        <div class="demo-window" data-demo aria-label="Mere Code for desktop, replaying a change">
          <div class="dm-titlebar">
            <span class="dm-lights" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="dm-brand">MERE CODE<i>˚</i></span>
            <span class="dm-crumbs">
              <span class="dm-chip">${icon("folder", "icon").value}checkout-service</span>
              <span class="dm-chip">${icon("branch", "icon").value}fix/half-open-probe</span>
            </span>
            <span class="dm-spacer"></span>
            <span class="dm-live" data-demo-live><i></i>Live replay</span>
            <span class="dm-chip dm-chip-model">${icon("orbit", "icon").value}4.2 Peak · Extra High</span>
            <span class="dm-win" aria-hidden="true">${icon("minus", "icon").value}${icon("box", "icon").value}${icon("close", "icon").value}</span>
          </div>

          <div class="dm-body">
            <aside class="dm-rail" aria-hidden="true">${rail}</aside>
            <aside class="dm-tree" data-demo-tree-panel aria-hidden="true"><div class="dm-tree-head">Explorer</div>${tree}</aside>

            <div class="dm-main">
              <div class="dm-editor" aria-hidden="true">
                <div class="dm-tabs" data-demo-tabs>
                  <span class="is-active" data-demo-tab="breaker">${icon("file", "icon").value}breaker.ts<i class="dm-dot" data-demo-modified></i></span>
                  <span data-demo-tab="retry">${icon("file", "icon").value}retry.ts</span>
                  <span class="dm-tab-new" data-demo-tab="test">${icon("file", "icon").value}breaker.test.ts</span>
                </div>
                <div class="dm-code" data-demo-code="breaker">${BREAKER.map(codeLine).join("")}</div>
                <div class="dm-code" data-demo-code="retry" hidden>${RETRY.map(codeLine).join("")}</div>
                <div class="dm-code" data-demo-code="test" hidden>${TEST.map(codeLine).join("")}<div class="dm-tab-hint" data-demo-tab-hint><b>Tab</b> to accept</div></div>
                ${minimap()}
                <div class="dm-review" data-demo-review><span>${icon("check", "icon").value}2 changes</span><b>Accept file</b><b>Reject</b></div>
              </div>
              <div class="dm-terminal" aria-hidden="true">
                <div class="dm-terminal-head"><span class="is-active">Terminal</span><span>Problems</span><span>Output</span><span class="dm-spacer"></span><span class="dm-terminal-shell">zsh · checkout-service</span></div>
                <div class="dm-terminal-body" data-demo-terminal>
                  <div class="dm-tl dm-tl-prompt"><span class="dm-ps1">➜</span><span class="dm-ps1-dir">checkout-service</span><span data-demo-terminal-input></span><i class="dm-tcaret"></i></div>
                </div>
              </div>
            </div>

            <aside class="dm-thread" aria-label="The agent thread, replayed">
              <div class="dm-thread-head"><span>Half-open probe double count</span><span class="dm-thread-icons">${icon("plus", "icon").value}${icon("more", "icon").value}</span></div>
              <div class="dm-feed" data-demo-feed></div>
              <div class="dm-composer">
                <span class="dm-input" data-demo-input>Plan, search, build anything</span>
                <span class="dm-composer-bar"><b>${icon("orbit", "icon").value}Agent</b><b>4.2 Peak</b><b>${icon("sliders", "icon").value}Extra High</b><span class="dm-spacer"></span><i class="dm-send">${icon("arrow-up", "icon").value}</i></span>
              </div>
            </aside>
          </div>

          <div class="dm-statusbar" aria-hidden="true">
            <span>${icon("branch", "icon").value}fix/half-open-probe</span>
            <span>${icon("refresh", "icon").value}0 ↑ 0 ↓</span>
            <span class="dm-status-live" data-demo-status><i></i>Agent · ready</span>
            <span class="dm-spacer"></span>
            <span>TypeScript</span>
            <span data-demo-cursor-pos>Ln 143, Col 5</span>
            <span>UTF-8</span>
          </div>

          <div class="dm-pointer" data-demo-pointer aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M3 2l13 7.5-5.6 1.4 3.4 5.9-2.2 1.2-3.4-5.9L3 16z"/></svg></div>
        </div>
      </div>

      <div class="demo-foot">
        <p class="demo-caption" data-demo-caption>${CHAPTERS[0].caption}</p>
        <div class="demo-transport">
          <div class="demo-progress" aria-hidden="true"><i data-demo-progress></i></div>
          <button type="button" class="demo-replay" data-demo-replay>${icon("refresh", "icon").value}<span>Replay</span></button>
        </div>
      </div>
    </div>`;
}

/* ---- The replay ------------------------------------------------- */
export function mountDemo(stage) {
  if (!stage) return () => {};
  const q = (sel) => stage.querySelector(sel);
  const window_ = q("[data-demo]");
  const frame = q("[data-demo-frame]");
  const feed = q("[data-demo-feed]");
  const input = q("[data-demo-input]");
  const review = q("[data-demo-review]");
  const terminal = q("[data-demo-terminal]");
  const terminalInput = q("[data-demo-terminal-input]");
  const pointer = q("[data-demo-pointer]");
  const caption = q("[data-demo-caption]");
  const progress = q("[data-demo-progress]");
  const status = q("[data-demo-status]");
  const cursorPos = q("[data-demo-cursor-pos]");
  const treePanel = q("[data-demo-tree-panel]");
  const tabHint = q("[data-demo-tab-hint]");
  const minimapView = q("[data-demo-minimap-view]");
  const steps = Array.from(stage.querySelectorAll("[data-demo-step]"));
  const codes = { breaker: q('[data-demo-code="breaker"]'), retry: q('[data-demo-code="retry"]'), test: q('[data-demo-code="test"]') };

  let timers = [];
  let running = false;
  let visible = false;
  let planNode = null;
  let chapter = 0;

  const later = (fn, ms) => { if (ms <= 0) { fn(); return; } timers.push(setTimeout(fn, ms)); };
  const setStatus = (text) => { status.innerHTML = `<i></i>${escapeHtml(text)}`; };

  const showEditor = (name) => {
    for (const [key, node] of Object.entries(codes)) node.hidden = key !== name;
    stage.querySelectorAll("[data-demo-tab]").forEach((tab) => tab.classList.toggle("is-active", tab.dataset.demoTab === name));
    stage.querySelectorAll("[data-demo-tree]").forEach((row) => row.classList.toggle("is-active", row.dataset.demoTree === name));
    if (minimapView) minimapView.style.top = name === "retry" ? "38%" : name === "test" ? "6%" : "22%";
  };

  const setChapter = (index, instant = false) => {
    chapter = index;
    steps.forEach((step, i) => {
      step.classList.toggle("is-active", i === index);
      step.classList.toggle("is-done", i < index);
    });
    if (caption.textContent !== CHAPTERS[index].caption) {
      if (instant) { caption.textContent = CHAPTERS[index].caption; return; }
      caption.classList.add("is-swapping");
      later(() => { caption.textContent = CHAPTERS[index].caption; caption.classList.remove("is-swapping"); }, 220);
    }
  };

  const reset = () => {
    timers.forEach(clearTimeout);
    timers = [];
    feed.innerHTML = "";
    planNode = null;
    input.textContent = "Plan, search, build anything";
    input.classList.remove("is-typing");
    window_.classList.remove("is-edited", "is-accepted", "is-tested", "has-new-file", "is-reviewing");
    review.classList.remove("is-on");
    treePanel.classList.remove("is-searching");
    for (const code of Object.values(codes)) code.classList.remove("is-reading");
    codes.breaker.querySelectorAll(".dm-line.is-add").forEach((line) => { line.classList.remove("is-on"); line.querySelector(".dm-src").textContent = ""; });
    codes.breaker.querySelectorAll(".dm-line").forEach((line) => line.classList.remove("is-cursor", "is-struck"));
    codes.test.querySelectorAll(".dm-line").forEach((line, index) => { line.classList.remove("is-on", "is-cursor", "is-shown", "is-accepted"); line.querySelector(".dm-src").textContent = ""; line.querySelector(".dm-num").textContent = String(index + 1); });
    tabHint.classList.remove("is-on");
    terminal.querySelectorAll(".dm-tl:not(.dm-tl-prompt)").forEach((line) => line.remove());
    terminal.classList.remove("is-running", "is-done");
    terminalInput.textContent = "";
    pointer.classList.remove("is-on", "is-click");
    pointer.style.transition = "none";
    pointer.style.transform = "";
    showEditor("breaker");
    setStatus("Agent · ready");
    cursorPos.textContent = "Ln 143, Col 5";
    progress.style.transition = "none";
    progress.style.width = "0%";
  };

  const append = (markup) => {
    feed.insertAdjacentHTML("beforeend", markup);
    feed.scrollTop = feed.scrollHeight;
    return feed.lastElementChild;
  };

  const typeInto = (node, text, ms, done, instant) => {
    if (instant) { node.textContent = text; if (done) done(); return; }
    let index = 0;
    const tick = () => {
      index += 1;
      node.textContent = text.slice(0, index);
      if (index < text.length) later(tick, ms);
      else if (done) done();
    };
    tick();
  };

  /* Reading: a scan band sweeps the code and the minimap viewport moves. */
  const playRead = (name, instant) => {
    const code = codes[name];
    if (instant || !code) return;
    code.classList.remove("is-reading");
    void code.offsetWidth;
    code.classList.add("is-reading");
    later(() => code.classList.remove("is-reading"), 1100);
  };

  /* Searching: the explorer rows light up one after another. */
  const playSearch = (instant) => {
    if (instant) return;
    treePanel.classList.remove("is-searching");
    void treePanel.offsetWidth;
    treePanel.classList.add("is-searching");
    later(() => treePanel.classList.remove("is-searching"), 1400);
  };

  /* The edit lands: the old line is struck, the new lines are typed. */
  const playEdit = (instant) => {
    const code = codes.breaker;
    const del = code.querySelector(".dm-line.is-del");
    const adds = Array.from(code.querySelectorAll(".dm-line.is-add"));
    if (instant) {
      del.classList.add("is-struck");
      adds.forEach((line) => { line.classList.add("is-on"); line.querySelector(".dm-src").textContent = line.dataset.add; });
      review.classList.add("is-on"); window_.classList.add("is-edited");
      return;
    }
    del.classList.add("is-cursor");
    cursorPos.textContent = "Ln 143, Col 5";
    later(() => { del.classList.add("is-struck"); del.classList.remove("is-cursor"); }, 420);
    let delay = 760;
    adds.forEach((line, index) => {
      later(() => {
        line.classList.add("is-on", "is-cursor");
        cursorPos.textContent = `Ln ${146 + index}, Col 5`;
        typeInto(line.querySelector(".dm-src"), line.dataset.add, 26, () => {
          line.classList.remove("is-cursor");
          cursorPos.textContent = `Ln ${146 + index}, Col ${line.dataset.add.length + 1}`;
        });
      }, delay);
      delay += 260 + line.dataset.add.length * 26;
    });
    later(() => { review.classList.add("is-on"); window_.classList.add("is-edited"); }, delay + 120);
  };

  /* The test file: typed lines, then a ghost completion accepted with Tab. */
  const playTest = (instant) => {
    window_.classList.add("has-new-file");
    showEditor("test");
    const lines = Array.from(codes.test.querySelectorAll(".dm-line"));
    const typed = lines.filter((line) => line.classList.contains("is-typed"));
    const ghosts = lines.filter((line) => line.classList.contains("is-ghost"));
    if (instant) {
      lines.forEach((line) => { line.classList.add("is-on", "is-shown", "is-accepted"); line.querySelector(".dm-src").textContent = line.dataset.text; });
      return;
    }
    let delay = 200;
    typed.forEach((line, index) => {
      later(() => {
        line.classList.add("is-on", "is-cursor");
        cursorPos.textContent = `Ln ${index + 1}, Col 1`;
        typeInto(line.querySelector(".dm-src"), line.dataset.text, 9, () => line.classList.remove("is-cursor"));
      }, delay);
      delay += 120 + line.dataset.text.length * 9;
    });
    later(() => {
      ghosts.forEach((line) => { line.classList.add("is-on", "is-shown"); line.querySelector(".dm-src").textContent = line.dataset.text; });
      tabHint.classList.add("is-on");
      cursorPos.textContent = "Ln 7, Col 1";
    }, delay + 260);
    later(() => {
      ghosts.forEach((line) => line.classList.add("is-accepted"));
      tabHint.classList.remove("is-on");
      cursorPos.textContent = "Ln 12, Col 4";
    }, delay + 1500);
  };

  /* The suite runs in the terminal. */
  const playTerminal = (instant) => {
    const emit = (line) => { terminal.insertAdjacentHTML("beforeend", `<div class="dm-tl${line.cls ? ` is-${line.cls}` : ""}">${escapeHtml(line.text) || "&nbsp;"}</div>`); terminal.scrollTop = terminal.scrollHeight; };
    if (instant) {
      terminalInput.textContent = "npm test";
      TERMINAL.forEach(emit);
      terminal.classList.add("is-done"); window_.classList.add("is-tested");
      return;
    }
    terminal.classList.add("is-running");
    typeInto(terminalInput, "npm test", 55, () => {
      let delay = 320;
      TERMINAL.forEach((line, index) => {
        later(() => {
          emit(line);
          if (index === TERMINAL.length - 1) { terminal.classList.remove("is-running"); terminal.classList.add("is-done"); window_.classList.add("is-tested"); }
        }, delay);
        delay += index === 3 ? 900 : index === 4 ? 520 : 230;
      });
    });
  };

  /* The pointer glides to a button and presses it. */
  const pressWith = (button, after, instant) => {
    if (!button) return;
    if (instant) { after(); return; }
    const host = window_.getBoundingClientRect();
    const target = button.getBoundingClientRect();
    const x = target.left - host.left + target.width * 0.58;
    const y = target.top - host.top + target.height * 0.55;
    if (!pointer.classList.contains("is-on")) {
      pointer.style.transition = "none";
      pointer.style.transform = `translate(${x + 120}px, ${y + 110}px)`;
      pointer.classList.add("is-on");
    }
    later(() => { pointer.style.transition = ""; pointer.style.transform = `translate(${x}px, ${y}px)`; }, 40);
    later(() => { pointer.classList.add("is-click"); button.classList.add("is-pressed"); after(); }, 900);
    later(() => pointer.classList.remove("is-click"), 1060);
  };

  const run = (step, instant = false) => {
    if (step.chapter !== undefined) setChapter(step.chapter, instant);
    if (step.status) setStatus(step.status);
    if (step.editor) showEditor(step.editor);
    switch (step.kind) {
      case "prompt":
        input.textContent = "Plan, search, build anything";
        input.classList.remove("is-typing");
        append(`<div class="dm-user">${escapeHtml(PROMPT)}</div>`);
        break;
      case "status":
        append(`<div class="dm-status"><i></i>${escapeHtml(step.text)}</div>`);
        break;
      case "thought":
        feed.querySelector(".dm-status")?.remove();
        append(`<div class="dm-part dm-thought">${icon("spinner", "icon").value}<span>${escapeHtml(step.text)}</span>${icon("chevron-right", "icon dm-chev").value}</div>`);
        break;
      case "call":
        append(`<div class="dm-part dm-call" data-demo-call>${icon(step.icon, "icon").value}<span class="dm-call-label">${escapeHtml(step.label)}</span><span class="dm-call-target">${escapeHtml(step.target)}</span><span class="dm-call-meta">${escapeHtml(step.meta)}</span></div>`);
        if (step.search) playSearch(instant);
        if (step.read) playRead(step.editor, instant);
        if (step.edit) playEdit(instant);
        if (step.test) playTest(instant);
        if (step.terminal) playTerminal(instant);
        break;
      case "meta": {
        const calls = feed.querySelectorAll("[data-demo-call]");
        const last = calls[calls.length - 1];
        if (last) last.querySelector(".dm-call-meta").textContent = step.meta;
        break;
      }
      case "text":
        append(`<div class="dm-part dm-text">${step.text}</div>`);
        break;
      case "plan":
        planNode = append(`<div class="dm-plan"><span class="dm-plan-head">${icon("list", "icon").value}Plan</span>${step.items.map((item) => `<span class="dm-plan-item"><i>${icon("check", "icon").value}</i>${escapeHtml(item)}</span>`).join("")}</div>`);
        break;
      case "check":
        planNode?.querySelectorAll(".dm-plan-item")[step.index]?.classList.add("is-done");
        break;
      case "changes":
        append(`<div class="dm-changes" data-demo-changes>
          <span class="dm-changes-title">2 files changed <b>+14</b> <em>−1</em></span>
          <span class="dm-changes-files"><span>src/resilience/breaker.ts <b>+2 −1</b></span><span>test/breaker.test.ts <b>+12</b></span></span>
          <div class="dm-mini-diff" data-demo-mini-diff>
            <div class="is-del"><i>−</i>this.failureCount += 1;</div>
            <div class="is-add"><i>+</i>if (!result.ok) this.failureCount += 1;</div>
            <div class="is-add"><i>+</i>else this.reset();</div>
          </div>
          <span class="dm-chips"><b class="is-primary" data-demo-accept>Accept all</b><b data-demo-review-btn>Review</b></span>
        </div>`);
        break;
      case "review":
        pressWith(feed.querySelector("[data-demo-review-btn]"), () => { window_.classList.add("is-reviewing"); feed.querySelector("[data-demo-changes]")?.classList.add("is-open"); feed.scrollTop = feed.scrollHeight; }, instant);
        break;
      case "accept":
        pressWith(feed.querySelector("[data-demo-accept]"), () => {
          const button = feed.querySelector("[data-demo-accept]");
          if (button) button.innerHTML = `${icon("check", "icon").value}Accepted`;
        }, instant);
        break;
      case "accepted":
        window_.classList.add("is-accepted");
        review.classList.remove("is-on");
        feed.querySelector("[data-demo-changes]")?.classList.add("is-accepted");
        later(() => pointer.classList.remove("is-on"), instant ? 0 : 700);
        break;
      case "restart":
        running = false;
        if (visible) play();
        break;
      default:
    }
  };

  /* Play from the start, or from a chapter: everything before it is
     applied instantly, the rest runs on the timeline. */
  const play = (fromChapter = 0) => {
    reset();
    running = true;
    const start = CHAPTER_START[fromChapter] || 0;
    const typing = fromChapter === 0 ? PROMPT.length * 17 + 500 : 0;
    later(() => {
      progress.style.transition = "none";
      progress.style.width = `${((start / LOOP_MS) * 100).toFixed(2)}%`;
      later(() => {
        progress.style.transition = `width ${typing + (LOOP_MS - start)}ms linear`;
        progress.style.width = "100%";
      }, 40);
    }, 20);
    if (fromChapter === 0) {
      input.classList.add("is-typing");
      typeInto(input, PROMPT, 17);
    }
    for (const step of STEPS) {
      if (step.t < start) run(step, true);
      else later(() => run(step), typing + step.t - start);
    }
  };

  /* Chapters and the replay button seek. */
  const onStep = (event) => {
    const step = event.target.closest("[data-demo-step]");
    if (!step || (event.type === "keydown" && event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    play(Number(step.dataset.demoStep));
  };
  stage.addEventListener("click", onStep);
  stage.addEventListener("keydown", onStep);
  const replay = q("[data-demo-replay]");
  const onReplay = () => play(0);
  replay?.addEventListener("click", onReplay);

  const observer = new IntersectionObserver((entries) => {
    visible = entries.some((entry) => entry.isIntersecting);
    if (visible) {
      window_.classList.add("is-in");
      if (!running) play(chapter && chapter < 3 ? chapter : 0);
    }
  }, { threshold: 0.25 });
  observer.observe(window_);

  /* The window settles as it scrolls through the viewport. */
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      const rect = frame.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      if (rect.bottom < -200 || rect.top > viewport + 200) return;
      const centre = rect.top + rect.height / 2;
      const offset = Math.max(-1, Math.min(1, (centre - viewport / 2) / viewport));
      frame.style.setProperty("--tilt", `${(offset * 5).toFixed(2)}deg`);
      frame.style.setProperty("--shift", `${(offset * 18).toFixed(1)}px`);
      frame.style.setProperty("--glow-shift", `${(offset * -40).toFixed(1)}px`);
    });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  return () => {
    observer.disconnect();
    window.removeEventListener("scroll", onScroll);
    stage.removeEventListener("click", onStep);
    stage.removeEventListener("keydown", onStep);
    replay?.removeEventListener("click", onReplay);
    reset();
  };
}
