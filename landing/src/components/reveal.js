/* ============================================================
   REVEAL — the dual-image background behind the home
   composition. The base portrait is always visible; the second
   portrait shows only inside a soft spotlight that eases toward
   the cursor. A parallax hairline grid sits over both, and a
   scanner reticle rides the spotlight so the lens reads as the
   model looking at the image.

   Desktop only (≥ 1024px), fixed, z-0, never interactive.
   ============================================================ */

const EASE_SPOT = 0.1;
const EASE_GRID = 0.06;
const GRID_DRIFT = 16;

const spotRadius = () => Math.round(Math.min(420, Math.max(160, window.innerWidth * 0.16)));
const gridCell = () => Math.round(Math.min(64, Math.max(36, window.innerWidth * 0.028)));

/* Exact stops: solid to 40%, then 0.75 / 0.4 / 0.12 / 0. */
function spotlightMask(x, y, radius) {
  return `radial-gradient(circle ${radius}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 40%, rgba(255,255,255,0.75) 60%, rgba(255,255,255,0.4) 75%, rgba(255,255,255,0.12) 88%, rgba(255,255,255,0) 100%)`;
}

export function renderRevealBackground() {
  return `
    <div class="reveal-bg" data-reveal-bg aria-hidden="true">
      <div class="reveal-layer is-base"></div>
      <div class="reveal-layer is-top" data-reveal-top></div>
      <svg class="reveal-grid" data-reveal-grid>
        <defs>
          <pattern id="revealGrid" data-reveal-pattern width="48" height="48" patternUnits="userSpaceOnUse" x="0" y="0">
            <path data-reveal-cell d="M 48 0 L 0 0 0 48"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#revealGrid)"/>
      </svg>
      <svg class="reveal-hud" data-reveal-hud>
        <g data-hud-group>
          <g class="ring-spin" data-hud-ring-spin>
            <circle class="ring" data-hud-ring r="120"/>
          </g>
          <g data-hud-ticks></g>
          <path class="cross" data-hud-cross d="M-6 0H6M0-6V6"/>
          <text class="readout" data-hud-readout></text>
        </g>
      </svg>
    </div>`;
}

export function mountRevealBackground(host) {
  const bg = host.querySelector("[data-reveal-bg]");
  if (!bg) return () => {};

  const top = bg.querySelector("[data-reveal-top]");
  const pattern = bg.querySelector("[data-reveal-pattern]");
  const cell = bg.querySelector("[data-reveal-cell]");
  const hud = bg.querySelector("[data-reveal-hud]");
  const group = bg.querySelector("[data-hud-group]");
  const ring = bg.querySelector("[data-hud-ring]");
  const ticks = bg.querySelector("[data-hud-ticks]");
  const readout = bg.querySelector("[data-hud-readout]");

  const reduced = document.documentElement.dataset.motion === "reduced";
  const media = matchMedia("(min-width: 1024px)");

  const mouse = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.42 };
  const smooth = { x: mouse.x, y: mouse.y };
  const grid = { x: 0, y: 0 };
  let radius = spotRadius();
  let frame = 0;
  let moved = false;
  let width = window.innerWidth;
  let height = window.innerHeight;

  const layoutGrid = () => {
    const size = gridCell();
    pattern.setAttribute("width", String(size));
    pattern.setAttribute("height", String(size));
    cell.setAttribute("d", `M ${size} 0 L 0 0 0 ${size}`);
  };

  const layoutHud = () => {
    const r = Math.round(radius * 0.58);
    ring.setAttribute("r", String(r));
    const gap = 8;
    ticks.innerHTML = [
      `M0 ${-r - gap}V${-r - gap - 10}`,
      `M0 ${r + gap}V${r + gap + 10}`,
      `M${-r - gap} 0H${-r - gap - 10}`,
      `M${r + gap} 0H${r + gap + 10}`
    ].map((d) => `<path class="tick" d="${d}"/>`).join("");
    readout.setAttribute("x", String(Math.round(r * 0.72)));
    readout.setAttribute("y", String(Math.round(r * 0.72) + 18));
  };

  const paint = () => {
    const mask = spotlightMask(smooth.x, smooth.y, radius);
    top.style.maskImage = mask;
    top.style.webkitMaskImage = mask;

    pattern.setAttribute("x", grid.x.toFixed(2));
    pattern.setAttribute("y", grid.y.toFixed(2));

    group.setAttribute("transform", `translate(${smooth.x.toFixed(1)} ${smooth.y.toFixed(1)})`);
    readout.textContent = `SCAN · X ${(smooth.x / width).toFixed(3)} · Y ${(smooth.y / height).toFixed(3)}`;
  };

  const tick = () => {
    frame = 0;
    const k = reduced ? 1 : EASE_SPOT;
    smooth.x += (mouse.x - smooth.x) * k;
    smooth.y += (mouse.y - smooth.y) * k;

    // Normalise the smoothed cursor to −0.5…0.5 and drift the grid toward it.
    const cx = smooth.x / width - 0.5;
    const cy = smooth.y / height - 0.5;
    const gk = reduced ? 1 : EASE_GRID;
    grid.x += (cx * GRID_DRIFT - grid.x) * gk;
    grid.y += (cy * GRID_DRIFT - grid.y) * gk;

    paint();

    const settled =
      Math.abs(mouse.x - smooth.x) < 0.05 && Math.abs(mouse.y - smooth.y) < 0.05 &&
      Math.abs(cx * GRID_DRIFT - grid.x) < 0.02 && Math.abs(cy * GRID_DRIFT - grid.y) < 0.02;
    if (!settled) frame = requestAnimationFrame(tick);
  };

  const wake = () => { if (!frame && media.matches) frame = requestAnimationFrame(tick); };

  const onMove = (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    if (!moved) { moved = true; hud.classList.add("is-on"); }
    wake();
  };

  const onResize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    radius = spotRadius();
    layoutGrid();
    layoutHud();
    if (!moved) { mouse.x = width * 0.5; mouse.y = height * 0.42; }
    wake();
  };

  layoutGrid();
  layoutHud();
  paint();
  wake();

  window.addEventListener("mousemove", onMove, { passive: true });
  window.addEventListener("resize", onResize, { passive: true });

  return () => {
    window.removeEventListener("mousemove", onMove);
    window.removeEventListener("resize", onResize);
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
  };
}
