/* ============================================================
   ORB — the original Mere X mark with orbital rings and ambient depth.
   ============================================================ */

import { raw } from "../lib/dom.js";

export function mereXOrb({ label = "Mere X 5.5 · Apex", size = "" } = {}) {
  const mark = '<img src="/brand/mere-x-mark.png" alt="" width="1536" height="1024" draggable="false" />';
  return raw(`
    <div class="hero-visual ${size}">
      <div class="orb mx-cinema" data-orb>
        <span class="mx-cinema-aura"></span>
        <span class="mx-cinema-horizon"></span>
        <span class="mx-cinema-arc mx-arc-near"></span>
        <span class="mx-cinema-arc mx-arc-far"></span>
        <span class="mx-cinema-curtain curtain-left"></span>
        <span class="mx-cinema-curtain curtain-right"></span>
        <div class="mx-ribbon-assembly" role="img" aria-label="The Mere X mark folding into place">
          <span class="mx-ribbon-panel ribbon-left">${mark}</span>
          <span class="mx-ribbon-panel ribbon-right">${mark}</span>
          <img class="mx-logo-final" src="/brand/mere-x-mark.png" alt="" width="1536" height="1024" draggable="false" fetchpriority="high" />
          <span class="mx-join-flare"></span>
          <span class="mx-specular"></span>
        </div>
        <span class="mx-contact-shadow"></span>
        <span class="mx-stage-sweep"></span>
        ${label ? `<span class="mx-cinema-caption"><i></i><span>${label}</span><em>Intelligence system</em></span>` : ""}
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
