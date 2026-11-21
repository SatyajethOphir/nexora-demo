import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag, Tag, Truck, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { COUPONS, formatINR, FREE_SHIPPING_THRESHOLD } from '../utils/pricing';
import { CartItem } from '../components/CartItem';
import { ConfirmDialog } from '../components/Toast';
import { CouponCode } from '../types';

export const Cart: React.FC = () => {
  const {
    items,
    totalCount,
    pricing,
    appliedCoupon,
    updateQuantity,
    removeFromCart,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState('');
  const [couponError, setCouponError] = useState('');
  const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError('');
    if (!couponInput.trim()) {
      setCouponError('Enter a coupon code.');
      return;
    }
    const res = applyCoupon(couponInput);
    if (res.ok) {
      showToast(res.message, 'success');
      setCouponInput('');
    } else {
      setCouponError(res.message);
    }
  };

  const handleQuickApply = (code: CouponCode) => {
    setCouponError('');
    const res = applyCoupon(code);
    if (res.ok) {
      showToast(res.message, 'success');
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <ShoppingBag className="w-7 h-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-slate-900">
          Your shopping bag is empty
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-md mx-auto">
          Explore our 30 curated essentials across electronics, fashion, homewares, and accessories.
        </p>
        <Link
          to="/shop"
          className="mt-7 min-h-[48px] inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          <span>Start Shopping</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const remainingForFreeShip = Math.max(
    0,
    FREE_SHIPPING_THRESHOLD - (pricing.subtotal - pricing.discountAmount)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-baseline justify-between gap-4 pb-6 border-b border-slate-200">
        <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Shopping Bag
        </h1>
        <span className="text-sm text-slate-500 tabular-nums">
          {totalCount} {totalCount === 1 ? 'item' : 'items'}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-7">
          {remainingForFreeShip > 0 && appliedCoupon !== 'FREESHIP' ? (
            <div className="mb-4 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center gap-3 text-sm text-slate-700">
              <Truck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                Add <strong className="tabular-nums">{formatINR(remainingForFreeShip)}</strong> more for free shipping, or apply <strong className="font-mono">FREESHIP</strong>.
              </span>
            </div>
          ) : (
            <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 flex items-center gap-3 text-sm text-emerald-800">
              <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Your order qualifies for free express shipping.</span>
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white px-5 sm:px-6">
            {items.map((item) => (
              <CartItem
                key={item.product.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={(id, name) => setPendingRemove({ id, name })}
              />
            ))}
          </div>
        </div>

        {/* Summary & Coupons */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-5">
            <h2 className="font-display text-lg font-bold text-slate-900">Order Summary</h2>

            {/* Coupon Form */}
            <div className="space-y-2.5">
              <form onSubmit={handleApplyCoupon} className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value);
                      setCouponError('');
                    }}
                    placeholder="Coupon code (e.g. NEXORA10)"
                    aria-label="Coupon code"
                    className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-sm font-semibold text-white hover:bg-blue-600 transition-colors whitespace-nowrap"
                >
                  Apply
                </button>
              </form>

              {couponError && <p className="text-xs text-rose-600">{couponError}</p>}

              {appliedCoupon && (
                <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-900">
                  <span>
                    Applied <strong className="font-mono">{appliedCoupon}</strong> ({COUPONS[appliedCoupon].label})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      removeCoupon();
                      showToast('Coupon removed', 'info');
                    }}
                    aria-label="Remove coupon"
                    className="p-1 text-blue-700 hover:text-blue-950"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {(['NEXORA10', 'WELCOME20', 'FREESHIP'] as CouponCode[]).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleQuickApply(code)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-medium border transition-colors ${
                      appliedCoupon === code
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 space-y-3 text-sm tabular-nums">
              <div className="flex items-center justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{formatINR(pricing.subtotal)}</span>
              </div>
              {pricing.discountAmount > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span>Coupon Discount ({appliedCoupon})</span>
                  <span className="font-medium">−{formatINR(pricing.discountAmount)}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-slate-600">
                <span>Shipping</span>
                <span className="font-medium text-slate-900">
                  {pricing.shippingFee === 0 ? 'Free' : formatINR(pricing.shippingFee)}
                </span>
              </div>
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-bold text-slate-900">
                <span>Total</span>
                <span className="font-display text-xl">{formatINR(pricing.totalAmount)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/checkout')}
              className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingRemove}
        title="Remove item from bag?"
        description={`Are you sure you want to remove ${pendingRemove?.name} from your shopping bag?`}
        confirmLabel="Remove"
        onCancel={() => setPendingRemove(null)}
        onConfirm={() => {
          if (pendingRemove) {
            removeFromCart(pendingRemove.id);
            showToast(`${pendingRemove.name} removed from bag`, 'info');
            setPendingRemove(null);
          }
        }}
      />
    </div>
  );
};
