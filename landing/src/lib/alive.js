/* ============================================================
   ALIVE — the effects that make the home page feel awake:
   a light that follows the cursor, a scroll progress line,
   spotlights on cards, headings that rise word by word, and
   signal lines on the model cards. All of it steps aside when
   motion is reduced.
   ============================================================ */

const reduced = () => document.documentElement.dataset.motion === "reduced";

/* A soft light that follows the pointer across the whole page. */
export function initCursorLight() {
  if (reduced() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const light = document.createElement("div");
  light.className = "cursor-light";
  document.body.append(light);
  let x = window.innerWidth / 2, y = window.innerHeight / 2, cx = x, cy = y, frame = 0;
  const tick = () => {
    frame = 0;
    cx += (x - cx) * 0.12; cy += (y - cy) * 0.12;
    light.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    if (Math.abs(x - cx) > 0.3 || Math.abs(y - cy) > 0.3) frame = requestAnimationFrame(tick);
  };
  const onMove = (event) => { x = event.clientX; y = event.clientY; light.classList.add("is-on"); if (!frame) frame = requestAnimationFrame(tick); };
  const onLeave = () => light.classList.remove("is-on");
  window.addEventListener("pointermove", onMove, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);
  return () => {
    window.removeEventListener("pointermove", onMove);
    document.documentElement.removeEventListener("pointerleave", onLeave);
    if (frame) cancelAnimationFrame(frame);
    light.remove();
  };
}

/* A one-pixel line under the header that fills as the page scrolls. */
export function initScrollProgress() {
  const bar = document.createElement("div");
  bar.className = "scroll-progress";
  bar.innerHTML = "<i></i>";
  document.body.append(bar);
  const fill = bar.firstElementChild;
  let frame = 0;
  const update = () => {
    frame = 0;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? Math.min(1, window.scrollY / max) : 0;
    fill.style.transform = `scaleX(${progress.toFixed(4)})`;
    bar.classList.toggle("is-on", window.scrollY > 40);
  };
  const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    if (frame) cancelAnimationFrame(frame);
    bar.remove();
  };
}

/* Cards inside [data-spotlight] get a highlight that follows the pointer. */
export function initSpotlight(root) {
  if (reduced()) return () => {};
  const groups = Array.from(root.querySelectorAll("[data-spotlight]"));
  const handlers = [];
  for (const group of groups) {
    const cards = Array.from(group.children);
    const onMove = (event) => {
      for (const card of cards) {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${(event.clientX - rect.left).toFixed(1)}px`);
        card.style.setProperty("--my", `${(event.clientY - rect.top).toFixed(1)}px`);
      }
    };
    group.addEventListener("pointermove", onMove, { passive: true });
    handlers.push(() => group.removeEventListener("pointermove", onMove));
  }
  return () => handlers.forEach((fn) => fn());
}

/* Headings rise one word at a time as they enter the viewport. */
export function initWordReveal(root) {
  const headings = Array.from(root.querySelectorAll("[data-words]"));
  for (const heading of headings) {
    if (heading.dataset.wordsReady) continue;
    heading.dataset.wordsReady = "true";
    const words = heading.textContent.trim().split(/\s+/);
    heading.innerHTML = words.map((word, index) => `<span class="word"><i style="--i:${index}">${word}</i></span>`).join(" ");
    heading.setAttribute("data-reveal", "words");
  }
  return () => {};
}

/* 3D tilt: cards with [data-tilt] lean toward the pointer. */
export function initTilt(root) {
  if (reduced() || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return () => {};
  const cards = Array.from(root.querySelectorAll("[data-tilt]"));
  const handlers = [];
  for (const card of cards) {
    const max = Number(card.dataset.tilt) || 6;
    const onMove = (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.setProperty("--rx", `${(-y * max).toFixed(2)}deg`);
      card.style.setProperty("--ry", `${(x * max).toFixed(2)}deg`);
      card.classList.add("is-tilting");
    };
    const onLeave = () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); card.classList.remove("is-tilting"); };
    card.addEventListener("pointermove", onMove, { passive: true });
    card.addEventListener("pointerleave", onLeave);
    handlers.push(() => { card.removeEventListener("pointermove", onMove); card.removeEventListener("pointerleave", onLeave); });
  }
  return () => handlers.forEach((fn) => fn());
}

/* Signal lines: a looping polyline per [data-signal] host, drawn from
   a seeded series so every model card has its own shape. */
export function initSignals(root) {
  const hosts = Array.from(root.querySelectorAll("[data-signal]"));
  for (const host of hosts) {
    const seed = Number(host.dataset.signal) || 1;
    const points = [];
    let value = 0.5;
    for (let i = 0; i <= 40; i += 1) {
      value += Math.sin(i * 0.9 + seed * 1.7) * 0.11 + Math.cos(i * 0.37 * seed) * 0.05;
      value = Math.max(0.12, Math.min(0.88, value));
      points.push(`${(i * 5).toFixed(1)},${(30 - value * 26).toFixed(1)}`);
    }
    host.innerHTML = `<svg viewBox="0 0 200 32" preserveAspectRatio="none"><polyline points="${points.join(" ")}"/><polyline class="signal-trace" points="${points.join(" ")}"/></svg>`;
  }
  return () => {};
}
