# Mere X

Full-stack local development build for the Mere X AI workspace, featuring the **Mere Apex 4.0** product experience.

## Run locally

```bash
npm install
npm run dev
```

The web app runs on `http://127.0.0.1:5173` and the private API proxy runs on port `8787`.

## Server configuration

Copy `.env.example` to `.env.local`, then set `MERE_API_KEY`, `DATABASE_URL`, and the payment variables needed for your environment. Secrets are read only by the Node server and must never be placed in `VITE_*` variables or committed to Git.

Available features include stateful streaming chat, adaptive reasoning, grounded research with citations, Project knowledge search, multimodal file analysis, Office/PDF creation, image generation and editing, Live Voice, Deep Research, protected computer workflows, autonomous agents and video generation.

Account data, sessions, password resets, complete workspace state, durable share links, protected binary files, background jobs, knowledge mappings, billing events, audit events and rolling usage controls are persisted in MySQL. Migrations are versioned, serialized with a database lock and run before every production deployment.

## Payments

Mere X uses the current PayPal Server SDK and React Web SDK v6 for recurring monthly and annual memberships. Prices and plan IDs are resolved on the server, subscription approval is verified server-side, duplicate events are idempotent, and card data remains inside encrypted hosted payment components. The checkout overlay, confirmation, renewal controls, cancellation, and transaction history remain in the Mere X interface.

Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_CURRENCY`, and the public HTTPS `PUBLIC_APP_URL`. Then create or verify the product, six billing plans, and webhook registration:

```bash
npm run db:migrate
npm run paypal:setup
```

When `PAYPAL_PRODUCT_ID` and the six optional `PAYPAL_*_PLAN_ID` values are blank, the setup creates and persists them automatically. After webhook creation, save the returned webhook ID as `PAYPAL_WEBHOOK_ID` in the deployed service and redeploy. Live renewals, cancellations, failed payments, refunds, and reversals depend on the signed `/api/billing/webhook` endpoint.

## Railway deployment

Connect the web service to the repository and expose the MySQL service to it with a private variable reference:

```text
DATABASE_URL=${{MySQL.MYSQL_URL}}
```

If the database service has a different Railway service name, replace `MySQL` with that exact name. Add `MERE_API_KEY`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=live`, `PAYPAL_CURRENCY`, `PUBLIC_APP_URL`, and `PAYPAL_WEBHOOK_ID` in the web service's Variables tab. Do not use a public proxy URL from inside Railway unless private networking is unavailable.

`railway.json` configures Railpack, the production build, pre-deploy migrations, the start command, `/api/health`, graceful restarts and retry behavior. The server listens on Railway's injected `PORT` and on `0.0.0.0`.

Production check:

```bash
npm run build
npm run db:migrate
npm run db:import:sqlite # one-time import when upgrading an existing local installation
npm run paypal:setup
npm run test:database
npm run test:platform
npm run test:ui
```

The browser product exposes only the Mere X identity. Private routing credentials remain server-side; Live Voice receives a single-use, short-lived session credential.
