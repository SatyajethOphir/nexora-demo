import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { createRequire } from 'node:module';
import path from 'node:path';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import type WebPushModule from 'web-push';

const require = createRequire(import.meta.url);
const webpush = require('web-push') as typeof WebPushModule;

import {
  checkDatabaseHealth,
  claimAdminPasscodeOnce,
  closePushStore,
  countSubscriptions,
  findSubscriptionByEndpoint,
  getAdminPasscodeRecord,
  initPushStore,
  isSafePushEndpoint,
  listSubscriptions,
  markSubscriptionSuccess,
  removeSubscriptionByEndpoint,
  sanitizeNotificationPayload,
  upsertSubscription,
  validateSubscriptionInput,
  verifyScryptPasscode,
} from './server/pushStore.ts';
import type { StoredPushSubscription, ValidatedNotificationPayload } from './server/pushStore.ts';

const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

function verifyVapidKeyPair(publicKey: string, privateKey: string): void {
  let pubBuf: Buffer;
  let privBuf: Buffer;
  try {
    pubBuf = Buffer.from(publicKey, 'base64url');
    privBuf = Buffer.from(privateKey, 'base64url');
  } catch {
    throw new Error('VAPID keys must be valid base64url strings.');
  }

  if (privBuf.length !== 32 || pubBuf.length !== 65 || pubBuf[0] !== 0x04) {
    throw new Error(
      'Invalid VAPID key dimensions: expected 65-byte uncompressed P-256 public key and 32-byte private key.'
    );
  }

  const ecdh = crypto.createECDH('prime256v1');
  ecdh.setPrivateKey(privBuf);
  const derivedPub = ecdh.getPublicKey();

  if (derivedPub.length !== pubBuf.length || !crypto.timingSafeEqual(derivedPub, pubBuf)) {
    throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY do not form a matching P-256 key pair.');
  }
}

function initializeVapidConfiguration(): {
  publicKey: string;
  usingEphemeralVapid: boolean;
} {
  const envPublicKey = (process.env.VAPID_PUBLIC_KEY || '').trim();
  const envPrivateKey = (process.env.VAPID_PRIVATE_KEY || '').trim();
  const vapidSubject = (process.env.VAPID_SUBJECT || 'mailto:support@nexora.demo').trim();

  if (IS_PRODUCTION) {
    if (!envPublicKey || !envPrivateKey) {
      throw new Error(
        'VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables are required when NODE_ENV=production.'
      );
    }
    verifyVapidKeyPair(envPublicKey, envPrivateKey);
    webpush.setVapidDetails(vapidSubject, envPublicKey, envPrivateKey);
    return { publicKey: envPublicKey, usingEphemeralVapid: false };
  }

  if (envPublicKey && envPrivateKey) {
    verifyVapidKeyPair(envPublicKey, envPrivateKey);
    webpush.setVapidDetails(vapidSubject, envPublicKey, envPrivateKey);
    return { publicKey: envPublicKey, usingEphemeralVapid: false };
  }

  // Ephemeral fallback permitted in local development only
  const generated = webpush.generateVAPIDKeys();
  verifyVapidKeyPair(generated.publicKey, generated.privateKey);
  webpush.setVapidDetails(vapidSubject, generated.publicKey, generated.privateKey);
  return { publicKey: generated.publicKey, usingEphemeralVapid: true };
}

let activeVapidPublicKey = '';
let usingEphemeralVapid = false;

// Signing secret for in-memory Bearer admin tokens
const SESSION_SECRET =
  (process.env.PUSH_SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');

// Strict origin allowlist (no wildcard CORS)
function buildAllowedOrigins(): Set<string> {
  const allowed = new Set<string>([
    'https://sopdev.in',
    'https://www.sopdev.in',
    'https://nexora.sopdev.in',
    'https://nexoraapi.sopdev.in',
  ]);

  const envOrigins = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim().replace(/\/+$/, ''))
    .filter((o) => o.startsWith('https://'));

  for (const origin of envOrigins) {
    allowed.add(origin);
  }

  const appUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (appUrl && appUrl.startsWith('https://')) {
    try {
      allowed.add(new URL(appUrl).origin);
    } catch {
      // Ignore malformed APP_URL
    }
  }

  if (!IS_PRODUCTION) {
    allowed.add(`http://localhost:${PORT}`);
    allowed.add(`http://127.0.0.1:${PORT}`);
    allowed.add('http://localhost:3000');
    allowed.add('http://127.0.0.1:3000');
    allowed.add('http://localhost:5173');
  }

  return allowed;
}

const ALLOWED_ORIGINS = buildAllowedOrigins();

function signAdminToken(): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + 60 * 60 * 1000;
  const payload = Buffer.from(JSON.stringify({ role: 'push-admin', exp: expiresAt })).toString(
    'base64url'
  );
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  return { token: `${payload}.${sig}`, expiresAt };
}

function verifyAdminToken(authHeader: string | undefined): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7).trim();
  const dotIdx = token.indexOf('.');
  if (dotIdx <= 0) return false;

  const payload = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return false;
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      role?: string;
      exp?: number;
    };
    return decoded.role === 'push-admin' && typeof decoded.exp === 'number' && decoded.exp > Date.now();
  } catch {
    return false;
  }
}

// Per-IP sliding window rate limiter
const rateBuckets = new Map<string, number[]>();
function createRateLimit(maxPerMinute: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = `${req.path}:${req.ip || 'unknown'}`;
    const now = Date.now();
    const recent = (rateBuckets.get(key) || []).filter((ts) => now - ts < 60_000);
    if (recent.length >= maxPerMinute) {
      res.status(429).json({ ok: false, error: 'Too many requests. Please wait a moment.' });
      return;
    }
    recent.push(now);
    rateBuckets.set(key, recent);
    next();
  };
}

async function deliverPushToSubscription(
  sub: StoredPushSubscription,
  payload: ValidatedNotificationPayload
): Promise<{ ok: boolean; expired?: boolean; statusCode?: number; error?: string }> {
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: sub.keys,
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url,
        tag: payload.tag,
        scenario: payload.scenario,
        sentAt: new Date().toISOString(),
      }),
      {
        TTL: 60 * 60,
        urgency: 'high',
      }
    );
    await markSubscriptionSuccess(sub.endpoint);
    return { ok: true };
  } catch (err) {
    const statusCode =
      err && typeof err === 'object' && 'statusCode' in err
        ? Number((err as { statusCode?: number }).statusCode)
        : 500;

    if (statusCode === 404 || statusCode === 410) {
      await removeSubscriptionByEndpoint(sub.endpoint);
      return { ok: false, expired: true, statusCode, error: 'Subscription expired and removed.' };
    }

    const message = err instanceof Error ? err.message : 'Push delivery failed.';
    return { ok: false, statusCode, error: message };
  }
}

const pendingDelayedTimers = new Set<ReturnType<typeof setTimeout>>();

async function startServer() {
  const vapidState = initializeVapidConfiguration();
  activeVapidPublicKey = vapidState.publicKey;
  usingEphemeralVapid = vapidState.usingEphemeralVapid;

  let initialDbStatus;
  try {
    initialDbStatus = await initPushStore({ requireDatabase: IS_PRODUCTION });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Database initialization failed.';
    if (IS_PRODUCTION) {
      throw new Error(`PostgreSQL startup failed in production: ${message}`);
    }
    console.warn(`PostgreSQL unavailable in development (${message}); using in-memory preview store.`);
    initialDbStatus = { configured: false, connected: false, storage: 'memory-preview' as const };
  }

  if (IS_PRODUCTION && !initialDbStatus.connected) {
    throw new Error('PostgreSQL connection is required in production. Terminating startup.');
  }

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '64kb' }));

  // Baseline security headers & HTTPS enforcement on API routes in production
  app.use('/api', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Robots-Tag', 'noindex');

    if (
      IS_PRODUCTION &&
      req.headers['x-forwarded-proto'] === 'http' &&
      req.path !== '/health'
    ) {
      res.status(403).json({ ok: false, error: 'HTTPS is required for all API requests.' });
      return;
    }

    const rawOrigin = req.headers.origin;
    const normalizedOrigin = rawOrigin ? rawOrigin.trim().replace(/\/+$/, '') : '';
    const isAllowedOrigin = normalizedOrigin ? ALLOWED_ORIGINS.has(normalizedOrigin) : false;

    if (isAllowedOrigin) {
      res.setHeader('Access-Control-Allow-Origin', normalizedOrigin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Max-Age', '86400');
    }

    if (req.method === 'OPTIONS') {
      if (normalizedOrigin && !isAllowedOrigin) {
        res.status(403).json({ ok: false, error: 'Origin not allowed by CORS policy.' });
        return;
      }
      res.status(204).end();
      return;
    }

    next();
  });

  // Health-check endpoint verifying backend & PostgreSQL connectivity without exposing secrets
  app.get('/api/health', async (_req, res) => {
    const db = await checkDatabaseHealth();
    const healthy = db.configured ? db.connected : !IS_PRODUCTION;
    res.status(healthy ? 200 : 503).json({
      ok: healthy,
      service: 'nexora-web-push',
      database: db.configured ? (db.connected ? 'connected' : 'disconnected') : 'not_configured',
      storage: db.storage,
      vapidConfigured: !usingEphemeralVapid,
      timestamp: new Date().toISOString(),
    });
  });

  // Public VAPID key configuration
  app.get('/api/push/vapid-public-key', (_req, res) => {
    res.json({
      publicKey: activeVapidPublicKey,
      ephemeral: usingEphemeralVapid,
      subjectConfigured: Boolean(process.env.VAPID_SUBJECT),
    });
  });

  // Register or refresh a browser / Android TWA PushSubscription in PostgreSQL
  app.post('/api/push/subscribe', createRateLimit(30), async (req, res) => {
    const validated = validateSubscriptionInput(req.body?.subscription);
    if (!validated) {
      res.status(400).json({
        ok: false,
        error: 'Invalid PushSubscription object or unsupported push endpoint.',
      });
      return;
    }

    try {
      const userAgent = String(req.headers['user-agent'] || '');
      const saved = await upsertSubscription(validated, userAgent);
      res.status(201).json({
        ok: true,
        subscriptionId: saved.id,
        updatedAt: saved.updatedAt,
      });
    } catch {
      res.status(500).json({ ok: false, error: 'Failed to persist push subscription.' });
    }
  });

  // Remove a PushSubscription
  app.post('/api/push/unsubscribe', createRateLimit(30), async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (!isSafePushEndpoint(endpoint)) {
      res.status(400).json({ ok: false, error: 'Invalid subscription endpoint.' });
      return;
    }

    try {
      const removed = await removeSubscriptionByEndpoint(endpoint);
      res.json({ ok: true, removed });
    } catch {
      res.status(500).json({ ok: false, error: 'Failed to remove push subscription.' });
    }
  });

  // Send a genuine server-triggered Web Push strictly to caller's own registered endpoint
  app.post('/api/push/send-test', createRateLimit(20), async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (!isSafePushEndpoint(endpoint)) {
      res.status(400).json({ ok: false, error: 'Valid registered push endpoint is required.' });
      return;
    }

    const subscription = await findSubscriptionByEndpoint(endpoint).catch(() => undefined);
    if (!subscription) {
      res.status(404).json({
        ok: false,
        error: 'Subscription not registered on server. Please enable Background Web Push first.',
      });
      return;
    }

    const payload = sanitizeNotificationPayload(req.body?.notification) || {
      title: 'NEXORA Background Push',
      body: 'Delivered directly via Web Push (VAPID) — works even when NEXORA is closed.',
      url: '/notifications',
      tag: `nexora-test-${Date.now()}`,
      scenario: 'background-test',
    };

    const rawDelay = Number(req.body?.delaySeconds || 0);
    const delaySeconds = Number.isFinite(rawDelay) ? Math.min(15, Math.max(0, Math.round(rawDelay))) : 0;

    if (delaySeconds > 0) {
      const scheduledFor = new Date(Date.now() + delaySeconds * 1000).toISOString();
      const timer = setTimeout(() => {
        pendingDelayedTimers.delete(timer);
        void deliverPushToSubscription(subscription, payload);
      }, delaySeconds * 1000);
      pendingDelayedTimers.add(timer);
      res.status(202).json({
        ok: true,
        scheduled: true,
        delaySeconds,
        scheduledFor,
        message: `Server scheduled real Web Push delivery in ${delaySeconds} seconds. You can minimize or close NEXORA now.`,
      });
      return;
    }

    const result = await deliverPushToSubscription(subscription, payload);
    if (!result.ok) {
      res.status(result.expired ? 410 : 502).json({
        ok: false,
        expired: Boolean(result.expired),
        error: result.error || 'Failed to deliver Web Push message.',
      });
      return;
    }

    res.json({
      ok: true,
      delivered: true,
      message: 'Real Web Push payload dispatched to push service.',
    });
  });

  // Send real Web Push for caller's own order & shipping updates
  app.post('/api/push/order-event', createRateLimit(20), async (req, res) => {
    const endpoint = req.body?.endpoint;
    if (!isSafePushEndpoint(endpoint)) {
      res.status(400).json({ ok: false, error: 'Valid endpoint required.' });
      return;
    }

    const subscription = await findSubscriptionByEndpoint(endpoint).catch(() => undefined);
    if (!subscription) {
      res.status(404).json({ ok: false, error: 'Subscription not found.' });
      return;
    }

    const payload = sanitizeNotificationPayload(req.body?.notification);
    if (!payload) {
      res.status(400).json({ ok: false, error: 'Invalid notification payload.' });
      return;
    }

    const result = await deliverPushToSubscription(subscription, payload);
    if (!result.ok) {
      res.status(result.expired ? 410 : 502).json({ ok: false, error: result.error });
      return;
    }
    res.json({ ok: true, delivered: true });
  });

  // Push Admin Status (Bearer token required to read subscriber count)
  app.get('/api/push/admin/status', async (req, res) => {
    const envPasscode = (process.env.PUSH_ADMIN_PASSCODE || '').trim();
    const claimed = Boolean(await getAdminPasscodeRecord().catch(() => null));
    const authenticated = verifyAdminToken(req.headers.authorization);

    res.json({
      configuredViaEnv: Boolean(envPasscode),
      claimed,
      authenticated,
      ...(authenticated ? { subscriberCount: await countSubscriptions().catch(() => 0) } : {}),
    });
  });

  // First-run inline admin setup when PUSH_ADMIN_PASSCODE env is unset
  app.post('/api/push/admin/claim', createRateLimit(10), async (req, res) => {
    const envPasscode = (process.env.PUSH_ADMIN_PASSCODE || '').trim();
    if (envPasscode) {
      res.status(403).json({
        ok: false,
        error: 'Admin passcode is configured via server environment.',
      });
      return;
    }

    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (passcode.length < 6 || passcode.length > 128) {
      res.status(400).json({
        ok: false,
        error: 'Choose an admin passcode between 6 and 128 characters.',
      });
      return;
    }

    try {
      const claimed = await claimAdminPasscodeOnce(passcode);
      if (!claimed) {
        res.status(409).json({
          ok: false,
          error: 'Admin passcode has already been claimed. Please sign in instead.',
        });
        return;
      }

      const session = signAdminToken();
      res.status(201).json({
        ok: true,
        token: session.token,
        expiresAt: session.expiresAt,
        subscriberCount: await countSubscriptions(),
      });
    } catch {
      res.status(500).json({ ok: false, error: 'Failed to store admin passcode.' });
    }
  });

  // Admin Sign-In for Broadcast Campaigns
  app.post('/api/push/admin/login', createRateLimit(15), async (req, res) => {
    const passcode = typeof req.body?.passcode === 'string' ? req.body.passcode.trim() : '';
    if (!passcode) {
      res.status(400).json({ ok: false, error: 'Passcode is required.' });
      return;
    }

    const envPasscode = (process.env.PUSH_ADMIN_PASSCODE || '').trim();
    let valid = false;

    if (envPasscode) {
      const a = Buffer.from(passcode);
      const b = Buffer.from(envPasscode);
      valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    } else {
      const claimedRecord = await getAdminPasscodeRecord().catch(() => null);
      if (!claimedRecord) {
        res.status(409).json({
          ok: false,
          needsClaim: true,
          error: 'No admin passcode configured yet. Set one below first.',
        });
        return;
      }
      valid = verifyScryptPasscode(passcode, claimedRecord);
    }

    if (!valid) {
      res.status(401).json({ ok: false, error: 'Invalid admin passcode.' });
      return;
    }

    const session = signAdminToken();
    res.json({
      ok: true,
      token: session.token,
      expiresAt: session.expiresAt,
      subscriberCount: await countSubscriptions().catch(() => 0),
    });
  });

  // Protected Broadcast Push Endpoint (delivers real Web Push to all PostgreSQL subscribers)
  app.post('/api/push/broadcast', createRateLimit(15), async (req, res) => {
    if (!verifyAdminToken(req.headers.authorization)) {
      res.status(401).json({ ok: false, error: 'Admin authentication required.' });
      return;
    }

    const payload = sanitizeNotificationPayload(req.body);
    if (!payload) {
      res.status(400).json({ ok: false, error: 'Valid title, body, and relative URL are required.' });
      return;
    }

    const subscribers = await listSubscriptions().catch(() => []);
    if (subscribers.length === 0) {
      res.status(200).json({
        ok: true,
        sent: 0,
        failed: 0,
        removedExpired: 0,
        subscriberCount: 0,
        message: 'No subscribed devices currently registered.',
      });
      return;
    }

    const results = await Promise.all(
      subscribers.map((sub) => deliverPushToSubscription(sub, payload))
    );

    const sent = results.filter((r) => r.ok).length;
    const removedExpired = results.filter((r) => r.expired).length;
    const failed = results.length - sent;

    res.json({
      ok: true,
      sent,
      failed,
      removedExpired,
      subscriberCount: await countSubscriptions().catch(() => Math.max(0, subscribers.length - removedExpired)),
    });
  });

  const httpServer = http.createServer(app);

  // Frontend serving: Vite middleware in development; static dist/ (if present) or clean API root in production
  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const viteHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: !viteHmrDisabled,
        ws: viteHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });

    if (viteHmrDisabled) {
      app.get('/@vite/client', async (_req, res, next) => {
        try {
          const transformed = await vite.transformRequest('/@vite/client');
          if (!transformed) {
            next();
            return;
          }
          const patched = transformed.code
            .replace(
              'transport.connect(createHMRHandler(handleMessage));',
              '/* HMR WebSocket disabled via DISABLE_HMR=true */'
            )
            .replace(
              'ws.send(JSON.stringify(data));',
              'ws?.readyState === 1 && ws.send(JSON.stringify(data));'
            );
          res.type('application/javascript').send(patched);
        } catch {
          next();
        }
      });
    }

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    const indexPath = path.join(distDir, 'index.html');

    if (fs.existsSync(indexPath)) {
      app.use(express.static(distDir, { index: false }));
      app.get('*', (req, res, next) => {
        if (req.path.startsWith('/api/')) {
          next();
          return;
        }
        res.sendFile(indexPath);
      });
    } else {
      // Standalone API mode (e.g. Render backend while Cloudflare serves the frontend)
      app.get('/', (_req, res) => {
        res.json({
          ok: true,
          service: 'nexora-web-push',
          health: '/api/health',
        });
      });
      app.use((req, res) => {
        res.status(404).json({ ok: false, error: `Route not found: ${req.path}` });
      });
    }
  }

  const server = httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(
      `NEXORA push server listening on http://0.0.0.0:${PORT} (${
        IS_PRODUCTION ? 'production' : 'development'
      }, DB=${initialDbStatus.storage}${initialDbStatus.connected ? ':connected' : ':unconnected'}, VAPID=${
        usingEphemeralVapid ? 'ephemeral-preview' : 'env-configured'
      })`
    );
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down HTTP server and PostgreSQL pool...`);

    for (const timer of pendingDelayedTimers) {
      clearTimeout(timer);
    }
    pendingDelayedTimers.clear();

    const forceTimer = setTimeout(() => {
      console.error('Graceful shutdown timed out; forcing exit.');
      process.exit(1);
    }, 10_000);
    forceTimer.unref();

    server.close(async (closeErr) => {
      try {
        await closePushStore();
        clearTimeout(forceTimer);
        process.exit(closeErr ? 1 : 0);
      } catch (err) {
        console.error('Error closing PostgreSQL pool:', err instanceof Error ? err.message : err);
        clearTimeout(forceTimer);
        process.exit(1);
      }
    });

    if (typeof server.closeIdleConnections === 'function') {
      server.closeIdleConnections();
    }
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((err) => {
  console.error(
    'FATAL: Failed to start NEXORA push server:',
    err instanceof Error ? err.message : err
  );
  void closePushStore().finally(() => {
    process.exit(1);
  });
});
