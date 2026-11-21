import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import net from 'node:net';
import type { Pool as PgPoolType } from 'pg';

const require = createRequire(import.meta.url);
const { Pool } = require('pg') as typeof import('pg');

export interface StoredPushSubscription {
  id: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent: string;
  createdAt: string;
  updatedAt: string;
  lastSuccessAt: string | null;
}

export interface AdminPasscodeRecord {
  salt: string;
  hash: string;
  claimedAt: string;
}

export interface ValidatedNotificationPayload {
  title: string;
  body: string;
  url: string;
  tag: string;
  scenario: string;
}

export interface DatabaseHealthStatus {
  configured: boolean;
  connected: boolean;
  storage: 'postgresql' | 'memory-preview';
}

// In-memory preview fallback ONLY when DATABASE_URL is unset during local preview
const memorySubscriptions = new Map<string, StoredPushSubscription>();
let memoryAdminPasscode: AdminPasscodeRecord | null = null;

let pool: PgPoolType | null = null;

function buildPoolConfig(connectionString: string) {
  const lower = connectionString.toLowerCase();
  const disableSsl =
    process.env.DATABASE_SSL === 'false' ||
    lower.includes('sslmode=disable') ||
    ((lower.includes('localhost') || lower.includes('127.0.0.1')) &&
      !lower.includes('sslmode=require'));

  return {
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: disableSsl
      ? false
      : {
          rejectUnauthorized: process.env.DATABASE_SSL_STRICT === 'true',
        },
  };
}

export async function initPushStore(options?: {
  requireDatabase?: boolean;
}): Promise<DatabaseHealthStatus> {
  const requireDatabase = Boolean(options?.requireDatabase);
  const databaseUrl = (process.env.DATABASE_URL || '').trim();

  if (!databaseUrl) {
    if (requireDatabase) {
      throw new Error(
        'DATABASE_URL environment variable is required in production. Refusing to fall back to in-memory storage.'
      );
    }
    return {
      configured: false,
      connected: false,
      storage: 'memory-preview',
    };
  }

  const nextPool = new Pool(buildPoolConfig(databaseUrl));
  nextPool.on('error', (err) => {
    console.error('Unexpected PostgreSQL pool error:', err.message);
  });

  try {
    await nextPool.query('SELECT 1');

    await nextPool.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id TEXT PRIMARY KEY,
        endpoint TEXT NOT NULL UNIQUE,
        p256dh TEXT NOT NULL,
        auth TEXT NOT NULL,
        user_agent TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_success_at TIMESTAMPTZ
      );
    `);

    await nextPool.query(`
      CREATE INDEX IF NOT EXISTS idx_push_subscriptions_updated_at
        ON push_subscriptions (updated_at DESC);
    `);

    await nextPool.query(`
      CREATE TABLE IF NOT EXISTS push_admin_config (
        id SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        salt TEXT NOT NULL,
        hash TEXT NOT NULL,
        claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    pool = nextPool;
    return {
      configured: true,
      connected: true,
      storage: 'postgresql',
    };
  } catch (err) {
    await nextPool.end().catch(() => {});
    pool = null;
    throw err;
  }
}

export async function checkDatabaseHealth(): Promise<DatabaseHealthStatus> {
  if (!pool) {
    const databaseUrl = (process.env.DATABASE_URL || '').trim();
    return {
      configured: Boolean(databaseUrl),
      connected: false,
      storage: databaseUrl ? 'postgresql' : 'memory-preview',
    };
  }

  try {
    await pool.query('SELECT 1');
    return {
      configured: true,
      connected: true,
      storage: 'postgresql',
    };
  } catch {
    return {
      configured: true,
      connected: false,
      storage: 'postgresql',
    };
  }
}

export async function closePushStore(): Promise<void> {
  if (pool) {
    const activePool = pool;
    pool = null;
    await activePool.end();
  }
}

function isPrivateOrBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  const ipType = net.isIP(host);
  if (ipType === 4) {
    const parts = host.split('.').map(Number);
    if (parts.length !== 4) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    return false;
  }

  if (ipType === 6) {
    if (
      host === '::' ||
      host === '::1' ||
      host.startsWith('fe80:') ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('::ffff:')
    ) {
      return true;
    }
    return false;
  }

  return false;
}

export function isSafePushEndpoint(rawEndpoint: unknown): rawEndpoint is string {
  if (typeof rawEndpoint !== 'string') return false;
  const trimmed = rawEndpoint.trim();
  if (trimmed.length < 16 || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    if (isPrivateOrBlockedHost(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

const KEY_PATTERN = /^[A-Za-z0-9\-_+/=]{16,200}$/;

export function validateSubscriptionInput(
  input: unknown
): { endpoint: string; keys: { p256dh: string; auth: string } } | null {
  if (!input || typeof input !== 'object') return null;
  const candidate = input as {
    endpoint?: unknown;
    keys?: { p256dh?: unknown; auth?: unknown };
  };

  if (!isSafePushEndpoint(candidate.endpoint)) return null;
  if (!candidate.keys || typeof candidate.keys !== 'object') return null;

  const { p256dh, auth } = candidate.keys;
  if (typeof p256dh !== 'string' || !KEY_PATTERN.test(p256dh)) return null;
  if (typeof auth !== 'string' || !KEY_PATTERN.test(auth)) return null;

  return {
    endpoint: candidate.endpoint.trim(),
    keys: {
      p256dh,
      auth,
    },
  };
}

export function sanitizeNotificationPayload(input: unknown): ValidatedNotificationPayload | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;

  const title = typeof raw.title === 'string' ? raw.title.trim().slice(0, 100) : '';
  const body = typeof raw.body === 'string' ? raw.body.trim().slice(0, 300) : '';
  if (!title || !body) return null;

  let url = '/';
  if (typeof raw.url === 'string') {
    const candidateUrl = raw.url.trim();
    if (
      candidateUrl.startsWith('/') &&
      !candidateUrl.startsWith('//') &&
      !/[\r\n\0]/.test(candidateUrl)
    ) {
      url = candidateUrl.slice(0, 200);
    }
  }

  const tag =
    typeof raw.tag === 'string' && /^[A-Za-z0-9\-_]{1,64}$/.test(raw.tag.trim())
      ? raw.tag.trim()
      : `nexora-push-${Date.now()}`;

  const scenario =
    typeof raw.scenario === 'string' && /^[A-Za-z0-9\-_]{1,40}$/.test(raw.scenario.trim())
      ? raw.scenario.trim()
      : 'push';

  return { title, body, url, tag, scenario };
}

interface SubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string;
  created_at: Date | string;
  updated_at: Date | string;
  last_success_at: Date | string | null;
}

function mapRow(row: SubscriptionRow): StoredPushSubscription {
  return {
    id: row.id,
    endpoint: row.endpoint,
    keys: {
      p256dh: row.p256dh,
      auth: row.auth,
    },
    userAgent: row.user_agent,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    lastSuccessAt: row.last_success_at ? new Date(row.last_success_at).toISOString() : null,
  };
}

export async function upsertSubscription(
  sub: { endpoint: string; keys: { p256dh: string; auth: string } },
  userAgent: string
): Promise<StoredPushSubscription> {
  const id = crypto.createHash('sha256').update(sub.endpoint).digest('hex').slice(0, 16);
  const clippedAgent = userAgent.slice(0, 180);

  if (!pool) {
    const now = new Date().toISOString();
    const existing = memorySubscriptions.get(sub.endpoint);
    const record: StoredPushSubscription = {
      id,
      endpoint: sub.endpoint,
      keys: sub.keys,
      userAgent: clippedAgent,
      createdAt: existing ? existing.createdAt : now,
      updatedAt: now,
      lastSuccessAt: existing ? existing.lastSuccessAt : null,
    };
    memorySubscriptions.set(sub.endpoint, record);
    return record;
  }

  const result = await pool.query<SubscriptionRow>(
    `
    INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, user_agent, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (endpoint)
    DO UPDATE SET
      p256dh = EXCLUDED.p256dh,
      auth = EXCLUDED.auth,
      user_agent = EXCLUDED.user_agent,
      updated_at = NOW()
    RETURNING id, endpoint, p256dh, auth, user_agent, created_at, updated_at, last_success_at
    `,
    [id, sub.endpoint, sub.keys.p256dh, sub.keys.auth, clippedAgent]
  );

  return mapRow(result.rows[0]);
}

export async function removeSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
  if (!pool) {
    return memorySubscriptions.delete(endpoint);
  }

  const result = await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1', [endpoint]);
  return (result.rowCount ?? 0) > 0;
}

export async function findSubscriptionByEndpoint(
  endpoint: string
): Promise<StoredPushSubscription | undefined> {
  if (!pool) {
    return memorySubscriptions.get(endpoint);
  }

  const result = await pool.query<SubscriptionRow>(
    `
    SELECT id, endpoint, p256dh, auth, user_agent, created_at, updated_at, last_success_at
    FROM push_subscriptions
    WHERE endpoint = $1
    LIMIT 1
    `,
    [endpoint]
  );

  if (result.rows.length === 0) return undefined;
  return mapRow(result.rows[0]);
}

export async function listSubscriptions(): Promise<StoredPushSubscription[]> {
  if (!pool) {
    return Array.from(memorySubscriptions.values());
  }

  const result = await pool.query<SubscriptionRow>(
    `
    SELECT id, endpoint, p256dh, auth, user_agent, created_at, updated_at, last_success_at
    FROM push_subscriptions
    ORDER BY updated_at DESC
    `
  );
  return result.rows.map(mapRow);
}

export async function countSubscriptions(): Promise<number> {
  if (!pool) {
    return memorySubscriptions.size;
  }

  const result = await pool.query<{ count: number }>(
    'SELECT COUNT(*)::int AS count FROM push_subscriptions'
  );
  return result.rows[0]?.count ?? 0;
}

export async function markSubscriptionSuccess(endpoint: string): Promise<void> {
  if (!pool) {
    const existing = memorySubscriptions.get(endpoint);
    if (existing) {
      existing.lastSuccessAt = new Date().toISOString();
    }
    return;
  }

  await pool.query('UPDATE push_subscriptions SET last_success_at = NOW() WHERE endpoint = $1', [
    endpoint,
  ]);
}

export async function getAdminPasscodeRecord(): Promise<AdminPasscodeRecord | null> {
  if (!pool) {
    return memoryAdminPasscode;
  }

  const result = await pool.query<{ salt: string; hash: string; claimed_at: Date | string }>(
    'SELECT salt, hash, claimed_at FROM push_admin_config WHERE id = 1 LIMIT 1'
  );
  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    salt: row.salt,
    hash: row.hash,
    claimedAt: new Date(row.claimed_at).toISOString(),
  };
}

export function hashPasscode(passcode: string): AdminPasscodeRecord {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(passcode, salt, 64).toString('hex');
  return {
    salt,
    hash,
    claimedAt: new Date().toISOString(),
  };
}

export function verifyScryptPasscode(passcode: string, record: AdminPasscodeRecord): boolean {
  const derived = crypto.scryptSync(passcode, record.salt, 64);
  const stored = Buffer.from(record.hash, 'hex');
  if (derived.length !== stored.length) return false;
  return crypto.timingSafeEqual(derived, stored);
}

export async function claimAdminPasscodeOnce(passcode: string): Promise<boolean> {
  const hashed = hashPasscode(passcode);

  if (!pool) {
    if (memoryAdminPasscode) return false;
    memoryAdminPasscode = hashed;
    return true;
  }

  const result = await pool.query(
    `
    INSERT INTO push_admin_config (id, salt, hash, claimed_at)
    VALUES (1, $1, $2, NOW())
    ON CONFLICT (id) DO NOTHING
    RETURNING id
    `,
    [hashed.salt, hashed.hash]
  );

  return (result.rowCount ?? 0) > 0;
}
