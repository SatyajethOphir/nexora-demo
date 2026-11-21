# NEXORA — E-Commerce Storefront & Installable PWA

**Tagline:** *Discover. Shop. Experience.*

NEXORA is a complete, responsive demonstration e-commerce web application built with React, TypeScript, Vite, Tailwind CSS, and `vite-plugin-pwa`. It is engineered for mobile-first usability, Progressive Web App (PWA) installation, and Trusted Web Activity (TWA) Android packaging using Bubblewrap.

---

## Features Implemented

- **Homepage & Storefront**: Hero showcase, 6 image-based category cards, Featured Products, Promotional Offers banner, Best Sellers, and architectural footer.
- **30-Product Catalogue**: Realistic products across Electronics, Fashion, Home & Living, Accessories, Fitness, and Gaming with Indian Rupee (`₹`) pricing, discounts, ratings, stock counts, and SKUs.
- **Search, Filtering & Sorting**: Live search suggestions, category filtering, price buckets, minimum rating filter, deals-only toggle, sorting (Popularity, Price Low-to-High, High-to-Low, Newest), and helpful empty states.
- **Product Details**: Multi-image gallery switcher, specifications, quantity stepper, Add to Cart, Buy Now, Wishlist toggle, customer reviews, and related items.
- **Shopping Cart & Coupons**: Persistent LocalStorage cart, live subtotal/shipping calculation (`Free shipping` above ₹999), and working demo coupon codes (`NEXORA10`, `WELCOME20`, `FREESHIP`).
- **Demo Authentication**: LocalStorage-based Login, Register, Forgot Password, and Profile management (explicitly labeled as a local demonstration—not production security).
  - Pre-seeded demo credentials: `demo@nexora.shop` / `Demo@1234`
- **Simulated Checkout & Payment**:
  - Step 1: Validated Indian delivery address form (10-digit mobile, 6-digit PIN code).
  - Step 2: Itemized order summary.
  - Step 3: Safe simulated payment options (**UPI**, **Credit Card**, **Debit Card**, **Cash on Delivery**) with a 2-second processing simulation, random or QA-selectable success/failure outcome, and retry flow. Card numbers and CVV are never stored in LocalStorage.
- **My Orders**: LocalStorage order history, transaction reference numbers, itemized order detail modal, and simulated delivery status progression (`Order Placed` → `Processing` → `Shipped` → `Out for Delivery` → `Delivered`).
- **PWA & Android TWA Readiness**:
  - `manifest.json` (`NEXORA Shopping`, `short_name: NEXORA`, `display: standalone`, `theme_color: #111827`).
  - Custom Service Worker (`src/sw.ts`) caching static assets and fonts while excluding checkout/account paths, plus `push` and `notificationclick` handlers.
  - PNG icons (`192x192`, `512x512`, maskable `512x512`, Apple Touch Icon `180x180`) + `offline.html` fallback.
  - In-app `Install App` / iOS guide prompt and offline connectivity indicator.
- **Push Notifications & Testing System (`/notifications` & Profile)**:
  - Explicit user-triggered permission handling (`granted`, `denied`, `default`, `unsupported`) with Enable/Disable controls.
  - Automatic 1-minute notification testing mode (`DEFAULT_TEST_INTERVAL_SECONDS = 60` in `src/data/notifications.ts`) with live countdown timer, next scheduled time, rotating test messages, single-timer cleanup across route navigation, and Start/Stop controls.
  - 6 interactive notification scenarios (General, New Product, Discount, Cart Reminder, Order Confirmation, Shipping Update) with Service Worker click navigation.
  - Modular Web Push service (`src/services/pushNotificationService.ts`) prepared for VAPID authentication and backend `PushManager` subscriptions, clearly distinguishing local foreground timers from closed-app server push.

---

## Local Setup & Commands

```bash
# 1. Install dependencies
npm install

# 2. Start development server on port 3000
npm run dev

# 3. Type-check the codebase
npm run lint

# 4. Build production bundle (includes PWA manifest & service worker)
npm run build

# 5. Preview the production build locally
npm run preview
```

---

## Free Hosting & Deployment Instructions

### Option 1: Vercel (Recommended)
1. Push this repository to GitHub, GitLab, or Bitbucket.
2. Import the repository at [vercel.com](https://vercel.com).
3. Framework Preset: **Vite** · Build Command: `npm run build` · Output Directory: `dist`.
4. Add a `vercel.json` rewrite rule if needed for SPA routes:
   ```json
   {
     "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
   }
   ```

### Option 2: Netlify
1. Connect your repository at [netlify.com](https://netlify.com).
2. Build command: `npm run build` · Publish directory: `dist`.
3. Add `public/_redirects` with `/* /index.html 200` for client-side routing.

### Option 3: Cloudflare Pages
1. Connect your repository in Cloudflare Dashboard → Workers & Pages.
2. Build command: `npm run build` · Build output directory: `dist`.

---

## Converting to an Android App (Bubblewrap TWA)

Once deployed to an HTTPS URL:

1. Install Bubblewrap CLI globally:
   ```bash
   npm install -g @bubblewrap/cli
   ```
2. Initialize the Trusted Web Activity project against your live manifest:
   ```bash
   bubblewrap init --manifest=https://your-nexora-domain.com/manifest.json
   ```
3. Build the signed Android APK / AAB bundle:
   ```bash
   bubblewrap build
   ```
4. Upload `.well-known/assetlinks.json` (generated by Bubblewrap) to `public/.well-known/assetlinks.json` so the Android app launches without the browser address bar.
