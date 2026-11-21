import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  CreditCard,
  Loader2,
  RefreshCw,
  ShieldAlert,
  Smartphone,
} from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { PaymentMethod } from '../types';
import { formatINR } from '../utils/pricing';
import {
  DemoCardInput,
  formatCardNumber,
  formatExpiry,
  validateDemoCard,
  validateDemoUpiId,
} from '../utils/validation';
import { buildDemoOrder, runSimulatedPayment, SimulationMode } from '../utils/demoPayment';

export const Payment: React.FC = () => {
  const {
    items,
    pricing,
    appliedCoupon,
    shippingAddress,
    addOrder,
    clearCart,
  } = useCart();
  const { showToast } = useToast();
  const { notifyOrderEvent } = useNotifications();
  const navigate = useNavigate();

  const [method, setMethod] = useState<PaymentMethod>('UPI');
  const [upiId, setUpiId] = useState('');
  const [upiError, setUpiError] = useState<string | null>(null);

  // Kept strictly in ephemeral React state; never saved to LocalStorage
  const [card, setCard] = useState<DemoCardInput>({
    holderName: '',
    cardNumber: '',
    expiry: '',
    cvv: '',
  });
  const [cardErrors, setCardErrors] = useState<Partial<Record<keyof DemoCardInput, string>>>({});

  const [simMode, setSimMode] = useState<SimulationMode>('random');
  const [processing, setProcessing] = useState(false);
  const [failureInfo, setFailureInfo] = useState<{ message: string; txRef: string } | null>(null);

  if (items.length === 0) {
    return <Navigate to="/cart" replace />;
  }

  if (!shippingAddress) {
    return <Navigate to="/checkout" replace />;
  }

  const handleMethodChange = (next: PaymentMethod) => {
    setMethod(next);
    setUpiError(null);
    setCardErrors({});
    setFailureInfo(null);
  };

  const fillTestUpi = () => {
    setUpiId('demo@upi');
    setUpiError(null);
  };

  const fillTestCard = () => {
    setCard({
      holderName: shippingAddress.fullName || 'Demo Shopper',
      cardNumber: '4242 4242 4242 4242',
      expiry: '12/28',
      cvv: '123',
    });
    setCardErrors({});
  };

  const executePayment = async () => {
    setFailureInfo(null);

    if (method === 'UPI') {
      const err = validateDemoUpiId(upiId);
      if (err) {
        setUpiError(err);
        return;
      }
    }

    if (method === 'CREDIT_CARD' || method === 'DEBIT_CARD') {
      const errs = validateDemoCard(card);
      if (Object.keys(errs).length > 0) {
        setCardErrors(errs);
        return;
      }
    }

    setProcessing(true);
    const result = await runSimulatedPayment(method, simMode);
    setProcessing(false);

    if (!result.success) {
      setFailureInfo({
        message: result.message,
        txRef: result.transactionRef,
      });
      showToast('Simulated payment failed. You can retry below.', 'error');
      return;
    }

    const order = buildDemoOrder({
      items: items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        image: i.product.image,
        price: i.product.price,
        quantity: i.quantity,
        sku: i.product.sku,
      })),
      address: shippingAddress,
      subtotal: pricing.subtotal,
      discountAmount: pricing.discountAmount,
      couponCode: appliedCoupon,
      shippingFee: pricing.shippingFee,
      totalAmount: pricing.totalAmount,
      paymentMethod: method,
      transactionRef: result.transactionRef,
    });

    // Clear sensitive ephemeral card state immediately before navigation
    setCard({ holderName: '', cardNumber: '', expiry: '', cvv: '' });
    addOrder(order);
    clearCart();
    void notifyOrderEvent(
      `Order ${order.id} Confirmed`,
      `Your simulated order (${order.items.length} item${order.items.length > 1 ? 's' : ''}) is confirmed.`,
      `/order-success/${order.id}`,
      'order-confirmation'
    );
    showToast(
      method === 'COD' ? 'Simulated COD order placed' : 'Simulated payment successful',
      'success'
    );
    navigate(`/order-success/${order.id}`, { replace: true });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executePayment();
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="pb-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/checkout"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Edit Delivery Address</span>
          </Link>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Simulated Payment
          </h1>
        </div>
        <div className="text-left sm:text-right tabular-nums">
          <p className="text-xs text-slate-500">Payable Demo Total</p>
          <p className="font-display text-2xl font-extrabold text-slate-900">
            {formatINR(pricing.totalAmount)}
          </p>
        </div>
      </div>

      {/* Explicit Demo Notice */}
      <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="text-xs sm:text-sm text-amber-900 leading-relaxed">
          <strong>DEMO / SIMULATED PAYMENT ENVIRONMENT:</strong> Do not enter real bank card numbers,
          CVV, or live UPI credentials. No real payment gateway is connected, no money is transferred,
          and card details are never stored in LocalStorage.
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form onSubmit={handleSubmit} className="lg:col-span-8 space-y-6">
          {/* Payment Options */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-slate-900">
              Select Demo Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                {
                  id: 'UPI' as PaymentMethod,
                  label: 'UPI (Simulated)',
                  sub: 'Test ID: demo@upi',
                  icon: Smartphone,
                },
                {
                  id: 'CREDIT_CARD' as PaymentMethod,
                  label: 'Credit Card (Simulated)',
                  sub: 'Test: 4242 4242 4242 4242',
                  icon: CreditCard,
                },
                {
                  id: 'DEBIT_CARD' as PaymentMethod,
                  label: 'Debit Card (Simulated)',
                  sub: 'Test: 4242 4242 4242 4242',
                  icon: CreditCard,
                },
                {
                  id: 'COD' as PaymentMethod,
                  label: 'Cash on Delivery (Simulated)',
                  sub: 'Confirm without online charge',
                  icon: Banknote,
                },
              ].map((opt) => {
                const Icon = opt.icon;
                const active = method === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleMethodChange(opt.id)}
                    className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all min-h-[68px] ${
                      active
                        ? 'border-blue-600 bg-blue-50/60 ring-1 ring-blue-600'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 mt-0.5 ${
                        active ? 'text-blue-600' : 'text-slate-500'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900">{opt.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.sub}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Method-Specific Panel */}
            <div className="pt-4 border-t border-slate-200">
              {method === 'UPI' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="upi-id" className="text-xs font-semibold text-slate-700">
                      Demo UPI ID
                    </label>
                    <button
                      type="button"
                      onClick={fillTestUpi}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Use demo@upi
                    </button>
                  </div>
                  <input
                    id="upi-id"
                    type="text"
                    value={upiId}
                    onChange={(e) => {
                      setUpiId(e.target.value);
                      setUpiError(null);
                    }}
                    placeholder="demo@upi"
                    className={`w-full min-h-[44px] px-3.5 rounded-xl border text-sm bg-white focus:outline-none ${
                      upiError ? 'border-rose-500' : 'border-slate-200 focus:border-blue-600'
                    }`}
                  />
                  {upiError && <p className="text-xs text-rose-600">{upiError}</p>}
                  <p className="text-xs text-slate-500">
                    Simulated UPI verification—no actual UPI app or bank account is contacted.
                  </p>
                </div>
              )}

              {(method === 'CREDIT_CARD' || method === 'DEBIT_CARD') && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      {method === 'CREDIT_CARD' ? 'Simulated Credit Card' : 'Simulated Debit Card'} Details
                    </span>
                    <button
                      type="button"
                      onClick={fillTestCard}
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Autofill Test Card (4242...)
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label htmlFor="card-name" className="block text-xs font-medium text-slate-600 mb-1">
                        Cardholder Name (Demo)
                      </label>
                      <input
                        id="card-name"
                        type="text"
                        autoComplete="off"
                        value={card.holderName}
                        onChange={(e) => {
                          setCard((prev) => ({ ...prev, holderName: e.target.value }));
                          setCardErrors((prev) => ({ ...prev, holderName: undefined }));
                        }}
                        placeholder="Demo Shopper"
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 text-sm focus:border-blue-600 focus:outline-none"
                      />
                      {cardErrors.holderName && (
                        <p className="mt-1 text-xs text-rose-600">{cardErrors.holderName}</p>
                      )}
                    </div>

                    <div className="sm:col-span-2">
                      <label htmlFor="card-num" className="block text-xs font-medium text-slate-600 mb-1">
                        Test Card Number (Never Stored)
                      </label>
                      <input
                        id="card-num"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={19}
                        value={card.cardNumber}
                        onChange={(e) => {
                          setCard((prev) => ({
                            ...prev,
                            cardNumber: formatCardNumber(e.target.value),
                          }));
                          setCardErrors((prev) => ({ ...prev, cardNumber: undefined }));
                        }}
                        placeholder="4242 4242 4242 4242"
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-blue-600 focus:outline-none"
                      />
                      {cardErrors.cardNumber && (
                        <p className="mt-1 text-xs text-rose-600">{cardErrors.cardNumber}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="card-exp" className="block text-xs font-medium text-slate-600 mb-1">
                        Expiry (MM/YY)
                      </label>
                      <input
                        id="card-exp"
                        type="text"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={5}
                        value={card.expiry}
                        onChange={(e) => {
                          setCard((prev) => ({ ...prev, expiry: formatExpiry(e.target.value) }));
                          setCardErrors((prev) => ({ ...prev, expiry: undefined }));
                        }}
                        placeholder="12/28"
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-blue-600 focus:outline-none"
                      />
                      {cardErrors.expiry && (
                        <p className="mt-1 text-xs text-rose-600">{cardErrors.expiry}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="card-cvv" className="block text-xs font-medium text-slate-600 mb-1">
                        Demo CVV (Never Stored)
                      </label>
                      <input
                        id="card-cvv"
                        type="password"
                        inputMode="numeric"
                        autoComplete="off"
                        maxLength={4}
                        value={card.cvv}
                        onChange={(e) => {
                          setCard((prev) => ({
                            ...prev,
                            cvv: e.target.value.replace(/\D/g, ''),
                          }));
                          setCardErrors((prev) => ({ ...prev, cvv: undefined }));
                        }}
                        placeholder="123"
                        className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-blue-600 focus:outline-none"
                      />
                      {cardErrors.cvv && (
                        <p className="mt-1 text-xs text-rose-600">{cardErrors.cvv}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {method === 'COD' && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed">
                  <p className="font-semibold text-slate-900">Cash on Delivery (Simulated)</p>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
                    Confirms your demo order immediately with status <strong>Pending (Cash on Delivery)</strong>.
                    No online payment is processed or claimed.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* QA Demo Outcome Selector */}
          {method !== 'COD' && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-slate-900">QA Simulation Outcome</p>
                <p className="text-xs text-slate-500">
                  Defaults to random success/failure; switch to test retry flows deterministically.
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-white border border-slate-200 shrink-0">
                {(
                  [
                    { id: 'random', label: 'Random' },
                    { id: 'success', label: 'Success' },
                    { id: 'failure', label: 'Fail' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setSimMode(m.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      simMode === m.id
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Failure Banner with Retry */}
          {failureInfo && (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 p-5 space-y-3"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-sm font-bold text-rose-900">
                    Simulated Payment Failed
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-rose-800">{failureInfo.message}</p>
                  <p className="mt-1 font-mono text-xs text-rose-700">
                    Ref: {failureInfo.txRef}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={executePayment}
                disabled={processing}
                className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Retry Simulated Payment</span>
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={processing}
            className="w-full min-h-[52px] inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3.5 text-base font-semibold text-white hover:bg-blue-700 active:scale-[0.99] transition-all disabled:bg-blue-400"
          >
            {processing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processing Simulated Payment...</span>
              </>
            ) : method === 'COD' ? (
              <span>Place Simulated COD Order ({formatINR(pricing.totalAmount)})</span>
            ) : (
              <span>Pay Now — Demo ({formatINR(pricing.totalAmount)})</span>
            )}
          </button>
        </form>

        {/* Delivery Summary Sidebar */}
        <aside className="lg:col-span-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 sm:p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-slate-900">Delivering To</h2>
          <div className="text-sm text-slate-700 space-y-1">
            <p className="font-semibold text-slate-900">{shippingAddress.fullName}</p>
            <p>{shippingAddress.houseNumber}, {shippingAddress.street}</p>
            <p>{shippingAddress.city}, {shippingAddress.state} — {shippingAddress.pinCode}</p>
            <p className="text-xs text-slate-500 pt-1 tabular-nums">Mobile: +91 {shippingAddress.mobile}</p>
          </div>

          <div className="pt-4 border-t border-slate-200 space-y-2 text-sm tabular-nums">
            <div className="flex justify-between text-slate-600">
              <span>Items ({items.reduce((a, b) => a + b.quantity, 0)})</span>
              <span>{formatINR(pricing.subtotal)}</span>
            </div>
            {pricing.discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount</span>
                <span>−{formatINR(pricing.discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-slate-600">
              <span>Shipping</span>
              <span>{pricing.shippingFee === 0 ? 'Free' : formatINR(pricing.shippingFee)}</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
              <span>Total</span>
              <span>{formatINR(pricing.totalAmount)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
