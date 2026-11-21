import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Info,
  KeyRound,
  Loader2,
  LogOut,
  Megaphone,
  Play,
  RefreshCw,
  Send,
  Server,
  ShieldAlert,
  Smartphone,
  Square,
  Timer,
  Trash2,
} from 'lucide-react';
import { SAMPLE_SCENARIOS } from '../data/notifications';
import { useNotifications } from '../context/NotificationContext';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/Toast';
import {
  broadcastPushCampaign,
  claimPushAdminPasscode,
  fetchPushAdminStatus,
  fetchPushServerHealth,
  loginPushAdmin,
  PushAdminStatus,
  ServerHealthStatus,
} from '../services/pushNotificationService';
import { API_BASE_URL, PRODUCTION_API_BASE_URL } from '../config/api';

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
    subscribingPush,
    sendingServerPush,
    enableNotifications,
    disableNotifications,
    startTesting,
    stopTesting,
    sendTestNotification,
    triggerScenario,
    triggerServerScenario,
    clearHistory,
    syncBackgroundPush,
    sendBackgroundPushTest,
  } = useNotifications();
  const { showToast } = useToast();

  const [confirmClear, setConfirmClear] = useState(false);

  // Admin Broadcast State — Bearer token kept strictly in React memory (never persisted to localStorage)
  const [adminStatus, setAdminStatus] = useState<PushAdminStatus | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [adminBusy, setAdminBusy] = useState(false);

  const [campaignTitle, setCampaignTitle] = useState('Flash Deal on NEXORA');
  const [campaignBody, setCampaignBody] = useState(
    'Save up to 50% on curated tech and lifestyle essentials today.'
  );
  const [campaignUrl, setCampaignUrl] = useState('/shop?deals=true');
  const [lastBroadcastStats, setLastBroadcastStats] = useState<string | null>(null);
  const [serverHealth, setServerHealth] = useState<ServerHealthStatus | null>(null);

  useEffect(() => {
    let mounted = true;
    void fetchPushAdminStatus(adminToken).then((status) => {
      if (mounted && status) {
        setAdminStatus(status);
      }
    });
    void fetchPushServerHealth().then((health) => {
      if (mounted) {
        setServerHealth(health);
      }
    });
    return () => {
      mounted = false;
    };
  }, [adminToken, webPushStatus.subscribed]);

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
      return 'Browser permission is granted. NEXORA can display native OS notifications via Service Worker & Web Push.';
    }
    if (permission === 'denied') {
      return 'Browser permission is denied. Open your browser site permissions for this URL and allow Notifications to enable OS alerts.';
    }
    if (permission === 'unsupported') {
      return 'The Notification API is unavailable in this browser or context.';
    }
    return 'Browser permission has not been requested yet. Click Enable Notifications to allow alerts.';
  };

  const handleAdminSetupOrLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = passcodeInput.trim();
    if (!trimmed) return;

    setAdminBusy(true);
    try {
      const needsClaim = adminStatus && !adminStatus.configuredViaEnv && !adminStatus.claimed;
      const res = needsClaim
        ? await claimPushAdminPasscode(trimmed)
        : await loginPushAdmin(trimmed);

      if (!res.ok || !res.token) {
        showToast(res.error || 'Authentication failed.', 'error');
        return;
      }

      setAdminToken(res.token);
      setPasscodeInput('');
      setAdminStatus((prev) => ({
        configuredViaEnv: prev?.configuredViaEnv ?? false,
        claimed: true,
        authenticated: true,
        subscriberCount: res.subscriberCount ?? prev?.subscriberCount ?? 0,
      }));
      showToast(
        needsClaim
          ? 'Admin passcode set and signed in for this session.'
          : 'Signed in to Push Broadcast Console.',
        'success'
      );
    } finally {
      setAdminBusy(false);
    }
  };

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken) return;

    setAdminBusy(true);
    setLastBroadcastStats(null);
    try {
      const res = await broadcastPushCampaign(adminToken, {
        title: campaignTitle.trim(),
        body: campaignBody.trim(),
        url: campaignUrl.trim() || '/',
        scenario: 'broadcast',
      });

      if (!res.ok) {
        if (res.error?.toLowerCase().includes('authentication')) {
          setAdminToken(null);
        }
        showToast(res.error || 'Broadcast failed.', 'error');
        return;
      }

      const summary = `Delivered to ${res.sent ?? 0} device(s)${
        res.removedExpired ? ` · Pruned ${res.removedExpired} expired` : ''
      }${res.failed ? ` · ${res.failed} failed` : ''}`;
      setLastBroadcastStats(summary);
      setAdminStatus((prev) =>
        prev ? { ...prev, subscriberCount: res.subscriberCount ?? prev.subscriberCount } : prev
      );
      showToast(summary, 'success');
    } finally {
      setAdminBusy(false);
    }
  };

  const deliveryLabel = (via: string) => {
    if (via === 'web-push') return 'Web Push (VAPID)';
    if (via === 'service-worker') return 'Service Worker';
    if (via === 'notification-api') return 'Notification API';
    return 'In-App Log';
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            PWA &amp; Android TWA Push
          </p>
          <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Notification Settings
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Manage browser notification permissions, test closed-app background Web Push, and inspect delivery logs.
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
            Service Worker:{' '}
            <strong className="text-slate-900">{swRegistered ? 'Active' : 'Registering'}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Background Push:{' '}
            <strong className="text-slate-900">
              {webPushStatus.subscribed && webPushStatus.serverSynced ? 'Subscribed' : 'Not Subscribed'}
            </strong>
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
                Browser &amp; Android Notification Permission
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
              Notifications are blocked. Open your browser or Android App Info notification settings,
              set Notifications to <strong>Allow</strong>, then return to NEXORA.
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
            disabled={!appEnabled && !isTestingActive && !webPushStatus.subscribed}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <BellOff className="w-4 h-4" />
            <span>Disable Notifications</span>
          </button>

          <button
            type="button"
            onClick={sendTestNotification}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors whitespace-nowrap sm:ml-auto"
          >
            <Send className="w-4 h-4 text-blue-600" />
            <span>Send Local SW Test</span>
          </button>
        </div>
      </section>

      {/* Section 2: Real Background Web Push (Closed-App & Android TWA) */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Server className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Real Background Web Push (Closed-App &amp; Android TWA)
              </h2>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                Uses VAPID-signed payloads sent from the NEXORA backend to Chrome / FCM push servers.
                Notifications arrive natively on Android and desktop even after the tab, PWA, or Android TWA is completely closed.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={syncBackgroundPush}
            disabled={subscribingPush || permission !== 'granted'}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            {subscribingPush ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            ) : (
              <RefreshCw className="w-4 h-4 text-blue-600" />
            )}
            <span>
              {webPushStatus.subscribed && webPushStatus.serverSynced
                ? 'Refresh Push Sync'
                : 'Subscribe to Server Push'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
            <span className="text-slate-500 block">Backend API Endpoint</span>
            <span className="font-semibold font-mono text-slate-900 break-all">
              {API_BASE_URL || `Same-Origin (${PRODUCTION_API_BASE_URL} in prod)`}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
            <span className="text-slate-500 block">Database Storage</span>
            <span className="font-semibold text-slate-900">
              {serverHealth
                ? serverHealth.storage === 'postgresql'
                  ? `PostgreSQL (${serverHealth.database})`
                  : 'Preview Memory (Configure DATABASE_URL)'
                : 'Checking...'}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
            <span className="text-slate-500 block">Server VAPID Keys</span>
            <span className="font-semibold text-slate-900">
              {!webPushStatus.vapidConfigured
                ? 'Unreachable'
                : webPushStatus.ephemeralVapid
                  ? 'Ephemeral Preview Keys'
                  : 'Production Env Keys'}
            </span>
          </div>
          <div className="rounded-xl bg-slate-50 border border-slate-200 px-3.5 py-2.5">
            <span className="text-slate-500 block">Device Registration</span>
            <span className="font-semibold text-slate-900">
              {webPushStatus.subscribed && webPushStatus.serverSynced
                ? 'Subscribed & Synced'
                : webPushStatus.subscribed
                  ? 'Needs Re-Sync'
                  : 'Not Subscribed'}
            </span>
          </div>
        </div>

        {webPushStatus.ephemeralVapid && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 flex items-start gap-2.5 text-xs text-amber-900 leading-relaxed">
            <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p>
              <strong>Preview VAPID Keys Active:</strong> Real server Web Push works immediately in this
              session, and NEXORA automatically re-syncs subscriptions when open. For persistent closed-app
              subscriptions across server restarts, configure{' '}
              <code className="font-mono">VAPID_PUBLIC_KEY</code> and{' '}
              <code className="font-mono">VAPID_PRIVATE_KEY</code> in environment secrets.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void sendBackgroundPushTest(0)}
            disabled={sendingServerPush || permission !== 'granted'}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {sendingServerPush ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Send Server Push Now</span>
          </button>

          <button
            type="button"
            onClick={() => void sendBackgroundPushTest(5)}
            disabled={sendingServerPush || permission !== 'granted'}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            <Timer className="w-4 h-4" />
            <span>Send Delayed Push (5s — Close App to Test)</span>
          </button>
        </div>

        {/* Android TWA Compatibility Checklist */}
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex items-start gap-3 text-xs text-slate-600 leading-relaxed">
          <Smartphone className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-slate-900">Android Chrome &amp; TWA Compatibility</p>
            <p>
              On Android Chrome and Bubblewrap TWAs, set{' '}
              <code className="font-mono">enableNotifications: true</code> in{' '}
              <code className="font-mono">twa-manifest.json</code> and host Digital Asset Links at{' '}
              <code className="font-mono">/.well-known/assetlinks.json</code> over HTTPS. Android 13+
              prompts for <code className="font-mono">POST_NOTIFICATIONS</code> automatically or forwards
              the web permission cleanly to Chrome&apos;s push channel.
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: Automatic 1-Minute Foreground Testing Mode */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Automatic 1-Minute Foreground Testing
              </h2>
            </div>
            <p className="text-sm text-slate-600">
              Automatically dispatches one rotating sample notification every{' '}
              <strong className="tabular-nums">{intervalSeconds} seconds</strong> while NEXORA remains open.
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
      </section>

      {/* Section 4: Protected Push Broadcast Admin Console */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Megaphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-lg font-bold text-slate-900">
                Server Broadcast Console (Admin)
              </h2>
              <p className="text-sm text-slate-600 mt-0.5">
                Trigger genuine multi-device Web Push campaigns to all registered NEXORA subscribers.
              </p>
            </div>
          </div>

          {adminToken && (
            <button
              type="button"
              onClick={() => {
                setAdminToken(null);
                setLastBroadcastStats(null);
                showToast('Signed out of Push Broadcast Console.', 'info');
              }}
              className="self-start min-h-[40px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out Admin</span>
            </button>
          )}
        </div>

        {!adminToken ? (
          <form onSubmit={handleAdminSetupOrLogin} className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <div className="flex items-start gap-2 text-xs text-slate-700">
              <KeyRound className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                {adminStatus && !adminStatus.configuredViaEnv && !adminStatus.claimed ? (
                  <p>
                    <strong>First-Run Admin Setup:</strong> Set a local admin passcode (6+ characters)
                    to unlock server-wide push broadcasts. Sessions remain strictly in memory.
                  </p>
                ) : (
                  <p>
                    Enter your <code className="font-mono">PUSH_ADMIN_PASSCODE</code> to sign in and
                    broadcast notifications to subscribed devices.
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder={
                  adminStatus && !adminStatus.configuredViaEnv && !adminStatus.claimed
                    ? 'Create admin passcode (min 6 chars)'
                    : 'Enter admin passcode'
                }
                required
                minLength={6}
                className="flex-1 min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-white text-sm focus:border-blue-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={adminBusy || passcodeInput.trim().length < 6}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-blue-600 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {adminBusy && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {adminStatus && !adminStatus.configuredViaEnv && !adminStatus.claimed
                    ? 'Set Passcode & Unlock'
                    : 'Unlock Console'}
                </span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleBroadcastSubmit} className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Authenticated Push Session</span>
              </span>
              <span className="text-slate-700 font-medium tabular-nums">
                Active Subscribed Devices: <strong>{adminStatus?.subscriberCount ?? 0}</strong>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="bc-title" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Notification Title
                </label>
                <input
                  id="bc-title"
                  type="text"
                  maxLength={120}
                  required
                  value={campaignTitle}
                  onChange={(e) => setCampaignTitle(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div>
                <label htmlFor="bc-url" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Route (opens on tap)
                </label>
                <input
                  id="bc-url"
                  type="text"
                  maxLength={200}
                  required
                  value={campaignUrl}
                  onChange={(e) => setCampaignUrl(e.target.value)}
                  placeholder="/shop?deals=true"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="bc-body" className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Message Body
                </label>
                <input
                  id="bc-body"
                  type="text"
                  maxLength={280}
                  required
                  value={campaignBody}
                  onChange={(e) => setCampaignBody(e.target.value)}
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="submit"
                disabled={adminBusy}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {adminBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Megaphone className="w-4 h-4" />
                )}
                <span>Send Broadcast to Subscribers</span>
              </button>

              {lastBroadcastStats && (
                <p className="text-xs font-medium text-emerald-700 tabular-nums">
                  {lastBroadcastStats}
                </p>
              )}
            </div>
          </form>
        )}
      </section>

      {/* Section 5: Sample Notification Scenarios */}
      <section className="space-y-4">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-900">
            Sample Notification Scenarios
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Trigger e-commerce templates locally via Service Worker or via real backend Web Push. Tapping opens the destination route.
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

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void triggerScenario(scenario)}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold text-slate-900 hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Local SW</span>
                </button>

                <button
                  type="button"
                  disabled={sendingServerPush || permission !== 'granted'}
                  onClick={() => void triggerServerScenario(scenario, 0)}
                  className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 text-xs font-semibold text-blue-700 hover:bg-blue-600 hover:text-white disabled:opacity-50 transition-colors"
                >
                  <Server className="w-3.5 h-3.5" />
                  <span>Server Push</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 6: Notification History */}
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
            No notifications triggered yet. Try <strong>Send Server Push Now</strong> or start the
            1-minute testing mode above.
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
                    <span>{deliveryLabel(item.deliveredVia)}</span>
                  </div>
                  <p className="font-display text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="text-sm text-slate-600">{item.body}</p>
                  {item.note && (
                    <p className="text-xs text-slate-500">{item.note}</p>
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
