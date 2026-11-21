// Modular Push Notification Service for NEXORA PWA
// Separates local foreground/Service Worker notifications from real server-triggered Web Push (VAPID).

export type BrowserPermissionState = NotificationPermission | 'unsupported';

export interface NotificationDispatchPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  scenario?: string;
}

export interface NotificationDispatchResult {
  deliveredVia: 'service-worker' | 'notification-api' | 'in-app-only';
  ok: boolean;
  reason?: string;
}

export interface WebPushSubscriptionState {
  supported: boolean;
  subscribed: boolean;
  endpoint: string | null;
  vapidConfigured: boolean;
}

export interface ServerPushPayloadContract {
  title: string;
  body: string;
  url: string;
  tag?: string;
  scenario?: string;
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

/**
 * Dispatches a notification through the active Service Worker registration when available
 * (enabling notificationclick routing and Android PWA compatibility), falling back to the
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
    if ('serviceWorker' in navigator) {
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1200)),
      ]);

      if (registration && typeof registration.showNotification === 'function') {
        await registration.showNotification(payload.title, options);
        return { deliveredVia: 'service-worker', ok: true };
      }
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
 * Modular Web Push Manager for future VAPID-authenticated server push integration.
 * In this local demo, VITE_VAPID_PUBLIC_KEY is optional; when configured with a real
 * backend push endpoint, this manages real PushManager subscriptions.
 */
export async function getWebPushStatus(): Promise<WebPushSubscriptionState> {
  const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;
  const supported =
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  if (!supported) {
    return {
      supported: false,
      subscribed: false,
      endpoint: null,
      vapidConfigured: !!vapidKey,
    };
  }

  try {
    const registration = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 1000)),
    ]);
    if (!registration) {
      return {
        supported: true,
        subscribed: false,
        endpoint: null,
        vapidConfigured: !!vapidKey,
      };
    }
    const existing = await registration.pushManager.getSubscription();
    return {
      supported: true,
      subscribed: !!existing,
      endpoint: existing?.endpoint || null,
      vapidConfigured: !!vapidKey,
    };
  } catch {
    return {
      supported,
      subscribed: false,
      endpoint: null,
      vapidConfigured: !!vapidKey,
    };
  }
}

export async function subscribeToRealWebPush(
  vapidPublicKey?: string
): Promise<{ ok: boolean; subscription?: PushSubscriptionJSON; message: string }> {
  const key = vapidPublicKey || (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined);
  if (!key) {
    return {
      ok: false,
      message:
        'VAPID public key is not configured. Add VITE_VAPID_PUBLIC_KEY and a backend push endpoint to activate background server push.',
    };
  }
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { ok: false, message: 'Push API is not supported in this browser.' };
  }
  if (Notification.permission !== 'granted') {
    return { ok: false, message: 'Enable notification permission before subscribing to Web Push.' };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const applicationServerKey = urlBase64ToUint8Array(key);
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
    });
    return {
      ok: true,
      subscription: subscription.toJSON(),
      message: 'Subscribed to Web Push endpoint. Forward this JSON to your backend push server.',
    };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Failed to create PushManager subscription.',
    };
  }
}

export async function unsubscribeFromRealWebPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    const sub = await registration.pushManager.getSubscription();
    if (!sub) return true;
    return await sub.unsubscribe();
  } catch {
    return false;
  }
}
