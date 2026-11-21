import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  AUTO_TEST_MESSAGES,
  DEFAULT_TEST_INTERVAL_SECONDS,
  NotificationScenario,
  NotificationScenarioId,
} from '../data/notifications';
import {
  BrowserPermissionState,
  dispatchLocalNotification,
  ensureServerPushSubscription,
  getBrowserPermission,
  getWebPushStatus,
  NotificationDispatchPayload,
  NotificationDispatchResult,
  requestBrowserNotificationPermission,
  sendServerBackgroundTestPush,
  sendServerOrderEventPush,
  unsubscribeAndRemoveFromServer,
  WebPushSubscriptionState,
} from '../services/pushNotificationService';
import { readStorage, STORAGE_KEYS, writeStorage } from '../utils/storage';
import { useToast } from './ToastContext';

export interface NotificationHistoryEntry {
  id: string;
  title: string;
  body: string;
  scenario: NotificationScenarioId | 'test' | 'background-test';
  url: string;
  deliveredVia: 'service-worker' | 'notification-api' | 'web-push' | 'in-app-only';
  timestamp: string;
  note?: string;
}

interface NotificationContextValue {
  permission: BrowserPermissionState;
  appEnabled: boolean;
  isTestingActive: boolean;
  intervalSeconds: number;
  secondsRemaining: number;
  nextScheduledAt: number | null;
  sentCountInSession: number;
  history: NotificationHistoryEntry[];
  webPushStatus: WebPushSubscriptionState;
  swRegistered: boolean;
  subscribingPush: boolean;
  sendingServerPush: boolean;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => void;
  startTesting: () => Promise<void>;
  stopTesting: () => void;
  sendTestNotification: () => Promise<void>;
  triggerScenario: (scenario: NotificationScenario) => Promise<void>;
  triggerServerScenario: (scenario: NotificationScenario, delaySeconds?: number) => Promise<void>;
  notifyOrderEvent: (
    title: string,
    body: string,
    url: string,
    scenario: NotificationScenarioId
  ) => Promise<void>;
  clearHistory: () => void;
  syncBackgroundPush: () => Promise<{ ok: boolean; message: string }>;
  sendBackgroundPushTest: (
    delaySeconds?: number,
    customPayload?: NotificationDispatchPayload
  ) => Promise<{ ok: boolean; scheduled?: boolean; message: string }>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { showToast } = useToast();

  const [permission, setPermission] = useState<BrowserPermissionState>(() =>
    getBrowserPermission()
  );
  const [appEnabled, setAppEnabled] = useState<boolean>(() =>
    readStorage<boolean>(STORAGE_KEYS.NOTIF_ENABLED, true)
  );
  const [history, setHistory] = useState<NotificationHistoryEntry[]>(() =>
    readStorage<NotificationHistoryEntry[]>(STORAGE_KEYS.NOTIF_HISTORY, [])
  );

  const [isTestingActive, setIsTestingActive] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(DEFAULT_TEST_INTERVAL_SECONDS);
  const [nextScheduledAt, setNextScheduledAt] = useState<number | null>(null);
  const [sentCountInSession, setSentCountInSession] = useState(0);
  const [swRegistered, setSwRegistered] = useState(false);
  const [subscribingPush, setSubscribingPush] = useState(false);
  const [sendingServerPush, setSendingServerPush] = useState(false);

  const [webPushStatus, setWebPushStatus] = useState<WebPushSubscriptionState>({
    supported: false,
    subscribed: false,
    endpoint: null,
    vapidConfigured: false,
    ephemeralVapid: false,
    serverSynced: false,
    activePublicKey: null,
  });

  const intervalRef = useRef<number | null>(null);
  const messageIndexRef = useRef<number>(0);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.NOTIF_ENABLED, appEnabled);
  }, [appEnabled]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.NOTIF_HISTORY, history.slice(0, 50));
  }, [history]);

  // Sync browser permission, Service Worker registration, and server VAPID PushManager state
  const refreshStatus = useCallback(async () => {
    const currentPerm = getBrowserPermission();
    setPermission(currentPerm);

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        setSwRegistered(Boolean(reg));
      } catch {
        setSwRegistered(false);
      }
    }

    const pushState = await getWebPushStatus();
    setWebPushStatus(pushState);
    return pushState;
  }, []);

  // Auto-sync PushSubscription on mount/focus if permission is already granted & app alerts are enabled
  useEffect(() => {
    let active = true;

    const syncOnReady = async () => {
      const pushState = await refreshStatus();
      if (!active) return;
      if (appEnabled && getBrowserPermission() === 'granted' && pushState.supported && !pushState.serverSynced) {
        const res = await ensureServerPushSubscription();
        if (active && res.ok) {
          await refreshStatus();
        }
      }
    };

    void syncOnReady();

    const handleVisibilityOrFocus = () => {
      void refreshStatus();
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      active = false;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [appEnabled, refreshStatus]);

  const recordHistory = useCallback((entry: NotificationHistoryEntry) => {
    setHistory((prev) => [entry, ...prev].slice(0, 50));
  }, []);

  const deliverAndRecord = useCallback(
    async (params: {
      title: string;
      body: string;
      url: string;
      scenario: NotificationScenarioId | 'test';
      tag?: string;
    }) => {
      const currentPerm = getBrowserPermission();
      setPermission(currentPerm);

      let result: NotificationDispatchResult = {
        deliveredVia: 'in-app-only',
        ok: false,
        reason: 'Notifications are disabled in NEXORA settings.',
      };

      if (appEnabled && currentPerm === 'granted') {
        result = await dispatchLocalNotification({
          title: params.title,
          body: params.body,
          url: params.url,
          tag: params.tag,
          scenario: params.scenario,
        });
      } else if (!appEnabled) {
        result = {
          deliveredVia: 'in-app-only',
          ok: false,
          reason: 'Notifications are disabled in NEXORA preferences.',
        };
      } else {
        result = {
          deliveredVia: 'in-app-only',
          ok: false,
          reason: `Browser permission is "${currentPerm}".`,
        };
      }

      recordHistory({
        id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: params.title,
        body: params.body,
        scenario: params.scenario,
        url: params.url,
        deliveredVia: result.deliveredVia,
        timestamp: new Date().toISOString(),
        note: result.ok ? undefined : result.reason,
      });

      return result;
    },
    [appEnabled, recordHistory]
  );

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const stopTesting = useCallback(() => {
    clearTimer();
    setIsTestingActive(false);
    setNextScheduledAt(null);
    setSecondsRemaining(DEFAULT_TEST_INTERVAL_SECONDS);
  }, [clearTimer]);

  const syncBackgroundPush = useCallback(async () => {
    setSubscribingPush(true);
    try {
      const res = await ensureServerPushSubscription();
      await refreshStatus();
      showToast(res.message, res.ok ? 'success' : 'info');
      return { ok: res.ok, message: res.message };
    } finally {
      setSubscribingPush(false);
    }
  }, [refreshStatus, showToast]);

  const enableNotifications = useCallback(async () => {
    setAppEnabled(true);
    const current = getBrowserPermission();
    if (current === 'unsupported') {
      setPermission('unsupported');
      showToast('Browser notifications are not supported on this device.', 'error');
      return;
    }

    if (current === 'granted') {
      setPermission('granted');
      const subRes = await ensureServerPushSubscription();
      await refreshStatus();
      showToast(
        subRes.ok
          ? 'Notifications & Background Web Push enabled.'
          : 'NEXORA browser notifications are enabled.',
        'success'
      );
      return;
    }

    if (current === 'denied') {
      setPermission('denied');
      showToast(
        'Notifications are blocked in your browser site settings. Allow them in site permissions to receive alerts.',
        'error'
      );
      return;
    }

    const nextPerm = await requestBrowserNotificationPermission();
    setPermission(nextPerm);

    if (nextPerm === 'granted') {
      const subRes = await ensureServerPushSubscription();
      await refreshStatus();
      showToast(
        subRes.ok
          ? 'Permission granted & device subscribed for Background Web Push.'
          : 'Notification permission granted.',
        'success'
      );
    } else if (nextPerm === 'denied') {
      await refreshStatus();
      showToast('Notification permission denied by browser.', 'error');
    } else {
      await refreshStatus();
      showToast('Notification prompt dismissed.', 'info');
    }
  }, [refreshStatus, showToast]);

  const disableNotifications = useCallback(() => {
    stopTesting();
    setAppEnabled(false);
    void unsubscribeAndRemoveFromServer().then(refreshStatus).catch(() => {});
    showToast('NEXORA notifications disabled and server push subscription removed.', 'info');
  }, [refreshStatus, showToast, stopTesting]);

  const fireAutoTestNotification = useCallback(async () => {
    const msg = AUTO_TEST_MESSAGES[messageIndexRef.current % AUTO_TEST_MESSAGES.length];
    messageIndexRef.current += 1;
    setSentCountInSession((c) => c + 1);

    const res = await deliverAndRecord({
      title: msg.title,
      body: msg.body,
      url: msg.url,
      scenario: 'auto-test',
      tag: `nexora-auto-${Date.now()}`,
    });

    if (!res.ok) {
      showToast(`${msg.title}: ${msg.body}`, 'info');
    }
  }, [deliverAndRecord, showToast]);

  const startTesting = useCallback(async () => {
    clearTimer();

    if (!appEnabled) {
      setAppEnabled(true);
    }

    const currentPerm = getBrowserPermission();
    setPermission(currentPerm);

    if (currentPerm !== 'granted') {
      showToast(
        currentPerm === 'denied'
          ? 'Browser notifications are blocked—testing will log in-app history only.'
          : 'Click "Enable Notifications" first for OS/browser notification banners; running in-app log mode.',
        'info'
      );
    } else {
      showToast('1-minute foreground notification testing mode started.', 'success');
    }

    const now = Date.now();
    const firstFireAt = now + DEFAULT_TEST_INTERVAL_SECONDS * 1000;
    setNextScheduledAt(firstFireAt);
    setSecondsRemaining(DEFAULT_TEST_INTERVAL_SECONDS);
    setIsTestingActive(true);
  }, [appEnabled, clearTimer, showToast]);

  // Single authoritative interval when foreground testing mode is active
  useEffect(() => {
    if (!isTestingActive) {
      clearTimer();
      return;
    }

    clearTimer();
    intervalRef.current = window.setInterval(() => {
      setNextScheduledAt((prevTarget) => {
        const target = prevTarget ?? Date.now() + DEFAULT_TEST_INTERVAL_SECONDS * 1000;
        const diffSec = Math.ceil((target - Date.now()) / 1000);

        if (diffSec <= 0) {
          void fireAutoTestNotification();
          const nextTarget = Date.now() + DEFAULT_TEST_INTERVAL_SECONDS * 1000;
          setSecondsRemaining(DEFAULT_TEST_INTERVAL_SECONDS);
          return nextTarget;
        }

        setSecondsRemaining(diffSec);
        return target;
      });
    }, 1000);

    return () => {
      clearTimer();
    };
  }, [isTestingActive, clearTimer, fireAutoTestNotification]);

  const sendTestNotification = useCallback(async () => {
    const res = await deliverAndRecord({
      title: 'NEXORA Notification Test',
      body: 'This is your immediate Service Worker test notification. Click to open NEXORA.',
      url: '/',
      scenario: 'test',
    });

    if (res.ok) {
      showToast(
        res.deliveredVia === 'service-worker'
          ? 'Test notification dispatched via Service Worker.'
          : 'Test notification sent via Browser Notification API.',
        'success'
      );
    } else {
      showToast(res.reason || 'Logged in notification history (permission required for OS banner).', 'info');
    }
  }, [deliverAndRecord, showToast]);

  const sendBackgroundPushTest = useCallback(
    async (delaySeconds = 0, customPayload?: NotificationDispatchPayload) => {
      setSendingServerPush(true);
      try {
        if (getBrowserPermission() !== 'granted') {
          const msg = 'Grant browser notification permission first.';
          showToast(msg, 'error');
          return { ok: false, message: msg };
        }

        // Ensure server has up-to-date subscription before dispatching
        let endpoint = webPushStatus.endpoint;
        if (!endpoint || !webPushStatus.serverSynced) {
          const syncRes = await ensureServerPushSubscription();
          const refreshed = await refreshStatus();
          endpoint = syncRes.subscription?.endpoint || refreshed.endpoint;
          if (!syncRes.ok || !endpoint) {
            showToast(syncRes.message, 'error');
            return { ok: false, message: syncRes.message };
          }
        }

        const payload = {
          title: customPayload?.title || 'NEXORA Background Web Push',
          body:
            customPayload?.body ||
            (delaySeconds > 0
              ? `Delivered by NEXORA server after ${delaySeconds}s — even while closed or minimized.`
              : 'Genuine VAPID Web Push delivered directly from the NEXORA backend.'),
          url: customPayload?.url || '/notifications',
          tag: customPayload?.tag || `nexora-push-${Date.now()}`,
          scenario: customPayload?.scenario || 'background-test',
        };

        let result = await sendServerBackgroundTestPush({
          endpoint,
          notification: payload,
          delaySeconds,
        });

        // Auto-recover once if endpoint expired/unregistered on server restart
        if (!result.ok && (result.expired || result.message.includes('not registered'))) {
          const reSync = await ensureServerPushSubscription();
          const refreshed = await refreshStatus();
          if (reSync.ok && refreshed.endpoint) {
            result = await sendServerBackgroundTestPush({
              endpoint: refreshed.endpoint,
              notification: payload,
              delaySeconds,
            });
          }
        }

        recordHistory({
          id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: payload.title,
          body: payload.body,
          scenario: (payload.scenario as NotificationScenarioId | 'background-test') || 'background-test',
          url: payload.url,
          deliveredVia: result.ok ? 'web-push' : 'in-app-only',
          timestamp: new Date().toISOString(),
          note: result.ok
            ? delaySeconds > 0
              ? `Server scheduled Web Push in ${delaySeconds}s`
              : 'Sent via VAPID Web Push server'
            : result.message,
        });

        showToast(result.message, result.ok ? 'success' : 'error');
        return result;
      } finally {
        setSendingServerPush(false);
      }
    },
    [recordHistory, refreshStatus, showToast, webPushStatus.endpoint, webPushStatus.serverSynced]
  );

  const triggerScenario = useCallback(
    async (scenario: NotificationScenario) => {
      const res = await deliverAndRecord({
        title: scenario.title,
        body: scenario.body,
        url: scenario.url,
        scenario: scenario.id,
      });

      if (res.ok) {
        showToast(`Sent "${scenario.label}" via Service Worker.`, 'success');
      } else {
        showToast(`Logged "${scenario.label}" in history (${res.reason}).`, 'info');
      }
    },
    [deliverAndRecord, showToast]
  );

  const triggerServerScenario = useCallback(
    async (scenario: NotificationScenario, delaySeconds = 0) => {
      await sendBackgroundPushTest(delaySeconds, {
        title: scenario.title,
        body: scenario.body,
        url: scenario.url,
        scenario: scenario.id,
      });
    },
    [sendBackgroundPushTest]
  );

  const notifyOrderEvent = useCallback(
    async (title: string, body: string, url: string, scenario: NotificationScenarioId) => {
      if (!appEnabled || getBrowserPermission() !== 'granted') return;

      if (webPushStatus.subscribed && webPushStatus.endpoint) {
        const pushRes = await sendServerOrderEventPush({
          endpoint: webPushStatus.endpoint,
          notification: { title, body, url, scenario },
        });
        if (pushRes.ok) {
          recordHistory({
            id: `ntf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            title,
            body,
            scenario,
            url,
            deliveredVia: 'web-push',
            timestamp: new Date().toISOString(),
          });
          return;
        }
      }

      await deliverAndRecord({ title, body, url, scenario });
    },
    [appEnabled, deliverAndRecord, recordHistory, webPushStatus.endpoint, webPushStatus.subscribed]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    showToast('Notification history cleared.', 'info');
  }, [showToast]);

  return (
    <NotificationContext.Provider
      value={{
        permission,
        appEnabled,
        isTestingActive,
        intervalSeconds: DEFAULT_TEST_INTERVAL_SECONDS,
        secondsRemaining,
        nextScheduledAt,
        sentCountInSession,
        history,
        webPushStatus,
        swRegistered,
        subscribingPush,
        sendingServerPush,
        enableNotifications,
        disableNotifications,
        startTesting,
        stopTesting,
        sendTestNotification,
        triggerScenario,
        triggerServerScenario,
        notifyOrderEvent,
        clearHistory,
        syncBackgroundPush,
        sendBackgroundPushTest,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error('useNotifications must be used inside NotificationProvider');
  }
  return ctx;
}
