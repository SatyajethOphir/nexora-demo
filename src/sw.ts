// Custom Service Worker for NEXORA PWA & Web Push Notifications
// Compiled by vite-plugin-pwa (injectManifest strategy)

interface SWPrecacheEntry {
  url: string;
  revision: string | null;
}

interface SWWindowClient {
  id: string;
  url: string;
  focused: boolean;
  focus(): Promise<SWWindowClient>;
  navigate?(url: string): Promise<SWWindowClient | null>;
  postMessage(message: unknown): void;
}

interface SWExtendableEvent extends Event {
  waitUntil(promise: Promise<unknown>): void;
}

interface SWFetchEvent extends SWExtendableEvent {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

interface SWPushEvent extends SWExtendableEvent {
  data: {
    json(): Record<string, unknown>;
    text(): string;
  } | null;
}

interface SWNotification {
  title: string;
  data?: {
    url?: string;
    scenario?: string;
  };
  close(): void;
}

interface SWNotificationEvent extends SWExtendableEvent {
  notification: SWNotification;
  action: string;
}

interface SWMessageEvent extends SWExtendableEvent {
  data: {
    type?: string;
    payload?: {
      title?: string;
      body?: string;
      url?: string;
      tag?: string;
      scenario?: string;
    };
  } | null;
}

interface SWGlobalScope {
  __WB_MANIFEST: Array<SWPrecacheEntry | string>;
  location: Location;
  skipWaiting(): Promise<void>;
  clients: {
    claim(): Promise<void>;
    matchAll(options?: { type?: string; includeUncontrolled?: boolean }): Promise<SWWindowClient[]>;
    openWindow(url: string): Promise<SWWindowClient | null>;
  };
  registration: {
    showNotification(title: string, options?: NotificationOptions): Promise<void>;
  };
  addEventListener(type: 'install', listener: (event: SWExtendableEvent) => void): void;
  addEventListener(type: 'activate', listener: (event: SWExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: SWFetchEvent) => void): void;
  addEventListener(type: 'push', listener: (event: SWPushEvent) => void): void;
  addEventListener(type: 'notificationclick', listener: (event: SWNotificationEvent) => void): void;
  addEventListener(type: 'message', listener: (event: SWMessageEvent) => void): void;
}

const sw = self as unknown as SWGlobalScope;

const CACHE_NAME = 'nexora-static-v2';
const PRECACHE_MANIFEST = (self as unknown as { __WB_MANIFEST?: Array<SWPrecacheEntry | string> }).__WB_MANIFEST || [];
const PRECACHE_URLS = PRECACHE_MANIFEST.map((entry) =>
  typeof entry === 'string' ? entry : entry.url
);

const SENSITIVE_PATH_PREFIXES = ['/api/', '/checkout', '/payment', '/profile', '/orders'];

sw.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const staticFallbacks = ['/offline.html', '/manifest.json', '/icon.svg'];
      const urls = Array.from(new Set([...PRECACHE_URLS, ...staticFallbacks]));
      await Promise.allSettled(urls.map((url) => cache.add(url)));
      await sw.skipWaiting();
    })
  );
});

sw.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('nexora-') && key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => sw.clients.claim())
  );
});

sw.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== sw.location.origin) {
    // Allow Google Fonts caching if applicable
    if (
      url.hostname === 'fonts.googleapis.com' ||
      url.hostname === 'fonts.gstatic.com'
    ) {
      event.respondWith(
        caches.match(request).then(
          (cached) =>
            cached ||
            fetch(request).then((res) => {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
              return res;
            })
        )
      );
    }
    return;
  }

  // Never serve stale cached responses for checkout, payment, profile, or orders navigation
  const isSensitive = SENSITIVE_PATH_PREFIXES.some((prefix) =>
    url.pathname.startsWith(prefix)
  );

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        if (!isSensitive) {
          const cachedShell = await caches.match('/index.html');
          if (cachedShell) return cachedShell;
        }
        const offlinePage = await caches.match('/offline.html');
        return offlinePage || new Response('Offline', { status: 503 });
      })
    );
    return;
  }

  if (isSensitive) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      const networkFetch = fetch(request)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached || new Response('', { status: 504 }));

      return cached || networkFetch;
    })
  );
});

// Real Web Push Event Handler (for server-triggered VAPID push messages)
sw.addEventListener('push', (event) => {
  let payload: {
    title?: string;
    body?: string;
    url?: string;
    tag?: string;
    scenario?: string;
  } = {};

  if (event.data) {
    try {
      payload = event.data.json() as typeof payload;
    } catch {
      payload = { body: event.data.text() };
    }
  }

  const title = payload.title || 'NEXORA Update';
  const body = payload.body || 'Discover something new today on NEXORA.';
  const targetUrl = payload.url || '/';

  event.waitUntil(
    sw.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: payload.tag || `nexora-push-${Date.now()}`,
      data: {
        url: targetUrl,
        scenario: payload.scenario || 'push',
      },
    })
  );
});

// Notification Click Handler — opens or focuses NEXORA and navigates cleanly
sw.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = event.notification.data?.url || '/';
  const absoluteTarget = new URL(targetPath, sw.location.origin).href;

  event.waitUntil(
    sw.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(async (windowClients) => {
        for (const client of windowClients) {
          if (client.url.startsWith(sw.location.origin)) {
            await client.focus();
            client.postMessage({
              type: 'NEXORA_NAVIGATE',
              url: targetPath,
            });
            return;
          }
        }
        await sw.clients.openWindow(absoluteTarget);
      })
  );
});

// Message Handler for SKIP_WAITING and app-triggered SW notifications
sw.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SKIP_WAITING') {
    event.waitUntil(sw.skipWaiting());
    return;
  }

  if (event.data.type === 'SHOW_NOTIFICATION' && event.data.payload) {
    const { title, body, url, tag, scenario } = event.data.payload;
    event.waitUntil(
      sw.registration.showNotification(title || 'NEXORA Notification', {
        body: body || '',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: tag || `nexora-local-${Date.now()}`,
        data: {
          url: url || '/',
          scenario: scenario || 'local',
        },
      })
    );
  }
});
