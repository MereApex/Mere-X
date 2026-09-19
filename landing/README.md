# Mere X

The Mere X public platform: marketing pages, product and API documentation,
pricing, and the developer console for the Mere model family.

Pure-white, black-ink design system — Orbitron display type over Plus Jakarta Sans,
fluid `clamp()` sizing, no UI framework, ~84 routes, client-side routed.

```bash
# Run these from the repository root:
npm install
npm run dev      # unified build + server on :8787
npm run build    # production bundles into dist/app and dist/site
npm start        # serve landing, workspace, checkout, API, and console
```

## What is in here

| Area | Routes | Notes |
|---|---|---|
| Marketing | `/`, `/research/*`, `/technology/*`, `/products/*`, `/safety/*`, `/company/*` | Research, the model family, products, safety policy, company |
| Pricing | `/pricing` | Plans, per-token rates, and a live cost estimator |
| Docs | `/docs`, `/docs/:slug` | 24 pages, API reference, cookbook, prompt library |
| Console | `/console/*` | Authenticated dashboard, API keys, workspace handoff, usage, logs, billing, limits, organisation, settings |
| Resources | `/changelog`, `/status`, `/support`, `/search` | Plus `/legal/*` |

## Architecture

```
index.html            app shell — fonts, hero image preloads, mount point
src/
  main.js             route table, shell assembly, global motion
  lib/
    router.js         history router: patterns, params, progress bar, per-view teardown
    dom.js            html`` tagged template (escapes by default), raw(), copyText()
    icons.js          ~90 hairline icons + the Mere X mark
    motion.js         scroll reveal, counters, parallax, magnetism
    stack.js          the visitor's model stack (sessionStorage-backed)
    highlight.js      single-pass tokenizer for bash / json / python / js
    format.js         numbers, currency, dates, seeded pseudo-random
    store.js          authenticated console API state + derived selectors
    toast.js          toasts and modals
  components/
    ui.js             buttons, cards, tables, code blocks, accordions, CTA bands
    nav.js            composition header + the four side drawers (models, platform, research, stack)
    footer.js         sitemap footer with the outlined wordmark
    charts.js         area / bar / donut / proportion / heat-strip SVG charts
    reveal.js         the dual-portrait spotlight background behind the home composition
    orb.js            the inline Mere X seal (mereXSeal); mereXOrb is retained for the brand test only
  data/               models, site map, editorial content, docs pages, API reference
  pages/              one module per marketing route
  console/            one module per console route
  styles/             tokens → base → components → shell → site → console
server/index.js       zero-dependency static server with SPA fallback
```

### Page contract

Every route module default-exports:

```js
export default {
  title,          // string or (ctx) => string
  description,    // string or (ctx) => string
  render(ctx),    // returns an HTML string
  mount(root, ctx) // optional — wire up interactivity
};
```

`ctx` carries `path`, `params`, `query`, and `hash`. Register a teardown with
`onLeave(fn)` from the router; it runs before the next view renders.

### Design system

Tokens live in `src/styles/tokens.css`: white paper, black ink, gray accents
(`gray-200` … `gray-600`, slate `#64748b` for the hero grid) and the fluid size
system (`--pad-x`, `--headline`, `--drawer-max`, …) that every surface scales
from. There is one theme. Motion respects `prefers-reduced-motion` throughout.

The home page is a single full-viewport composition: wordmark and nav, the
`FUTURE / FORWARD / INTELLIGENCE` headline with its checker, one CTA, the globe
tagline
(spotlight eased at 0.1, radius `clamp(160, 16vw, 420)`, parallax grid eased at
0.06, and a scanner reticle that rides the lens). Below `lg` the interactive
background is replaced by a bordered still of the base portrait. Both portraits
are served from `public/hero/`.

### The console

`src/lib/store.js` hydrates the console from the authenticated `/api/console`
control plane. API keys, workspace identity, payments, request metadata,
administrative activity, usage, and settings come from the Mere X database;
there is no seeded Console state or account-free Console access.

## Notes

The chat models carry the generation in their name — **Mere Max 5.5**
(frontier), **Mere Core 5.5** (balanced), **Mere Lite 5.5** (fast). The
specialists are named rather than versioned: **Mere Iris** (multimodal),
**Mere Lyra** (realtime voice), **Mere Atlas** (embeddings), and **Mere Aegis**
(safety). Evaluation figures, customer stories, and platform metrics are
illustrative — the benchmark and transparency pages say so where the numbers
appear.

The shared Mere X logo lives in `public/brand/`; the wordmark is rendered as live
text so it remains sharp, accessible, and theme-safe at every size.
