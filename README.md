# Mere X

Full-stack local development build for the Mere X AI workspace, featuring the **Mere Apex 4.0** product experience.

## Run locally

```bash
npm install
npm run dev
```

The web app runs on `http://127.0.0.1:5173` and the private API proxy runs on port `8787`.

## Server configuration

Copy `.env.example` to `.env.local`, then set `MERE_API_KEY`, `DATABASE_URL`, and the integration variables needed for your environment. Secrets are read only by the Node server and must never be placed in `VITE_*` variables or committed to Git.

Available features include stateful streaming chat, adaptive reasoning, grounded research with citations, Project knowledge search, multimodal file analysis, Office/PDF creation, image generation and editing, Live Voice, Deep Research, protected computer workflows, autonomous agents and video generation.

Account data, sessions, password resets, complete workspace state, durable share links, protected binary files, background jobs, knowledge mappings, billing events, audit events and rolling usage controls are persisted in MySQL. Migrations are versioned, serialized with a database lock and run before every production deployment.

## Account verification and Google sign-in

Email signup and password recovery use a six-digit, single-use code that expires after 10 minutes. Set `RESEND_API_KEY`, use a sender on a verified domain in `RESEND_FROM`, and set a unique random `AUTH_CODE_SECRET` of at least 32 characters. Codes are HMAC-protected in MySQL and repeated requests and guesses are rate-limited.

For Google sign-in, create a Google OAuth 2.0 **Web application** client and set `GOOGLE_CLIENT_ID`. Add the exact local and production origins to **Authorized JavaScript origins**, for example `http://localhost:5173`, `http://127.0.0.1:5173`, and `https://YOUR_PUBLIC_DOMAIN`. The browser sends the Google ID token to Mere X, which verifies its signature, issuer, audience and verified-email status on the server. This flow does not require a Google client secret.

## Payments

Mere X uses the current PayPal Server SDK and React Web SDK v6 for recurring monthly and annual memberships. Prices and plan IDs are resolved on the server, subscription approval is verified server-side, duplicate events are idempotent, and card data remains inside encrypted hosted payment components. The checkout overlay, confirmation, renewal controls, cancellation, and transaction history remain in the Mere X interface.

Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_CURRENCY`, and the public HTTPS `PUBLIC_APP_URL`. Then create or verify the product, six billing plans, and webhook registration:

Use a PayPal **REST API Live app** for live subscriptions. The separate **NVP/SOAP Webhooks** application is a legacy integration and its credentials/webhooks are not the correct source for this REST subscription flow.

```bash
npm run db:migrate
npm run paypal:setup
```

When `PAYPAL_PRODUCT_ID` and the six optional `PAYPAL_*_PLAN_ID` values are blank, the setup creates and persists them automatically. After webhook creation, save the returned webhook ID as `PAYPAL_WEBHOOK_ID` in the deployed service and redeploy. Live renewals, cancellations, failed payments, refunds, and reversals depend on the signed `/api/billing/webhook` endpoint.

When adding the webhook manually, use `https://YOUR_PUBLIC_DOMAIN/api/billing/webhook` and subscribe to:

```text
BILLING.SUBSCRIPTION.CREATED
BILLING.SUBSCRIPTION.ACTIVATED
BILLING.SUBSCRIPTION.UPDATED
BILLING.SUBSCRIPTION.SUSPENDED
BILLING.SUBSCRIPTION.CANCELLED
BILLING.SUBSCRIPTION.EXPIRED
BILLING.SUBSCRIPTION.PAYMENT.FAILED
PAYMENT.SALE.COMPLETED
PAYMENT.SALE.DENIED
PAYMENT.SALE.REFUNDED
PAYMENT.SALE.REVERSED
```

## Railway deployment

Connect the web service to the repository and expose the MySQL service to it with a private variable reference:

```text
DATABASE_URL=${{MySQL.MYSQL_URL}}
```

If the database service has a different Railway service name, replace `MySQL` with that exact name. The variable must be added to the **Mere X web service**, not only to the MySQL service; otherwise the pre-deploy migration exits with `DATABASE_URL or MYSQL_URL is required`.

Add the following variables to the web service: `MERE_API_KEY`, all five `MERE_*_MODEL` routes from `.env.example`, `GOOGLE_CLIENT_ID`, `AUTH_CODE_SECRET`, `AUTH_PREVIEW_CODES=false`, `RESEND_API_KEY`, `RESEND_FROM`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV=live`, `PAYPAL_CURRENCY=USD`, `PUBLIC_APP_URL`, and `PAYPAL_WEBHOOK_ID`. Do not add a Google client secret, do not expose server secrets through `VITE_*`, and do not use a public MySQL proxy URL from inside Railway unless private networking is unavailable.

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
