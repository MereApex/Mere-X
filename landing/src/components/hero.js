/* ============================================================
   HERO — the first screen. Black paper, the portrait height-fit
   and centred, the headline on the left, the HUD on the right.
   The portrait breathes, its circuitry blooms, dust drifts, the
   HUD log types itself.
   Everything degrades to a still when motion is reduced.
   ============================================================ */

import { icon, cornerMark, cornerFrame, checkerMark, globeMark } from "../lib/icons.js";

const LOG_LINES = ["ANALYZE_CODE", "MAP_DEPENDENCIES", "REASON", "GENERATE", "APPLY", "VERIFY"];

export const STATUS_LABEL = {
  pending: "Status · Checking",
  ok: "Status · Operational",
  down: "Status · Offline"
};

export function heroMarkup() {
  return `
    <section class="cover" data-cover aria-label="Mere X — Future Forward Intelligence">
      <div class="cover-bg" aria-hidden="true">
        <div class="cover-halo"></div>
        <canvas class="cover-dust" data-cover-dust></canvas>
        <div class="cover-portrait" data-cover-portrait>
          <div class="cover-enter"><div class="cover-breathe">
            <img class="cover-img" data-cover-img
              src="/hero/mere-studio-hero.webp"
              srcset="/hero/mere-studio-hero.webp 1448w, /hero/mere-studio-hero-2x.webp 2896w"
              sizes="(max-width: 1023px) 96vh, 134vh"
              width="1448" height="1086" alt="" fetchpriority="high" decoding="async">
            <img class="cover-neon" src="/hero/mere-studio-hero-neon-2x.webp" width="2896" height="2172" alt="" decoding="async" loading="eager">
            <img class="cover-glow" src="/hero/mere-studio-hero-glow.webp" width="1448" height="1086" alt="" decoding="async" loading="eager">
          </div></div>
        </div>
        <canvas class="cover-dust is-front" data-cover-dust-front></canvas>
        <div class="cover-grid"></div>
        <div class="cover-vignette"></div>
        <div class="cover-grain" data-cover-grain></div>
        <div class="cover-fade"></div>
      </div>

      <div class="cover-left"><div class="cover-left-inner" data-cover-layer="-3">
        <div class="cover-title-wrap">
        ${cornerMark("tl", "cover-corner cover-corner-tl").value}
        <h1 class="cover-title">
          <span class="cover-word"><i>Future</i></span>
          <span class="cover-word"><i>Forward</i></span>
          <span class="cover-word cover-word-checker"><i>Intelligence</i>${checkerMark().value}</span>
        </h1>
        ${cornerMark("bl", "cover-corner cover-corner-bl").value}
        </div>
        <p class="cover-lead">The coding agent that works in your codebase. Open a folder, describe the change, review the diff.</p>
        <div class="cover-actions">
          <a class="cover-cta" href="/app" data-magnetic><span>Open Mere Studio</span>${icon("arrow-ne", "icon").value}<i class="cover-cta-sheen"></i></a>
          <a class="cover-link" href="#how-it-works"><span>See it work</span>${icon("chevron-right", "icon").value}</a>
        </div>
        <p class="cover-spec">
          <span>Mere Studio</span><i></i>
          <span>4.2 Peak · 4.2 Core · 4.0 Lite</span><i></i>
          <span>1,000,000-token context</span><i></i>
          <span>Four thinking depths</span>
        </p>
      </div></div>

      <div class="cover-hud" aria-hidden="true">
        <div class="hud-log" data-cover-layer="10" data-hud-log>
          ${LOG_LINES.map((line) => `<div class="hud-line" data-hud-line><b>&gt;</b><span data-hud-text>${line}...</span><em data-hud-state></em></div>`).join("")}
        </div>
        <div class="hud-rule" data-cover-layer="8"><i></i></div>
        <div class="hud-claims" data-cover-layer="12">
          <span>Faster</span><span>Safer</span><span>Higher quality</span><i></i>
        </div>
        <div class="hud-dots" data-cover-layer="7">
          <svg viewBox="0 0 160 70">
            ${Array.from({ length: 4 }, (_, row) => Array.from({ length: 6 }, (_, col) => `<circle cx="${28 + col * 24}" cy="${8 + row * 18}" r="1.2" style="--i:${row * 6 + col}"/>`).join("")).join("")}
            <path d="M4 44l6 6M10 44l-6 6" class="hud-x"/>
          </svg>
        </div>
      </div>

      <aside class="cover-feature" data-cover-layer="6" aria-label="Mere X">
        ${cornerFrame().value}
        ${globeMark().value}
        <p class="cover-tagline">Your codebase. One agent.<br>Every diff reviewable.</p>
        <p class="cover-status" data-home-status data-state="pending">
          <span class="dot"></span><span data-status-label>${STATUS_LABEL.pending}</span>
        </p>
      </aside>

      <a class="cover-scroll" href="#how-it-works" aria-label="Scroll to how it works"><i></i></a>
    </section>`;
}

const TICKER = ["<b>Mere Studio</b>", "4.2 Peak", "4.2 Core", "4.0 Lite", "1,000,000-token context", "Four thinking depths", "Agent · Plan · Ask", "Checkpoints", "Reviewable diffs", "Project memory", "MCP servers", "GitHub · Linear · Figma", "Web search with sources", "Never trained on your code"];

export function tickerMarkup() {
  const group = `<div class="ticker-group">${TICKER.map((item) => `<span>${item}</span>`).join("")}</div>`;
  return `<div class="ticker" aria-hidden="true"><div class="ticker-track">${group}${group}</div></div>`;
}

/* ---- Runtime ----------------------------------------------------- */
export function mountHero(root) {
  const hero = root.querySelector("[data-cover]");
  if (!hero) return () => {};
  const reduced = document.documentElement.dataset.motion === "reduced";
  const cleanups = [];

  /* Ready state: the first paint animates in once the portrait exists. */
  const img = hero.querySelector("[data-cover-img]");
  const ready = () => hero.classList.add("is-ready");
  if (img && img.complete && img.naturalWidth) requestAnimationFrame(ready);
  else if (img) { img.addEventListener("load", ready, { once: true }); img.addEventListener("error", ready, { once: true }); }
  else ready();
  cleanups.push(...[
    mountStatus(hero),
    mountGrain(hero),
    reduced ? () => {} : mountParallax(hero),
    reduced ? () => {} : mountDust(hero),
    mountLog(hero, reduced)
  ]);
  return () => cleanups.forEach((fn) => fn());
}

/* Live platform status from the public health endpoint. */
function mountStatus(hero) {
  const status = hero.querySelector("[data-home-status]");
  const label = hero.querySelector("[data-status-label]");
  const controller = new AbortController();
  const setState = (state) => {
    if (!status || !label) return;
    status.dataset.state = state;
    label.textContent = STATUS_LABEL[state];
  };
  fetch("/api/health", { signal: controller.signal, headers: { accept: "application/json" } })
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error(String(response.status)))))
    .then((data) => setState(data && data.ok ? "ok" : "down"))
    .catch((error) => { if (error.name !== "AbortError") setState("down"); });
  return () => controller.abort();
}

/* Film grain: a small noise tile drawn once, stepped across the frame. */
function mountGrain(hero) {
  const node = hero.querySelector("[data-cover-grain]");
  if (!node) return () => {};
  try {
    const size = 160;
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext("2d");
    const data = ctx.createImageData(size, size);
    for (let i = 0; i < data.data.length; i += 4) {
      const v = 110 + Math.random() * 145;
      data.data[i] = v; data.data[i + 1] = v; data.data[i + 2] = v;
      data.data[i + 3] = Math.random() * 255;
    }
    ctx.putImageData(data, 0, 0);
    node.style.backgroundImage = `url(${canvas.toDataURL("image/png")})`;
  } catch { /* no canvas, no grain */ }
  return () => {};
}

/* Pointer parallax: the portrait leans away from the cursor, the HUD
   leans in. */
function mountParallax(hero) {
  const portrait = hero.querySelector("[data-cover-portrait]");
  const layers = Array.from(hero.querySelectorAll("[data-cover-layer]"));
  let tx = 0, ty = 0, cx = 0, cy = 0, frame = 0;

  const onMove = (event) => {
    const rect = hero.getBoundingClientRect();
    tx = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    ty = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    if (!frame) frame = requestAnimationFrame(tick);
  };
  const onLeave = () => { tx = 0; ty = 0; if (!frame) frame = requestAnimationFrame(tick); };

  const tick = () => {
    frame = 0;
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    if (portrait) portrait.style.transform = `translate3d(${(cx * -9).toFixed(2)}px, ${(cy * -6).toFixed(2)}px, 0)`;
    for (const layer of layers) {
      const depth = Number(layer.dataset.coverLayer) || 0;
      layer.style.transform = `translate3d(${(cx * depth).toFixed(2)}px, ${(cy * depth * 0.7).toFixed(2)}px, 0)`;
    }
    if (Math.abs(tx - cx) > 0.002 || Math.abs(ty - cy) > 0.002) frame = requestAnimationFrame(tick);
  };

  hero.addEventListener("pointermove", onMove, { passive: true });
  hero.addEventListener("pointerleave", onLeave);
  return () => {
    hero.removeEventListener("pointermove", onMove);
    hero.removeEventListener("pointerleave", onLeave);
    if (frame) cancelAnimationFrame(frame);
  };
}

/* Dust: slow specks behind and in front of the portrait. */
function mountDust(hero) {
  const canvases = [hero.querySelector("[data-cover-dust]"), hero.querySelector("[data-cover-dust-front]")].filter(Boolean);
  if (!canvases.length) return () => {};
  let running = true, frame = 0;
  const fields = canvases.map((canvas, index) => ({ canvas, ctx: canvas.getContext("2d"), front: index === 1, motes: [], w: 0, h: 0 }));

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    for (const field of fields) {
      const rect = hero.getBoundingClientRect();
      field.w = rect.width; field.h = rect.height;
      field.canvas.width = Math.round(rect.width * dpr);
      field.canvas.height = Math.round(rect.height * dpr);
      field.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round((rect.width * rect.height) / (field.front ? 42000 : 16000));
      field.motes = Array.from({ length: count }, () => mote(field, true));
    }
  };
  const mote = (field, anywhere) => ({
    x: Math.random() * field.w,
    y: anywhere ? Math.random() * field.h : field.h + 10,
    r: field.front ? 1.2 + Math.random() * 2.2 : 0.5 + Math.random() * 1.2,
    vy: -(0.08 + Math.random() * 0.22) * (field.front ? 1.6 : 1),
    vx: (Math.random() - 0.5) * 0.12,
    a: 0.08 + Math.random() * (field.front ? 0.18 : 0.3),
    t: Math.random() * Math.PI * 2
  });

  const draw = () => {
    if (!running) return;
    for (const field of fields) {
      const { ctx, w, h } = field;
      ctx.clearRect(0, 0, w, h);
      for (const m of field.motes) {
        m.t += 0.01;
        m.x += m.vx + Math.sin(m.t) * 0.08;
        m.y += m.vy;
        if (m.y < -10 || m.x < -10 || m.x > w + 10) Object.assign(m, mote(field, false));
        const twinkle = 0.7 + Math.sin(m.t * 3) * 0.3;
        ctx.globalAlpha = m.a * twinkle;
        ctx.fillStyle = "#fff";
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    frame = requestAnimationFrame(draw);
  };

  /* Only animate while the hero is on screen. */
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.some((entry) => entry.isIntersecting);
    if (visible && !running) { running = true; draw(); }
    else if (!visible) { running = false; cancelAnimationFrame(frame); }
  }, { threshold: 0.05 });
  observer.observe(hero);
  window.addEventListener("resize", resize);
  resize();
  draw();
  return () => {
    running = false;
    cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("resize", resize);
  };
}

/* The HUD log: each line types itself, waits, resolves, and the
   list restarts once everything is verified. */
function mountLog(hero, reduced) {
  const lines = Array.from(hero.querySelectorAll("[data-hud-line]"));
  if (!lines.length) return () => {};
  if (reduced) { lines.forEach((line) => line.classList.add("is-on", "is-done")); return () => {}; }
  let timers = [];
  const later = (fn, ms) => timers.push(setTimeout(fn, ms));
  const reset = () => { timers.forEach(clearTimeout); timers = []; lines.forEach((line) => { line.classList.remove("is-on", "is-typing", "is-done"); line.querySelector("[data-hud-text]").textContent = ""; }); };

  const play = () => {
    reset();
    let at = 400;
    lines.forEach((line, index) => {
      const text = `${LOG_LINES[index]}...`;
      const node = line.querySelector("[data-hud-text]");
      later(() => { line.classList.add("is-on", "is-typing"); }, at);
      for (let i = 1; i <= text.length; i += 1) later(() => { node.textContent = text.slice(0, i); }, at + i * 28);
      const typed = at + text.length * 28;
      later(() => { line.classList.remove("is-typing"); line.classList.add("is-done"); }, typed + 620);
      at = typed + 760;
    });
    later(() => hero.classList.add("is-verified"), at);
    later(() => { hero.classList.remove("is-verified"); play(); }, at + 3200);
  };
  play();
  return () => reset();
}
