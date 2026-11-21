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
  getBrowserPermission,
  getWebPushStatus,
  NotificationDispatchResult,
  requestBrowserNotificationPermission,
  subscribeToRealWebPush,
  unsubscribeFromRealWebPush,
  WebPushSubscriptionState,
} from '../services/pushNotificationService';
import { readStorage, STORAGE_KEYS, writeStorage } from '../utils/storage';
import { useToast } from './ToastContext';

export interface NotificationHistoryEntry {
  id: string;
  title: string;
  body: string;
  scenario: NotificationScenarioId | 'test';
  url: string;
  deliveredVia: 'service-worker' | 'notification-api' | 'in-app-only';
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
  enableNotifications: () => Promise<void>;
  disableNotifications: () => void;
  startTesting: () => Promise<void>;
  stopTesting: () => void;
  sendTestNotification: () => Promise<void>;
  triggerScenario: (scenario: NotificationScenario) => Promise<void>;
  notifyOrderEvent: (title: string, body: string, url: string, scenario: NotificationScenarioId) => Promise<void>;
  clearHistory: () => void;
  testWebPushSubscription: () => Promise<{ ok: boolean; message: string }>;
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
  const [webPushStatus, setWebPushStatus] = useState<WebPushSubscriptionState>({
    supported: false,
    subscribed: false,
    endpoint: null,
    vapidConfigured: false,
  });

  const intervalRef = useRef<number | null>(null);
  const messageIndexRef = useRef<number>(0);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.NOTIF_ENABLED, appEnabled);
  }, [appEnabled]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.NOTIF_HISTORY, history.slice(0, 50));
  }, [history]);

  // Sync browser permission & Service Worker registration status cleanly
  const refreshStatus = useCallback(async () => {
    setPermission(getBrowserPermission());
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        setSwRegistered(!!reg);
      } catch {
        setSwRegistered(false);
      }
    }
    const pushState = await getWebPushStatus();
    setWebPushStatus(pushState);
  }, []);

  useEffect(() => {
    refreshStatus();
    const handleVisibilityOrFocus = () => {
      refreshStatus();
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    return () => {
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, [refreshStatus]);

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
      showToast('NEXORA notifications are enabled.', 'success');
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
    await refreshStatus();

    if (nextPerm === 'granted') {
      showToast('Notification permission granted.', 'success');
    } else if (nextPerm === 'denied') {
      showToast('Notification permission denied by browser.', 'error');
    } else {
      showToast('Notification prompt dismissed.', 'info');
    }
  }, [refreshStatus, showToast]);

  const disableNotifications = useCallback(() => {
    stopTesting();
    setAppEnabled(false);
    unsubscribeFromRealWebPush().then(refreshStatus).catch(() => {});
    showToast('NEXORA notifications disabled and active test timers stopped.', 'info');
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
    // Prevent duplicate intervals
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
      showToast('1-minute notification testing mode started.', 'success');
    }

    const now = Date.now();
    const firstFireAt = now + DEFAULT_TEST_INTERVAL_SECONDS * 1000;
    setNextScheduledAt(firstFireAt);
    setSecondsRemaining(DEFAULT_TEST_INTERVAL_SECONDS);
    setIsTestingActive(true);
  }, [appEnabled, clearTimer, showToast]);

  // Single authoritative interval when testing mode is active
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
      body: 'This is your immediate test notification. Click to open the NEXORA storefront.',
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
      showToast(res.reason || 'Logged in notification history (browser permission required for OS banner).', 'info');
    }
  }, [deliverAndRecord, showToast]);

  const triggerScenario = useCallback(
    async (scenario: NotificationScenario) => {
      const res = await deliverAndRecord({
        title: scenario.title,
        body: scenario.body,
        url: scenario.url,
        scenario: scenario.id,
      });

      if (res.ok) {
        showToast(`Sent "${scenario.label}" notification.`, 'success');
      } else {
        showToast(`Logged "${scenario.label}" in history (${res.reason}).`, 'info');
      }
    },
    [deliverAndRecord, showToast]
  );

  const notifyOrderEvent = useCallback(
    async (title: string, body: string, url: string, scenario: NotificationScenarioId) => {
      if (!appEnabled || getBrowserPermission() !== 'granted') return;
      await deliverAndRecord({ title, body, url, scenario });
    },
    [appEnabled, deliverAndRecord]
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    showToast('Notification history cleared.', 'info');
  }, [showToast]);

  const testWebPushSubscription = useCallback(async () => {
    const res = await subscribeToRealWebPush();
    await refreshStatus();
    showToast(res.message, res.ok ? 'success' : 'info');
    return { ok: res.ok, message: res.message };
  }, [refreshStatus, showToast]);

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
        enableNotifications,
        disableNotifications,
        startTesting,
        stopTesting,
        sendTestNotification,
        triggerScenario,
        notifyOrderEvent,
        clearHistory,
        testWebPushSubscription,
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
