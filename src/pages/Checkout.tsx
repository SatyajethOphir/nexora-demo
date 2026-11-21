import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, ShieldCheck } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { ShippingAddress } from '../types';
import { formatINR } from '../utils/pricing';
import { validateShippingAddress } from '../utils/validation';

const INDIAN_STATES = [
  'Andhra Pradesh',
  'Assam',
  'Bihar',
  'Chandigarh',
  'Delhi',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Tamil Nadu',
  'Telangana',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
];

export const Checkout: React.FC = () => {
  const { items, pricing, appliedCoupon, shippingAddress, saveShippingAddress } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<ShippingAddress>(
    shippingAddress || {
      fullName: user?.name || '',
      mobile: '',
      houseNumber: '',
      street: '',
      city: '',
      state: 'Karnataka',
      pinCode: '',
    }
  );
  const [errors, setErrors] = useState<Partial<Record<keyof ShippingAddress, string>>>({});

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900">Your bag is empty</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add at least one item to your shopping bag before proceeding to checkout.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center justify-center min-h-[44px] rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  const updateField = (key: keyof ShippingAddress, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const handleFillSample = () => {
    setForm({
      fullName: user?.name || 'Rohan Sharma',
      mobile: '9876543210',
      houseNumber: 'Flat 402, Horizon Residency',
      street: '100 Feet Road, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      pinCode: '560038',
    });
    setErrors({});
  };

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateShippingAddress(form);
    if (Object.keys(validation).length > 0) {
      setErrors(validation);
      return;
    }
    saveShippingAddress(form);
    navigate('/payment');
  };

  const inputClass = (hasError?: string) =>
    `w-full min-h-[44px] px-3.5 py-2.5 rounded-xl border text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none transition-colors ${
      hasError ? 'border-rose-500 focus:border-rose-600' : 'border-slate-200 focus:border-blue-600'
    }`;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Stepper Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Bag</span>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Checkout
          </h1>
        </div>

        <ol className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm font-medium">
          <li className="inline-flex items-center gap-1.5 text-blue-600 font-semibold">
            <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
              1
            </span>
            <span>Delivery Address</span>
          </li>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <li className="inline-flex items-center gap-1.5 text-slate-900">
            <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-xs flex items-center justify-center">
              2
            </span>
            <span>Summary</span>
          </li>
          <span className="text-slate-300" aria-hidden="true">/</span>
          <li className="inline-flex items-center gap-1.5 text-slate-400">
            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs flex items-center justify-center">
              3
            </span>
            <span>Demo Payment</span>
          </li>
        </ol>
      </div>

      <form onSubmit={handleContinue} className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
        {/* Step 1: Delivery Address */}
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-blue-600" />
              <h2 className="font-display text-lg font-bold text-slate-900">
                Step 1: Delivery Address
              </h2>
            </div>
            <button
              type="button"
              onClick={handleFillSample}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors"
            >
              Fill Sample Address
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="fullName" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                value={form.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="e.g. Rohan Sharma"
                className={inputClass(errors.fullName)}
              />
              {errors.fullName && <p className="mt-1 text-xs text-rose-600">{errors.fullName}</p>}
            </div>

            <div>
              <label htmlFor="mobile" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mobile Number (10 digits)
              </label>
              <input
                id="mobile"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={form.mobile}
                onChange={(e) => updateField('mobile', e.target.value.replace(/\D/g, ''))}
                placeholder="9876543210"
                className={inputClass(errors.mobile)}
              />
              {errors.mobile && <p className="mt-1 text-xs text-rose-600">{errors.mobile}</p>}
            </div>

            <div>
              <label htmlFor="pinCode" className="block text-xs font-semibold text-slate-700 mb-1.5">
                PIN Code
              </label>
              <input
                id="pinCode"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={form.pinCode}
                onChange={(e) => updateField('pinCode', e.target.value.replace(/\D/g, ''))}
                placeholder="560038"
                className={inputClass(errors.pinCode)}
              />
              {errors.pinCode && <p className="mt-1 text-xs text-rose-600">{errors.pinCode}</p>}
            </div>

            <div>
              <label htmlFor="houseNumber" className="block text-xs font-semibold text-slate-700 mb-1.5">
                House / Flat / Building No.
              </label>
              <input
                id="houseNumber"
                type="text"
                value={form.houseNumber}
                onChange={(e) => updateField('houseNumber', e.target.value)}
                placeholder="Flat 402, Horizon Residency"
                className={inputClass(errors.houseNumber)}
              />
              {errors.houseNumber && (
                <p className="mt-1 text-xs text-rose-600">{errors.houseNumber}</p>
              )}
            </div>

            <div>
              <label htmlFor="street" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Street / Locality
              </label>
              <input
                id="street"
                type="text"
                value={form.street}
                onChange={(e) => updateField('street', e.target.value)}
                placeholder="100 Feet Road, Indiranagar"
                className={inputClass(errors.street)}
              />
              {errors.street && <p className="mt-1 text-xs text-rose-600">{errors.street}</p>}
            </div>

            <div>
              <label htmlFor="city" className="block text-xs font-semibold text-slate-700 mb-1.5">
                City
              </label>
              <input
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
                placeholder="Bengaluru"
                className={inputClass(errors.city)}
              />
              {errors.city && <p className="mt-1 text-xs text-rose-600">{errors.city}</p>}
            </div>

            <div>
              <label htmlFor="state" className="block text-xs font-semibold text-slate-700 mb-1.5">
                State
              </label>
              <select
                id="state"
                value={form.state}
                onChange={(e) => updateField('state', e.target.value)}
                className={inputClass(errors.state)}
              >
                {INDIAN_STATES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
              {errors.state && <p className="mt-1 text-xs text-rose-600">{errors.state}</p>}
            </div>
          </div>
        </div>

        {/* Step 2: Order Summary */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 space-y-5">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <h2 className="font-display text-lg font-bold text-slate-900">
              Step 2: Order Summary
            </h2>
          </div>

          <ul className="divide-y divide-slate-200 max-h-72 overflow-y-auto pr-1">
            {items.map((item) => (
              <li key={item.product.id} className="py-3 flex items-center gap-3">
                <img
                  src={item.product.image}
                  alt={item.product.name}
                  className="w-12 h-12 rounded-xl object-cover bg-slate-200 shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 truncate">{item.product.name}</p>
                  <p className="text-xs text-slate-500 tabular-nums">
                    Qty {item.quantity} × {formatINR(item.product.price)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-900 tabular-nums shrink-0">
                  {formatINR(item.lineTotal)}
                </span>
              </li>
            ))}
          </ul>

          <div className="pt-4 border-t border-slate-200 space-y-2.5 text-sm tabular-nums">
            <div className="flex items-center justify-between text-slate-600">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">{formatINR(pricing.subtotal)}</span>
            </div>
            {pricing.discountAmount > 0 && (
              <div className="flex items-center justify-between text-emerald-700">
                <span>Discount ({appliedCoupon})</span>
                <span className="font-medium">−{formatINR(pricing.discountAmount)}</span>
              </div>
            )}
            <div className="flex items-center justify-between text-slate-600">
              <span>Shipping Fee</span>
              <span className="font-medium text-slate-900">
                {pricing.shippingFee === 0 ? 'Free' : formatINR(pricing.shippingFee)}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-base font-bold text-slate-900">
              <span>Final Amount</span>
              <span className="font-display text-xl">{formatINR(pricing.totalAmount)}</span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 active:scale-[0.98] transition-all"
          >
            <span>Continue to Simulated Payment</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="flex items-center justify-center gap-1.5 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-slate-400 shrink-0" />
            <span>Demo checkout only — no real money or card storage.</span>
          </p>
        </div>
      </form>
    </div>
  );
};
