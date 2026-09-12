/* ============================================================
   ORB — the original Mere X mark with orbital rings and ambient depth.
   ============================================================ */

import { raw } from "../lib/dom.js";
import { tickRing } from "../lib/icons.js";

export function mereXOrb({ label = "Mere X 5.5 · Apex", size = "" } = {}) {
  const mark = '<img src="/brand/mere-x-mark.png" alt="" width="1536" height="1024" draggable="false" />';
  return raw(`
    <div class="hero-visual ${size}">
      <div class="orb mx-fold-stage" data-orb>
        <span class="mx-stage-grid"></span>
        ${tickRing(84).value}
        <span class="orb-ring r1"></span>
        <span class="orb-ring r2"></span>
        <span class="orb-ring r3"></span>
        <span class="orb-glow"></span>
        <span class="mx-fold-rail rail-a"></span>
        <span class="mx-fold-rail rail-b"></span>
        <span class="mx-fold-rail rail-c"></span>
        <div class="mx-assembly" role="img" aria-label="The Mere X mark assembling">
          <span class="mx-slice mx-slice-a">${mark}</span>
          <span class="mx-slice mx-slice-b">${mark}</span>
          <span class="mx-slice mx-slice-c">${mark}</span>
          <span class="mx-slice mx-slice-d">${mark}</span>
          <img class="mx-mark-master" src="/brand/mere-x-mark.png" alt="" width="1536" height="1024" draggable="false" fetchpriority="high" />
          <span class="mx-mark-sheen"></span>
          <span class="mx-mark-scan"></span>
        </div>
        <span class="orb-orbit"><i class="orb-satellite"></i><i class="orb-satellite b"></i></span>
        <span class="orb-orbit slow"><i class="orb-satellite b"></i></span>
        <span class="mx-spark spark-a"></span><span class="mx-spark spark-b"></span><span class="mx-spark spark-c"></span>
        ${label ? `<span class="orb-label"><span class="dot dot-live"></span>${label}</span>` : ""}
      </div>
    </div>`);
}

/** A smaller inline version used on model and product pages. */
export function mereXSeal({ size = 96, label } = {}) {
  return raw(`
    <div class="seal" style="width:${size}px">
      <div class="seal-core"></div>
      <img src="/brand/mere-x-mark.png" alt="" class="seal-mark" width="1536" height="1024" />
      ${label ? `<span class="seal-label">${label}</span>` : ""}
    </div>`);
}
