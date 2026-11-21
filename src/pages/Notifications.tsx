import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Info,
  Play,
  Send,
  Server,
  ShieldAlert,
  Square,
  Trash2,
} from 'lucide-react';
import { SAMPLE_SCENARIOS } from '../data/notifications';
import { useNotifications } from '../context/NotificationContext';
import { ConfirmDialog } from '../components/Toast';

export const Notifications: React.FC = () => {
  const {
    permission,
    appEnabled,
    isTestingActive,
    intervalSeconds,
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
    clearHistory,
    testWebPushSubscription,
  } = useNotifications();

  const [confirmClear, setConfirmClear] = useState(false);

  const formatCountdown = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const rem = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const formattedNextTime = nextScheduledAt
    ? new Date(nextScheduledAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : 'Not scheduled';

  const permissionMessage = () => {
    if (permission === 'granted') {
      return 'Browser permission is granted. NEXORA can display native browser and Service Worker notifications.';
    }
    if (permission === 'denied') {
      return 'Browser permission is denied. Open your browser site permissions for this URL and allow Notifications to enable OS alerts.';
    }
    if (permission === 'unsupported') {
      return 'The Notification API is unavailable in this browser or context.';
    }
    return 'Browser permission has not been requested yet. Click Enable Notifications to allow alerts.';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            PWA &amp; Android Compatibility
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Notification Settings
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Manage browser notification permissions, test 1-minute scheduled alerts, and inspect Web Push readiness.
          </p>
        </div>

        {/* Clean unboxed metadata summary */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
          <span>
            Permission:{' '}
            <strong className="text-slate-900 capitalize">{permission}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            App Delivery:{' '}
            <strong className="text-slate-900">{appEnabled ? 'Enabled' : 'Disabled'}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Service Worker:{' '}
            <strong className="text-slate-900">{swRegistered ? 'Active' : 'Registering'}</strong>
          </span>
        </div>
      </div>

      {/* Section 1: Permission Controls */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 text-slate-900">
              {permission === 'granted' && appEnabled ? (
                <Bell className="w-5 h-5 text-blue-600" />
              ) : (
                <BellOff className="w-5 h-5 text-slate-500" />
              )}
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Browser Notification Permission
              </h2>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                {permissionMessage()}
              </p>
            </div>
          </div>
        </div>

        {permission === 'denied' && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-3.5 flex items-start gap-2.5 text-xs sm:text-sm text-rose-900">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              Browser blocked notifications. Click the lock/tune icon in your address bar, set
              Notifications to <strong>Allow</strong>, then reload or refocus this tab.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={enableNotifications}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
          >
            <Bell className="w-4 h-4" />
            <span>Enable Notifications</span>
          </button>

          <button
            type="button"
            onClick={disableNotifications}
            disabled={!appEnabled && !isTestingActive}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <BellOff className="w-4 h-4" />
            <span>Disable Notifications</span>
          </button>

          <button
            type="button"
            onClick={sendTestNotification}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap sm:ml-auto"
          >
            <Send className="w-4 h-4" />
            <span>Send Test Notification</span>
          </button>
        </div>
      </section>

      {/* Section 2: Automatic 1-Minute Testing Mode */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Automatic 1-Minute Notification Testing
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              Automatically dispatches one rotating sample notification every{' '}
              <strong className="tabular-nums">{intervalSeconds} seconds</strong> while this tab or
              installed PWA remains open.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isTestingActive ? (
              <button
                type="button"
                onClick={startTesting}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
                <span>Start Testing</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={stopTesting}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-semibold text-white hover:bg-rose-700 transition-colors whitespace-nowrap"
              >
                <Square className="w-4 h-4" />
                <span>Stop Testing</span>
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">Countdown to Next</p>
            <p className="mt-1 font-mono text-2xl font-bold text-slate-900 tabular-nums">
              {isTestingActive ? formatCountdown(secondsRemaining) : '01:00'}
            </p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">Next Scheduled Time</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {formattedNextTime}
            </p>
          </div>

          <div className="rounded-xl bg-white border border-slate-200 p-4">
            <p className="text-xs text-slate-500 font-medium">Interval &amp; Session Sent</p>
            <p className="mt-1 font-mono text-lg font-bold text-slate-900 tabular-nums">
              {intervalSeconds}s · {sentCountInSession} sent
            </p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-4 flex items-start gap-2.5 text-xs text-slate-600 leading-relaxed">
          <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <p>
            <strong>Important Architecture Distinction:</strong> This 60-second testing timer runs
            locally in JavaScript while NEXORA is open and continues smoothly across page navigation.
            JavaScript timers cannot execute after the browser or Android app is completely closed—true
            background and closed-app notifications require server-triggered Web Push messages delivered
            via the Push API.
          </p>
        </div>
      </section>

      {/* Section 3: Sample Notification Scenarios */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Sample Notification Scenarios
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Trigger e-commerce notification templates. Clicking a dispatched notification focuses NEXORA
            and opens the corresponding destination route.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SAMPLE_SCENARIOS.map((scenario) => (
            <div
              key={scenario.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span className="font-semibold text-blue-600 uppercase tracking-wider">
                    {scenario.label}
                  </span>
                  <span className="font-mono">{scenario.url}</span>
                </div>
                <h3 className="font-display text-base font-semibold text-slate-900">
                  {scenario.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{scenario.body}</p>
              </div>

              <button
                type="button"
                onClick={() => triggerScenario(scenario)}
                className="self-start min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send {scenario.label}</span>
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Real Web Push Architecture Readiness */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Server className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Real Web Push &amp; VAPID Architecture
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Service Worker <code className="font-mono text-xs">push</code> and{' '}
                <code className="font-mono text-xs">notificationclick</code> listeners are active.
                Connect a backend with <code className="font-mono text-xs">VITE_VAPID_PUBLIC_KEY</code>{' '}
                for closed-app background push delivery.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={testWebPushSubscription}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <CheckCircle2 className="w-4 h-4 text-blue-600" />
            <span>Check Push Subscription</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
            <span className="text-slate-500 block">PushManager API</span>
            <span className="font-semibold text-slate-900">
              {webPushStatus.supported ? 'Supported' : 'Unavailable'}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
            <span className="text-slate-500 block">VAPID Public Key</span>
            <span className="font-semibold text-slate-900">
              {webPushStatus.vapidConfigured ? 'Configured' : 'Not configured (Demo mode)'}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
            <span className="text-slate-500 block">Server Subscription</span>
            <span className="font-semibold text-slate-900">
              {webPushStatus.subscribed ? 'Subscribed' : 'Not subscribed'}
            </span>
          </div>
        </div>
      </section>

      {/* Section 5: Notification History */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-900">
              Notification History
            </h2>
            <p className="text-sm text-slate-500 tabular-nums">
              {history.length} {history.length === 1 ? 'entry' : 'entries'} stored locally
            </p>
          </div>

          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:text-rose-600 hover:border-rose-200 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Notification History</span>
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
            No notifications triggered yet. Click <strong>Send Test Notification</strong> or start
            the 1-minute testing mode above.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-200 overflow-hidden">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800 uppercase tracking-wider">
                      {item.scenario}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {item.deliveredVia === 'service-worker'
                        ? 'Service Worker'
                        : item.deliveredVia === 'notification-api'
                          ? 'Notification API'
                          : 'In-App Log'}
                    </span>
                  </div>
                  <p className="font-display text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.body}</p>
                  {item.note && (
                    <p className="text-xs text-amber-700">{item.note}</p>
                  )}
                </div>

                <Link
                  to={item.url}
                  className="self-start sm:self-center shrink-0 min-h-[40px] inline-flex items-center px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors font-mono"
                >
                  Open {item.url}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmClear}
        title="Clear notification history?"
        description="This removes all logged test notifications from LocalStorage."
        confirmLabel="Clear History"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          clearHistory();
          setConfirmClear(false);
        }}
      />
    </div>
  );
};
