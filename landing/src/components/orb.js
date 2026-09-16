/* ============================================================
   SEAL — the inline Mere X mark used on model and product pages.
   The cinematic hero orb it used to sit beside was retired with the
   rest of the dimensional brand treatment.
   ============================================================ */

import { raw } from "../lib/dom.js";

/** A smaller inline version used on model and product pages. */
export function mereXSeal({ size = 96, label } = {}) {
  return raw(`
    <div class="seal" style="width:${size}px">
      <div class="seal-core"></div>
      <img src="/brand/mere-x-mark-web.png" alt="" class="seal-mark" width="960" height="640" />
      ${label ? `<span class="seal-label">${label}</span>` : ""}
    </div>`);
}
