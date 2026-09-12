/* ============================================================
   ORB — the original Mere X mark with orbital rings and ambient depth.
   ============================================================ */

import { raw } from "../lib/dom.js";
import { tickRing } from "../lib/icons.js";

export function mereXOrb({ label = "Mere X 5.5 · Apex", size = "" } = {}) {
  return raw(`
    <div class="hero-visual ${size}">
      <div class="orb" data-orb>
        ${tickRing(84).value}
        <span class="orb-ring r1"></span>
        <span class="orb-ring r2"></span>
        <span class="orb-ring r3"></span>
        <span class="orb-glow"></span>
        <img class="orb-mark" src="/brand/mere-x-mark.png" alt="The Mere X mark" width="1536" height="1536" fetchpriority="high" />
        <span class="orb-orbit"><i class="orb-satellite"></i><i class="orb-satellite b"></i></span>
        <span class="orb-orbit slow"><i class="orb-satellite b"></i></span>
        ${label ? `<span class="orb-label"><span class="dot dot-live"></span>${label}</span>` : ""}
      </div>
    </div>`);
}

/** A smaller inline version used on model and product pages. */
export function mereXSeal({ size = 96, label } = {}) {
  return raw(`
    <div class="seal" style="width:${size}px">
      <div class="seal-core"></div>
      <img src="/brand/mere-x-mark.png" alt="" class="seal-mark" />
      ${label ? `<span class="seal-label">${label}</span>` : ""}
    </div>`);
}
