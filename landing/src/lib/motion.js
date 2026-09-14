/* ============================================================
   MOTION — scroll reveal, counters, parallax, magnetism, tilt.
   Every effect degrades to "no motion" when the user asks for it.
   ============================================================ */

const reduced = () => document.documentElement.dataset.motion === "reduced";

let revealObserver = null;

function countText(node, value) {
  const decimals = Number(node.dataset.countDecimals || 0);
  const prefix = node.dataset.countPrefix || "";
  const suffix = node.dataset.countSuffix || "";
  return prefix + value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }) + suffix;
}

/** Reveal elements as they enter the viewport, honouring [data-stagger]. */
export function initReveal(scope = document) {
  if (reduced()) {
    scope.querySelectorAll("[data-reveal], [data-count], .bench, .mode-cell, .tl-item").forEach((node) => node.classList.add("is-in"));
    scope.querySelectorAll("[data-count]").forEach((node) => {
      const target = Number(node.dataset.count);
      node.textContent = node.dataset.countText || (Number.isFinite(target) ? countText(node, target) : node.dataset.count);
    });
    return () => {};
  }

  if (!revealObserver) {
    revealObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        if (entry.target.hasAttribute("data-count")) animateCount(entry.target);
        revealObserver.unobserve(entry.target);
      }
    }, { rootMargin: "0px 0px -3% 0px", threshold: 0.05 });
  }

  scope.querySelectorAll("[data-stagger]").forEach((group) => {
    const step = Number(group.dataset.stagger) || 70;
    Array.from(group.children).forEach((child, index) => {
      child.style.setProperty("--reveal-delay", `${index * step}ms`);
    });
  });

  const targets = scope.querySelectorAll("[data-reveal], [data-count], .bench, .mode-cell, .tl-item, .metric");
  targets.forEach((node) => revealObserver.observe(node));

  return () => targets.forEach((node) => revealObserver && revealObserver.unobserve(node));
}

/** Count-up animation driven by data-count / data-count-prefix / data-count-suffix. */
export function animateCount(node) {
  const target = Number(node.dataset.count);
  if (!Number.isFinite(target) || node.dataset.countRunning === "true") return;
  node.dataset.countRunning = "true";
  const duration = Number(node.dataset.countDuration || 1400);
  const start = performance.now();

  const step = (now) => {
    // Some browsers can deliver a frame timestamp from just before this
    // animation was scheduled (especially after a theme or tab transition).
    // Clamp both ends so counters never flash negative or overshoot.
    const t = Math.max(0, Math.min(1, (now - start) / duration));
    const eased = 1 - Math.pow(1 - t, 3);
    const value = target * eased;
    node.textContent = countText(node, value);
    if (t < 1) requestAnimationFrame(step);
    else {
      node.textContent = countText(node, target);
      delete node.dataset.countRunning;
    }
  };
  requestAnimationFrame(step);
}

/** Pointer-following spotlight for `.card-spot`. */
export function initSpotlights(scope = document) {
  if (reduced()) return () => {};
  const handler = (event) => {
    const card = event.target instanceof Element ? event.target.closest(".card-spot") : null;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--mx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    card.style.setProperty("--my", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  };
  scope.addEventListener("pointermove", handler, { passive: true });
  return () => scope.removeEventListener("pointermove", handler);
}

/** Subtle parallax + 3D tilt for the hero orb. */
export function initOrbParallax(root) {
  const orb = root.querySelector("[data-orb]");
  if (!orb || reduced()) return () => {};

  let raf = 0;
  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;

  const onMove = (event) => {
    const rect = orb.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    targetX = Math.max(-1, Math.min(1, (event.clientX - cx) / (window.innerWidth / 2)));
    targetY = Math.max(-1, Math.min(1, (event.clientY - cy) / (window.innerHeight / 2)));
    if (!raf) raf = requestAnimationFrame(tick);
  };

  const tick = () => {
    x += (targetX - x) * 0.06;
    y += (targetY - y) * 0.06;
    orb.style.transform = `rotateY(${x * 9}deg) rotateX(${-y * 7}deg) translate3d(${x * 10}px, ${y * 8}px, 0)`;
    if (Math.abs(targetX - x) > 0.001 || Math.abs(targetY - y) > 0.001) raf = requestAnimationFrame(tick);
    else raf = 0;
  };

  window.addEventListener("pointermove", onMove, { passive: true });
  return () => { window.removeEventListener("pointermove", onMove); if (raf) cancelAnimationFrame(raf); };
}

/** Slight scroll-linked drift for anything with [data-parallax="0.2"]. */
export function initScrollParallax(root) {
  if (reduced()) return () => {};
  const nodes = Array.from(root.querySelectorAll("[data-parallax]"));
  if (!nodes.length) return () => {};

  let raf = 0;
  const update = () => {
    raf = 0;
    const vh = window.innerHeight;
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      if (rect.bottom < -200 || rect.top > vh + 200) continue;
      const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
      const depth = Number(node.dataset.parallax) || 0.15;
      node.style.transform = `translate3d(0, ${(-progress * depth * 100).toFixed(2)}px, 0)`;
    }
  };
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
  return () => {
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("resize", onScroll);
    if (raf) cancelAnimationFrame(raf);
  };
}

/** Buttons that lean toward the cursor. */
export function initMagnetic(root) {
  if (reduced() || matchMedia("(pointer: coarse)").matches) return () => {};
  const nodes = Array.from(root.querySelectorAll("[data-magnetic]"));
  const cleanups = nodes.map((node) => {
    const strength = Number(node.dataset.magnetic) || 0.28;
    const move = (event) => {
      const rect = node.getBoundingClientRect();
      const dx = event.clientX - (rect.left + rect.width / 2);
      const dy = event.clientY - (rect.top + rect.height / 2);
      node.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
    };
    const reset = () => { node.style.transform = ""; };
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", reset);
    return () => {
      node.removeEventListener("pointermove", move);
      node.removeEventListener("pointerleave", reset);
    };
  });
  return () => cleanups.forEach((fn) => fn());
}

/** The soft light that trails the cursor across the page. */
export function initCursorGlow() {
  if (reduced() || matchMedia("(pointer: coarse)").matches) return () => {};
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.append(glow);

  let raf = 0;
  let tx = 0; let ty = 0; let cx = 0; let cy = 0;
  const move = (event) => {
    tx = event.clientX; ty = event.clientY;
    glow.classList.add("is-on");
    if (!raf) raf = requestAnimationFrame(tick);
  };
  const tick = () => {
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    glow.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
    raf = Math.abs(tx - cx) > 0.4 || Math.abs(ty - cy) > 0.4 ? requestAnimationFrame(tick) : 0;
  };
  const leave = () => glow.classList.remove("is-on");

  window.addEventListener("pointermove", move, { passive: true });
  document.addEventListener("pointerleave", leave);
  return () => {
    window.removeEventListener("pointermove", move);
    document.removeEventListener("pointerleave", leave);
    if (raf) cancelAnimationFrame(raf);
    glow.remove();
  };
}

/** Split a heading into per-word spans that rise in sequence. */
export function splitWords(node, step = 55, offset = 90, accent = null) {
  if (!node) return;
  const words = node.textContent.trim().split(/\s+/);
  node.innerHTML = words
    .map((word, index) => {
      const isAccent = accent && word.replace(/[^A-Za-z]/g, "").toLowerCase() === accent.toLowerCase();
      return `<span class="word" style="--wd:${offset + index * step}ms">${isAccent ? `<span class="hl">${word}</span>` : word}</span>`;
    })
    .join(" ");
}

/** Type a string into a node, resolving when finished. */
export function typeInto(node, text, { speed = 16, onTick } = {}) {
  if (reduced()) { node.textContent = text; return Promise.resolve(); }
  return new Promise((resolve) => {
    let index = 0;
    const step = () => {
      const chunk = Math.max(1, Math.round(Math.random() * 3));
      index = Math.min(text.length, index + chunk);
      node.textContent = text.slice(0, index);
      if (onTick) onTick(index / text.length);
      if (index < text.length) setTimeout(step, speed + Math.random() * speed);
      else resolve();
    };
    step();
  });
}

/** Animate a segmented control thumb to the active button. */
export function moveSegThumb(seg) {
  const thumb = seg.querySelector(".seg-thumb");
  const active = seg.querySelector(".seg-btn.is-active");
  if (!thumb || !active) return;
  thumb.style.width = `${active.offsetWidth}px`;
  thumb.style.transform = `translateX(${active.offsetLeft - 3}px)`;
}
