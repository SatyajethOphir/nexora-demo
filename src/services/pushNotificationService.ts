// Modular Push Notification Service for NEXORA PWA & Android TWA
// Routes Web Push API requests to the Render backend (https://nexoraapi.sopdev.in in production).
import { apiUrl } from '../config/api';

export type BrowserPermissionState = NotificationPermission | 'unsupported';

export interface NotificationDispatchPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  scenario?: string;
}

export interface NotificationDispatchResult {
  deliveredVia: 'service-worker' | 'notification-api' | 'web-push' | 'in-app-only';
  ok: boolean;
  reason?: string;
}

export interface WebPushSubscriptionState {
  supported: boolean;
  subscribed: boolean;
  endpoint: string | null;
  vapidConfigured: boolean;
  ephemeralVapid: boolean;
  serverSynced: boolean;
  activePublicKey: string | null;
}

export interface ServerPushPayloadContract {
  title: string;
  body: string;
  url: string;
  tag?: string;
  scenario?: string;
}

export interface ServerVapidConfig {
  publicKey: string;
  ephemeral: boolean;
  subjectConfigured: boolean;
}

export interface ServerHealthStatus {
  ok: boolean;
  service?: string;
  database: 'connected' | 'disconnected' | 'not_configured' | 'unreachable';
  storage?: 'postgresql' | 'memory-preview';
  vapidConfigured?: boolean;
}

export interface PushAdminStatus {
  configuredViaEnv: boolean;
  claimed: boolean;
  authenticated: boolean;
  subscriberCount?: number;
}

export interface BroadcastPushResponse {
  ok: boolean;
  sent?: number;
  failed?: number;
  removedExpired?: number;
  subscriberCount?: number;
  message?: string;
  error?: string;
}

/**
 * Converts a base64url-encoded VAPID public key into a Uint8Array for PushManager.subscribe().
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getBrowserPermission(): BrowserPermissionState {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestBrowserNotificationPermission(): Promise<BrowserPermissionState> {
  if (!isNotificationSupported()) return 'unsupported';
  // Only invoked in direct response to user action ("Enable Notifications")
  const result = await Notification.requestPermission();
  return result;
}

async function getReadyServiceWorker(timeoutMs = 1500): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return null;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

/**
 * Checks backend & PostgreSQL connectivity via GET /api/health.
 */
export async function fetchPushServerHealth(): Promise<ServerHealthStatus> {
  try {
    const res = await fetch(apiUrl('/api/health'));
    const data = (await res.json().catch(() => ({}))) as Partial<ServerHealthStatus>;
    return {
      ok: Boolean(res.ok && data.ok),
      service: data.service,
      database: data.database || 'unreachable',
      storage: data.storage,
      vapidConfigured: data.vapidConfigured,
    };
  } catch {
    return {
      ok: false,
      database: 'unreachable',
    };
  }
}

/**
 * Fetches the active server VAPID public key configuration.
 */
export async function fetchServerVapidConfig(): Promise<ServerVapidConfig | null> {
  try {
    const res = await fetch(apiUrl('/api/push/vapid-public-key'));
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<ServerVapidConfig>;
    if (!data.publicKey || typeof data.publicKey !== 'string') return null;
    return {
      publicKey: data.publicKey,
      ephemeral: Boolean(data.ephemeral),
      subjectConfigured: Boolean(data.subjectConfigured),
    };
  } catch {
    return null;
  }
}

/**
 * Dispatches a notification through the active Service Worker registration when available
 * (enabling notificationclick routing and Android PWA/TWA compatibility), falling back to the
 * standard Notification API when running without an active SW registration.
 */
export async function dispatchLocalNotification(
  payload: NotificationDispatchPayload
): Promise<NotificationDispatchResult> {
  if (!isNotificationSupported()) {
    return {
      deliveredVia: 'in-app-only',
      ok: false,
      reason: 'Browser Notification API is not supported in this environment.',
    };
  }

  if (Notification.permission !== 'granted') {
    return {
      deliveredVia: 'in-app-only',
      ok: false,
      reason: `Notification permission is currently "${Notification.permission}".`,
    };
  }

  const targetUrl = payload.url || '/';
  const options: NotificationOptions = {
    body: payload.body,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: payload.tag || `nexora-${Date.now()}`,
    data: {
      url: targetUrl,
      scenario: payload.scenario || 'local',
    },
  };

  try {
    const registration = await getReadyServiceWorker(1200);
    if (registration && typeof registration.showNotification === 'function') {
      await registration.showNotification(payload.title, options);
      return { deliveredVia: 'service-worker', ok: true };
    }

    const notif = new Notification(payload.title, options);
    notif.onclick = () => {
      window.focus();
      if (targetUrl && targetUrl !== window.location.pathname + window.location.search) {
        window.history.pushState({}, '', targetUrl);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
      notif.close();
    };
    return { deliveredVia: 'notification-api', ok: true };
  } catch (err) {
    return {
      deliveredVia: 'in-app-only',
      ok: false,
      reason: err instanceof Error ? err.message : 'Unable to show browser notification.',
    };
  }
}

/**
 * Reads current browser PushManager subscription status and active server VAPID status.
 */
export async function getWebPushStatus(): Promise<WebPushSubscriptionState> {
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  const serverConfig = await fetchServerVapidConfig();
  const activePublicKey =
    serverConfig?.publicKey ||
    (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
    null;

  if (!supported) {
    return {
      supported: false,
      subscribed: false,
      endpoint: null,
      vapidConfigured: Boolean(activePublicKey),
      ephemeralVapid: Boolean(serverConfig?.ephemeral),
      serverSynced: false,
      activePublicKey,
    };
  }

  try {
    const registration = await getReadyServiceWorker(1200);
    if (!registration) {
      return {
        supported: true,
        subscribed: false,
        endpoint: null,
        vapidConfigured: Boolean(activePublicKey),
        ephemeralVapid: Boolean(serverConfig?.ephemeral),
        serverSynced: false,
        activePublicKey,
      };
    }

    const existing = await registration.pushManager.getSubscription();
    let keyMatchesServer = Boolean(existing);

    if (existing && activePublicKey && existing.options?.applicationServerKey) {
      const existingBytes = new Uint8Array(existing.options.applicationServerKey);
      const serverBytes = urlBase64ToUint8Array(activePublicKey);
      keyMatchesServer = uint8ArraysEqual(existingBytes, serverBytes);
    }

    return {
      supported: true,
      subscribed: Boolean(existing),
      endpoint: existing?.endpoint || null,
      vapidConfigured: Boolean(activePublicKey),
      ephemeralVapid: Boolean(serverConfig?.ephemeral),
      serverSynced: Boolean(existing && keyMatchesServer),
      activePublicKey,
    };
  } catch {
    return {
      supported,
      subscribed: false,
      endpoint: null,
      vapidConfigured: Boolean(activePublicKey),
      ephemeralVapid: Boolean(serverConfig?.ephemeral),
      serverSynced: false,
      activePublicKey,
    };
  }
}

/**
 * Ensures the browser / Android TWA has a valid PushManager subscription matching the active
 * server VAPID key, and registers the PushSubscription securely with `/api/push/subscribe`.
 */
export async function ensureServerPushSubscription(): Promise<{
  ok: boolean;
  subscription?: PushSubscriptionJSON;
  ephemeral?: boolean;
  message: string;
}> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, message: 'Push API is not supported in this browser.' };
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, message: 'Grant notification permission before subscribing to Web Push.' };
  }

  const serverConfig = await fetchServerVapidConfig();
  const key =
    serverConfig?.publicKey || (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined);

  if (!key) {
    return {
      ok: false,
      message: 'Unable to reach push server VAPID public key endpoint.',
    };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const expectedKeyBytes = urlBase64ToUint8Array(key);
    let subscription = await registration.pushManager.getSubscription();

    if (subscription && subscription.options?.applicationServerKey) {
      const currentBytes = new Uint8Array(subscription.options.applicationServerKey);
      if (!uint8ArraysEqual(currentBytes, expectedKeyBytes)) {
        const staleEndpoint = subscription.endpoint;
        await subscription.unsubscribe();
        subscription = null;
        void fetch(apiUrl('/api/push/unsubscribe'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: staleEndpoint }),
        }).catch(() => {});
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: expectedKeyBytes.buffer as ArrayBuffer,
      });
    }

    const subJson = subscription.toJSON();
    const res = await fetch(apiUrl('/api/push/subscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: subJson }),
    });

    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      return {
        ok: false,
        message: errData.error || 'Server rejected push subscription registration.',
      };
    }

    return {
      ok: true,
      subscription: subJson,
      ephemeral: serverConfig?.ephemeral,
      message: serverConfig?.ephemeral
        ? 'Subscribed to real Background Web Push (preview VAPID keys).'
        : 'Subscribed and persisted to production PostgreSQL Web Push server.',
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Failed to create PushManager subscription.',
    };
  }
}

export async function unsubscribeAndRemoveFromServer(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const registration = await getReadyServiceWorker(1500);
    if (!registration) return false;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return true;

    const endpoint = sub.endpoint;
    await fetch(apiUrl('/api/push/unsubscribe'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    }).catch(() => {});

    return await sub.unsubscribe();
  } catch {
    return false;
  }
}

export async function sendServerBackgroundTestPush(params: {
  endpoint: string;
  notification?: Partial<ServerPushPayloadContract>;
  delaySeconds?: number;
}): Promise<{ ok: boolean; scheduled?: boolean; expired?: boolean; message: string }> {
  try {
    const res = await fetch(apiUrl('/api/push/send-test'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      scheduled?: boolean;
      expired?: boolean;
      message?: string;
      error?: string;
    };

    if (!res.ok || !data.ok) {
      return {
        ok: false,
        expired: Boolean(data.expired || res.status === 410),
        message: data.error || 'Failed to dispatch server Web Push.',
      };
    }

    return {
      ok: true,
      scheduled: Boolean(data.scheduled),
      message: data.message || 'Web Push dispatched by backend server.',
    };
  } catch {
    return {
      ok: false,
      message: 'Network error contacting NEXORA push server.',
    };
  }
}

export async function sendServerOrderEventPush(params: {
  endpoint: string;
  notification: ServerPushPayloadContract;
}): Promise<{ ok: boolean; message?: string }> {
  try {
    const res = await fetch(apiUrl('/api/push/order-event'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    return {
      ok: Boolean(res.ok && data.ok),
      message: data.error,
    };
  } catch {
    return { ok: false, message: 'Offline or server unreachable.' };
  }
}

// --- Push Admin Broadcast Helpers (Bearer token kept strictly in React memory) ---

export async function fetchPushAdminStatus(token?: string | null): Promise<PushAdminStatus | null> {
  try {
    const res = await fetch(apiUrl('/api/push/admin/status'), {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!res.ok) return null;
    return (await res.json()) as PushAdminStatus;
  } catch {
    return null;
  }
}

export async function claimPushAdminPasscode(passcode: string): Promise<{
  ok: boolean;
  token?: string;
  subscriberCount?: number;
  error?: string;
}> {
  try {
    const res = await fetch(apiUrl('/api/push/admin/claim'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      token?: string;
      subscriberCount?: number;
      error?: string;
    };
    return {
      ok: Boolean(res.ok && data.ok),
      token: data.token,
      subscriberCount: data.subscriberCount,
      error: data.error,
    };
  } catch {
    return { ok: false, error: 'Network error during admin passcode setup.' };
  }
}

export async function loginPushAdmin(passcode: string): Promise<{
  ok: boolean;
  token?: string;
  subscriberCount?: number;
  needsClaim?: boolean;
  error?: string;
}> {
  try {
    const res = await fetch(apiUrl('/api/push/admin/login'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      token?: string;
      subscriberCount?: number;
      needsClaim?: boolean;
      error?: string;
    };
    return {
      ok: Boolean(res.ok && data.ok),
      token: data.token,
      subscriberCount: data.subscriberCount,
      needsClaim: data.needsClaim,
      error: data.error,
    };
  } catch {
    return { ok: false, error: 'Network error during admin sign-in.' };
  }
}

export async function broadcastPushCampaign(
  token: string,
  payload: ServerPushPayloadContract
): Promise<BroadcastPushResponse> {
  try {
    const res = await fetch(apiUrl('/api/push/broadcast'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as BroadcastPushResponse;
    if (!res.ok) {
      return {
        ok: false,
        error: data.error || 'Broadcast failed.',
      };
    }
    return data;
  } catch {
    return { ok: false, error: 'Network error while sending broadcast push.' };
  }
}
