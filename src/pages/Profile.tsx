import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Bell, BellOff, Heart, LogOut, MapPin, Package, Send, ShoppingBag, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { ConfirmDialog, PWAInstallButton } from '../components/Toast';

export const Profile: React.FC = () => {
  const { user, isAuthenticated, updateProfile, logout } = useAuth();
  const { orders, totalCount, shippingAddress } = useCart();
  const { wishlistIds } = useWishlist();
  const { showToast } = useToast();
  const {
    permission,
    appEnabled,
    isTestingActive,
    enableNotifications,
    disableNotifications,
    sendTestNotification,
  } = useNotifications();
  const navigate = useNavigate();

  const [nameInput, setNameInput] = useState(user?.name || '');
  const [confirmLogout, setConfirmLogout] = useState(false);

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    const res = updateProfile(nameInput);
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  const permissionSummary =
    permission === 'granted'
      ? 'Granted — browser notifications permitted.'
      : permission === 'denied'
        ? 'Denied — allow notifications in browser site settings.'
        : permission === 'unsupported'
          ? 'Unsupported — browser lacks Notification API.'
          : 'Default — permission not requested yet.';

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-display text-xl font-bold shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-slate-900">{user.name}</h1>
            <p className="text-sm text-slate-500">{user.email} · Demo Account</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setConfirmLogout(true)}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:text-rose-600 hover:border-rose-200 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* Quick Activity Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          to="/orders"
          className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-600 transition-colors flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-slate-500 font-medium">My Orders</p>
            <p className="font-display text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {orders.length}
            </p>
          </div>
          <Package className="w-6 h-6 text-blue-600" />
        </Link>

        <Link
          to="/wishlist"
          className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-600 transition-colors flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-slate-500 font-medium">Saved Wishlist</p>
            <p className="font-display text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {wishlistIds.length}
            </p>
          </div>
          <Heart className="w-6 h-6 text-rose-500" />
        </Link>

        <Link
          to="/cart"
          className="rounded-2xl border border-slate-200 bg-white p-5 hover:border-blue-600 transition-colors flex items-center justify-between"
        >
          <div>
            <p className="text-xs text-slate-500 font-medium">Shopping Bag</p>
            <p className="font-display text-2xl font-bold text-slate-900 mt-1 tabular-nums">
              {totalCount}
            </p>
          </div>
          <ShoppingBag className="w-6 h-6 text-slate-900" />
        </Link>
      </div>

      {/* Notification Settings Section in Profile */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Bell className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-bold text-slate-900">
                Notification Settings
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                Status: <strong className="capitalize text-slate-900">{permission}</strong> ·{' '}
                {permissionSummary}
                {isTestingActive ? ' · 1-minute testing active.' : ''}
              </p>
            </div>
          </div>

          <Link
            to="/notifications"
            className="text-xs font-semibold text-blue-600 hover:underline whitespace-nowrap shrink-0"
          >
            Open Testing Studio &amp; History →
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            onClick={enableNotifications}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs sm:text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span>Enable Notifications</span>
          </button>

          <button
            type="button"
            onClick={disableNotifications}
            disabled={!appEnabled && !isTestingActive}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <BellOff className="w-4 h-4" />
            <span>Disable Notifications</span>
          </button>

          <button
            type="button"
            onClick={sendTestNotification}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs sm:text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
          >
            <Send className="w-4 h-4" />
            <span>Test Notification</span>
          </button>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Edit */}
        <form
          onSubmit={handleSaveName}
          className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4"
        >
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h2 className="font-display text-base font-bold text-slate-900">Profile Settings</h2>
          </div>

          <div>
            <label htmlFor="profile-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Display Name
            </label>
            <input
              id="profile-name"
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500"
            />
          </div>

          <button
            type="submit"
            className="min-h-[44px] px-5 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
          >
            Save Changes
          </button>
        </form>

        {/* Saved Address & App Install */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="font-display text-base font-bold text-slate-900">
                Last Saved Delivery Address
              </h2>
            </div>
            {shippingAddress ? (
              <div className="text-sm text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">{shippingAddress.fullName}</p>
                <p>
                  {shippingAddress.houseNumber}, {shippingAddress.street}
                </p>
                <p>
                  {shippingAddress.city}, {shippingAddress.state} — {shippingAddress.pinCode}
                </p>
                <p className="text-xs text-slate-500 tabular-nums">Mobile: +91 {shippingAddress.mobile}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No delivery address saved yet. Add one during your first simulated checkout.
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 space-y-3">
            <h2 className="font-display text-base font-bold text-slate-900">Mobile App Experience</h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Install NEXORA as a standalone Progressive Web App on Android or iOS for instant
              launch and offline catalogue access.
            </p>
            <PWAInstallButton variant="full" />
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmLogout}
        title="Sign out of demo account?"
        description="Your cart, wishlist, and demo order history remain saved in LocalStorage."
        confirmLabel="Sign Out"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          logout();
          setConfirmLogout(false);
          showToast('Signed out of demo account', 'info');
          navigate('/');
        }}
      />
    </div>
  );
};
