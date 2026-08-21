# Mere X

Full-stack local development build for the Mere X AI workspace, featuring the **Mere Apex 4.0** product experience.

## Run locally

```bash
npm install
npm run dev
```

The web app runs on `http://127.0.0.1:5173` and the private API proxy runs on port `8787`.

## Server configuration

Copy `.env.example` to `.env.local` and set `MERE_API_KEY`. The secret is read only by the Node server and must never be placed in a `VITE_*` variable or committed to Git.

Available features include stateful streaming chat, adaptive reasoning, grounded research with citations, Project knowledge search, multimodal file analysis, Office/PDF creation, image generation and editing, Live Voice, Deep Research, protected computer workflows, autonomous agents and video generation.

Account data, workspaces, durable share links, protected files, background jobs and rolling usage controls are stored by the local application database under `data/` (ignored by Git). Billing checkout URLs and webhook verification are configured through the server-only variables documented in `.env.example`.

Production check:

```bash
npm run build
npm run test:platform
npm run test:ui
```

The browser product exposes only the Mere X identity. Private routing credentials remain server-side; Live Voice receives a single-use, short-lived session credential.
