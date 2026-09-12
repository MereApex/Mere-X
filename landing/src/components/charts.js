/* ============================================================
   CHARTS — hand-built SVG charts for the console.
   Deliberately small: one stacked area/line, one bar, one
   donut, one heat strip. All theme-aware via CSS variables.
   ============================================================ */

import { raw } from "../lib/dom.js";
import { compact, dateShort } from "../lib/format.js";

const SERIES_COLORS = ["var(--s1)", "var(--s2)", "var(--s3)", "var(--s4)", "var(--s5)", "var(--s6)"];

function niceMax(value) {
  if (value <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const scaled = value / magnitude;
  const step = scaled <= 1 ? 1 : scaled <= 2 ? 2 : scaled <= 5 ? 5 : 10;
  return step * magnitude;
}

/**
 * Stacked area chart with an optional overlaid line.
 * rows: [{ label, values: [n, n] }]
 */
export function areaChart(rows, { series, height = 220, showAxis = true, id = "ac" } = {}) {
  if (!rows.length) return raw("");
  const W = 1000;
  const H = height;
  const padL = showAxis ? 46 : 4;
  const padB = showAxis ? 24 : 4;
  const padT = 10;
  const innerW = W - padL - 8;
  const innerH = H - padT - padB;

  const totals = rows.map((row) => row.values.reduce((a, b) => a + b, 0));
  const max = niceMax(Math.max(...totals));
  const x = (i) => padL + (i / Math.max(1, rows.length - 1)) * innerW;
  const y = (v) => padT + innerH - (v / max) * innerH;

  // Build cumulative bands, bottom-up.
  const bands = [];
  let baseline = rows.map(() => 0);
  series.forEach((s, si) => {
    const top = rows.map((row, i) => baseline[i] + row.values[si]);
    const upper = top.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
    const lower = baseline
      .map((v, i) => [x(rows.length - 1 - i), y(baseline[rows.length - 1 - i])])
      .map(([px, py], i) => `${i === 0 ? "L" : "L"}${px.toFixed(1)} ${py.toFixed(1)}`)
      .join(" ");
    bands.push({
      path: `${upper} ${lower} Z`,
      line: upper,
      color: s.color || SERIES_COLORS[si % SERIES_COLORS.length],
      label: s.label
    });
    baseline = top;
  });

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const gy = padT + innerH - f * innerH;
    return `<line class="grid-line" x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - 8}" y2="${gy.toFixed(1)}"/>
            ${showAxis ? `<text class="axis-text" x="${padL - 8}" y="${(gy + 3).toFixed(1)}" text-anchor="end">${compact(max * f, 0)}</text>` : ""}`;
  }).join("");

  const step = Math.max(1, Math.ceil(rows.length / 7));
  const xLabels = showAxis
    ? rows.map((row, i) => (i % step === 0 || i === rows.length - 1
        ? `<text class="axis-text" x="${x(i).toFixed(1)}" y="${H - 6}" text-anchor="middle">${row.label}</text>`
        : "")).join("")
    : "";

  return raw(`
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" role="img" aria-label="Usage over time">
      ${gridLines}
      ${bands.map((band, i) => `<path class="series-area" d="${band.path}" fill="${band.color}" style="opacity:${0.16 + i * 0.05}"/>`).join("")}
      ${bands.map((band) => `<path class="series-line draw" d="${band.line}" stroke="${band.color}" style="--len:2600"/>`).join("")}
      ${xLabels}
    </svg>
    <div class="chart-legend">
      ${series.map((s, i) => `<span><i style="background:${s.color || SERIES_COLORS[i % SERIES_COLORS.length]}"></i>${s.label}</span>`).join("")}
    </div>`);
}

/** Vertical bar chart. rows: [{ label, value }] */
export function barChart(rows, { height = 200, color = "var(--s1)", showAxis = true, format = compact } = {}) {
  if (!rows.length) return raw("");
  const W = 1000;
  const H = height;
  const padL = showAxis ? 46 : 4;
  const padB = 24;
  const padT = 10;
  const innerW = W - padL - 8;
  const innerH = H - padT - padB;
  const max = niceMax(Math.max(...rows.map((r) => r.value)));
  const slot = innerW / rows.length;
  const barW = Math.max(2, Math.min(28, slot * 0.62));

  const grid = [0, 0.5, 1].map((f) => {
    const gy = padT + innerH - f * innerH;
    return `<line class="grid-line" x1="${padL}" y1="${gy.toFixed(1)}" x2="${W - 8}" y2="${gy.toFixed(1)}"/>
            ${showAxis ? `<text class="axis-text" x="${padL - 8}" y="${(gy + 3).toFixed(1)}" text-anchor="end">${format(max * f, 0)}</text>` : ""}`;
  }).join("");

  const step = Math.max(1, Math.ceil(rows.length / 8));

  return raw(`
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="height:${H}px" role="img" aria-label="Distribution">
      ${grid}
      ${rows.map((row, i) => {
        const h = (row.value / max) * innerH;
        const bx = padL + i * slot + (slot - barW) / 2;
        return `<rect class="bar" x="${bx.toFixed(1)}" y="${(padT + innerH - h).toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="2" fill="${color}"><title>${row.label}: ${format(row.value)}</title></rect>`;
      }).join("")}
      ${rows.map((row, i) => (i % step === 0 || i === rows.length - 1
        ? `<text class="axis-text" x="${(padL + i * slot + slot / 2).toFixed(1)}" y="${H - 6}" text-anchor="middle">${row.label}</text>`
        : "")).join("")}
    </svg>`);
}

/** Horizontal proportion bars — good for "spend by model". */
export function proportionBars(rows, { format = (v) => compact(v) } = {}) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return raw(`
    <div class="stack stack-4">
      ${rows.map((row, i) => `
        <div>
          <div class="between" style="margin-bottom:7px">
            <span class="small">${row.label}</span>
            <span class="xs mono muted">${format(row.value)}${row.note ? ` · ${row.note}` : ""}</span>
          </div>
          <div class="bench-track" style="height:14px">
            <div class="bench-fill" style="transform:scaleX(${(row.value / max).toFixed(4)});background:${row.color || SERIES_COLORS[i % SERIES_COLORS.length]}"></div>
          </div>
        </div>`).join("")}
    </div>`);
}

/** Donut for a small categorical split. */
export function donut(rows, { size = 168, thickness = 22 } = {}) {
  const total = rows.reduce((sum, r) => sum + r.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = size / 2;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const arcs = rows.map((row, i) => {
    const len = (row.value / total) * circumference;
    const arc = `<circle cx="${c}" cy="${c}" r="${r}" fill="none"
      stroke="${row.color || SERIES_COLORS[i % SERIES_COLORS.length]}" stroke-width="${thickness}"
      stroke-dasharray="${len.toFixed(2)} ${(circumference - len).toFixed(2)}"
      stroke-dashoffset="${(-offset).toFixed(2)}"
      transform="rotate(-90 ${c} ${c})"><title>${row.label}</title></circle>`;
    offset += len;
    return arc;
  }).join("");

  return raw(`
    <div class="row" style="gap:26px;align-items:center;flex-wrap:wrap">
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Split by category">
        <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--paper-deep)" stroke-width="${thickness}"/>
        ${arcs}
      </svg>
      <div class="stack stack-2" style="min-width:150px">
        ${rows.map((row, i) => `
          <div class="between" style="gap:14px">
            <span class="row row-tight xs"><i style="width:9px;height:9px;border-radius:2px;background:${row.color || SERIES_COLORS[i % SERIES_COLORS.length]}"></i>${row.label}</span>
            <span class="xs mono muted">${((row.value / total) * 100).toFixed(1)}%</span>
          </div>`).join("")}
      </div>
    </div>`);
}

/** Daily heat strip — one cell per day. */
export function heatStrip(rows, { max, label = "requests" } = {}) {
  const peak = max || Math.max(...rows.map((r) => r.value), 1);
  return raw(`
    <div style="display:flex;gap:3px;flex-wrap:wrap">
      ${rows.map((row) => {
        const intensity = row.value / peak;
        return `<span title="${row.label}: ${compact(row.value)} ${label}"
          style="width:13px;height:13px;border-radius:3px;background:color-mix(in srgb, var(--s1) ${(12 + intensity * 88).toFixed(0)}%, var(--paper-deep))"></span>`;
      }).join("")}
    </div>`);
}

export function dayLabel(iso) {
  return dateShort(iso).replace(/,\s*\d{4}$/, "");
}
