# NEXORA — E-Commerce Storefront, PWA & Render Web Push Backend

**Tagline:** *Discover. Shop. Experience.*

NEXORA is a complete, responsive e-commerce web application built with React, TypeScript, Vite, Tailwind CSS, `vite-plugin-pwa`, Express, `web-push`, and PostgreSQL.

Production runs in a split architecture:
- **Frontend PWA (Cloudflare Pages)**: Static React/Vite PWA + Service Worker configured to communicate over HTTPS with `https://nexoraapi.sopdev.in`.
- **Backend Push API (Render + PostgreSQL)**: Node.js + Express Web Push service persisted in PostgreSQL, serving `https://nexoraapi.sopdev.in`.

---

## Architecture & Key Capabilities

- **Full E-Commerce Storefront**: 30 curated products across 6 categories, search, filters, cart with demo coupons (`NEXORA10`, `WELCOME20`, `FREESHIP`), wishlist, simulated Indian checkout & payments, and LocalStorage order tracking.
- **PWA & Android TWA Support**: Standalone installable manifest, offline fallback (`offline.html`), custom Service Worker (`src/sw.ts`) with `push`, `pushsubscriptionchange`, and `notificationclick` navigation, preserving existing Android TWA / Digital Asset Links setup.
- **PostgreSQL-Backed Web Push (`server/pushStore.ts`)**:
  - Automatically initializes `push_subscriptions` and `push_admin_config` tables on startup using parameterized `pg` queries.
  - Persists subscriptions across backend restarts and automatically removes expired (`404` / `410`) push endpoints.
  - Provides `GET /api/health` verifying both backend uptime and live PostgreSQL `SELECT 1` connectivity without exposing secrets.
- **Security**:
  - Strict HTTPS-only API routing (`https://nexoraapi.sopdev.in` in production) and origin-restricted CORS allowlist (no wildcards).
  - VAPID private key, database credentials, and admin passcode live exclusively in Render environment variables.
  - Protected Broadcast Admin console uses `scrypt` verification and HMAC Bearer tokens kept solely in React memory.

---

## Deploying the Backend on Render (Node.js + PostgreSQL)

### 1. Create PostgreSQL on Render
1. Open the Render Dashboard → **New +** → **PostgreSQL**.
2. Name the database (e.g., `nexora-push-db`), select your region, and create the instance.
3. Copy the **Internal Database URL** (if your Render Web Service is in the same region) or **External Database URL**.

### 2. Create the Web Service on Render
1. Open Render Dashboard → **New +** → **Web Service** and connect your Git repository.
2. Configure the service settings:
   - **Runtime**: `Node` (uses `engines.node >= 22.18.0` in `package.json`)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start` *(runs `node server.ts`, binding to `0.0.0.0` on `process.env.PORT`)*
   - **Health Check Path**: `/api/health`

### 3. Generate VAPID Keys
Run once locally before setting Render environment variables:
```bash
npx web-push generate-vapid-keys
```

### 4. Configure Render Environment Variables
Add these variables under **Render Service → Environment** (never commit secrets to Git):

| Variable | Value / Example |
|---|---|
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22.23.2` *(optional safety pin if Render does not read `engines`)* |
| `DATABASE_URL` | Your Render PostgreSQL connection string |
| `VAPID_PUBLIC_KEY` | Public key from `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Private key from `npx web-push generate-vapid-keys` |
| `VAPID_SUBJECT` | `mailto:support@sopdev.in` |
| `PUSH_ADMIN_PASSCODE` | Strong passphrase for `/api/push/broadcast` admin login |
| `ALLOWED_ORIGINS` | Comma-separated Cloudflare frontend URL(s), e.g. `https://nexora.sopdev.in,https://sopdev.in,https://www.sopdev.in` |

> **Production Fail-Fast Guarantees (`NODE_ENV=production`):**
> - The server verifies `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` form a valid matching P-256 key pair and never generates ephemeral keys in production.
> - The server requires `DATABASE_URL` and verifies PostgreSQL connectivity (`SELECT 1`) before binding to `process.env.PORT`; startup exits with code `1` if missing or unreachable.
> - On `SIGTERM` / `SIGINT`, active HTTP connections drain cleanly and the PostgreSQL connection pool closes gracefully.
> - In local development (`NODE_ENV !== 'production'`), in-memory storage and ephemeral VAPID keys remain available when env variables are unset.

---

## Custom Domain Setup (`nexoraapi.sopdev.in`) via Cloudflare DNS

1. In **Render Dashboard → Web Service → Settings → Custom Domains**, click **Add Custom Domain** and enter:
   `nexoraapi.sopdev.in`
2. Render will display a **CNAME target** (e.g., `your-service-name.onrender.com`).
3. Open **Cloudflare Dashboard → `sopdev.in` → DNS → Records**, and add **only** the subdomain record:
   - **Type**: `CNAME`
   - **Name**: `nexoraapi`
   - **Target**: `<your-render-service>.onrender.com`
   - **Proxy status**: Start with **DNS only (grey cloud)** while Render verifies and issues the TLS certificate. Once Render shows **Certificate Issued / Verified**, you may keep DNS only or enable Cloudflare Proxied (Full Strict SSL).
   - **Do not** modify existing root-domain (`sopdev.in`) or NEXORA website DNS records.
4. Verify health & DB connectivity:
   ```bash
   curl https://nexoraapi.sopdev.in/api/health
   ```
   Expected response:
   ```json
   {
     "ok": true,
     "service": "nexora-web-push",
     "database": "connected",
     "storage": "postgresql",
     "vapidConfigured": true
   }
   ```

---

## Cloudflare Pages Frontend Configuration

- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Build output directory**: `dist`
- **Environment variable** (optional since `https://nexoraapi.sopdev.in` is the built-in production default):
  ```env
  VITE_API_BASE_URL=https://nexoraapi.sopdev.in
  ```

---

## Production Validation Checklist

Once Render (`https://nexoraapi.sopdev.in`) and Cloudflare are live, verify every step end-to-end:

1. **Health Check**: `GET https://nexoraapi.sopdev.in/api/health` returns `200 OK` with `"database": "connected"` and `"vapidConfigured": true`.
2. **Subscription Registration & Persistence**: Open NEXORA → `/notifications` → **Enable Notifications** → confirm `POST /api/push/subscribe` returns `201 Created` and a row exists in PostgreSQL `push_subscriptions`.
3. **Closed-App Delivery**: Click **Send Delayed Push (5s — Close App to Test)**, close the browser tab/PWA/Android TWA immediately, and confirm the OS notification arrives after ~5 seconds.
4. **Notification Click Routing**: Tap the received OS notification while the app is closed and confirm it launches NEXORA directly to the payload route (`/notifications`, `/orders`, or product route).
5. **Restart Survival**: Restart the Render Web Service, then trigger another push notification without re-subscribing to confirm PostgreSQL persistence works across restarts.
6. **Expired Subscription Pruning**: Revoke notification permission or clear site storage in a test browser, run a Broadcast Campaign from `/notifications`, and confirm the server reports `removedExpired` and removes the stale row from PostgreSQL (`404`/`410`).

---

## Local Development Commands

```bash
# Install dependencies
npm install

# Run local Express + Vite dev server on port 3000
npm run dev

# Type-check codebase
npm run lint

# Build production PWA bundle
npm run build
```
