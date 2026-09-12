# Mere X

The Mere X public platform: marketing pages, product and API documentation,
pricing, and the developer console for the Mere model family.

Cream-and-ink design system, no UI framework, ~84 routes, client-side routed.

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
index.html            app shell — theme bootstrap, fonts, mount point
src/
  main.js             route table, shell assembly, global motion
  lib/
    router.js         history router: patterns, params, progress bar, per-view teardown
    dom.js            html`` tagged template (escapes by default), raw(), copyText()
    icons.js          ~90 hairline icons + the Mere X mark
    motion.js         scroll reveal, counters, parallax, magnetism, cursor glow
    highlight.js      single-pass tokenizer for bash / json / python / js
    format.js         numbers, currency, dates, seeded pseudo-random
    store.js          authenticated console API state + derived selectors
    toast.js          toasts and modals
  components/
    ui.js             buttons, cards, tables, code blocks, accordions, CTA bands
    nav.js            sticky header, mega-menus, mobile drawer, theme toggle
    footer.js         sitemap footer
    charts.js         area / bar / donut / proportion / heat-strip SVG charts
    orb.js            the Mere X mark in its plinth
  data/               models, site map, editorial content, docs pages, API reference
  pages/              one module per marketing route
  console/            one module per console route
  styles/             tokens → base → components → site → console
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

Tokens live in `src/styles/tokens.css`. Both themes are defined there — light on
bare `:root`, dark under `[data-theme="dark"]` — so no component needs to know
which theme is active. Motion respects `prefers-reduced-motion` throughout.

### The console

`src/lib/store.js` hydrates the console from the authenticated `/api/console`
control plane. API keys, workspace identity, payments, request metadata,
administrative activity, usage, and settings come from the Mere X database;
there is no seeded Console state or account-free Console access.

## Notes

The model family is **Mere Apex 5.5** (frontier), **Mere Orion 5.5** (balanced),
and **Mere Nyx 5.5** (fast). Evaluation figures, customer
stories, and platform metrics are illustrative — the benchmark and transparency
pages say so where the numbers appear.

The shared Mere X logo lives in `public/brand/`; the wordmark is rendered as live
text so it remains sharp, accessible, and theme-safe at every size.
