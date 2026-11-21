import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronRight, Package, Truck, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationContext';
import { Order, OrderStatus } from '../types';
import { formatINR } from '../utils/pricing';

const STATUS_STEPS: OrderStatus[] = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

export const Orders: React.FC = () => {
  const { orders, advanceOrderStatus } = useCart();
  const { showToast } = useToast();
  const { notifyOrderEvent } = useNotifications();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const liveSelectedOrder = selectedOrder
    ? orders.find((o) => o.id === selectedOrder.id) || null
    : null;

  if (orders.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
          <Package className="w-7 h-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-bold text-slate-900">
          No orders placed yet
        </h1>
        <p className="mt-2 text-sm sm:text-base text-slate-600 max-w-md mx-auto">
          Complete a simulated checkout to see order tracking, status updates, and receipts here.
        </p>
        <Link
          to="/shop"
          className="mt-7 min-h-[48px] inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
        >
          <span>Shop Products</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="flex items-baseline justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            My Orders
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Simulated order history persisted in LocalStorage.
          </p>
        </div>
        <span className="text-sm text-slate-500 tabular-nums">
          {orders.length} {orders.length === 1 ? 'order' : 'orders'}
        </span>
      </div>

      <div className="mt-8 space-y-5">
        {orders.map((order) => (
          <article
            key={order.id}
            className="rounded-2xl border border-slate-200 bg-white overflow-hidden"
          >
            <div className="bg-slate-50/80 px-5 py-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4 text-xs sm:text-sm">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                <div>
                  <span className="text-slate-500 block text-xs">Order ID</span>
                  <span className="font-mono font-semibold text-slate-900">{order.id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Date</span>
                  <span className="font-medium text-slate-900">
                    {new Date(order.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Total</span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {formatINR(order.totalAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-xs">Payment</span>
                  <span className="font-medium text-slate-900">
                    {order.paymentMethod.replace('_', ' ')} · {order.paymentStatus}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
                  {order.orderStatus}
                </span>
              </div>
            </div>

            <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 overflow-x-auto">
                {order.items.slice(0, 3).map((item) => (
                  <img
                    key={item.productId}
                    src={item.image}
                    alt={item.name}
                    className="w-14 h-14 rounded-xl object-cover bg-slate-100 border border-slate-200 shrink-0"
                  />
                ))}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {order.items[0]?.name}
                    {order.items.length > 1 ? ` + ${order.items.length - 1} more` : ''}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Delivering to {order.address.city}, {order.address.pinCode}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {order.orderStatus !== 'Delivered' && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = STATUS_STEPS.indexOf(order.orderStatus) + 1;
                      const nextStatus = STATUS_STEPS[nextIdx] || order.orderStatus;
                      advanceOrderStatus(order.id);
                      showToast(`Order status updated to ${nextStatus}`, 'info');
                      void notifyOrderEvent(
                        `Shipping Update · ${order.id}`,
                        `Simulated order status is now: ${nextStatus}.`,
                        '/orders',
                        'shipping-update'
                      );
                    }}
                    className="min-h-[40px] px-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Advance Status
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOrder(order)}
                  className="min-h-[40px] inline-flex items-center gap-1 rounded-xl bg-slate-900 px-4 text-xs font-semibold text-white hover:bg-blue-600 transition-colors"
                >
                  <span>Order Details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Order Details Modal */}
      {liveSelectedOrder && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
        >
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-mono text-slate-500">{liveSelectedOrder.id}</p>
                <h2 id="order-detail-title" className="font-display text-xl font-bold text-slate-900">
                  Order Details
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
                className="min-h-[44px] min-w-[44px] -mr-2 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Simulated Progress Timeline */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                <span className="inline-flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span>Delivery Progress: {liveSelectedOrder.orderStatus}</span>
                </span>
                {liveSelectedOrder.orderStatus !== 'Delivered' && (
                  <button
                    type="button"
                    onClick={() => advanceOrderStatus(liveSelectedOrder.id)}
                    className="text-blue-600 hover:underline"
                  >
                    Simulate Next Step
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {STATUS_STEPS.map((step, index) => {
                  const activeIdx = STATUS_STEPS.indexOf(liveSelectedOrder.orderStatus);
                  const reached = index <= activeIdx;
                  return (
                    <div key={step} className="space-y-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          reached ? 'bg-blue-600' : 'bg-slate-200'
                        }`}
                      />
                      <p
                        className={`text-[10px] leading-tight ${
                          reached ? 'text-slate-900 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {step}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50 border border-slate-200 p-4 text-xs sm:text-sm">
              <div>
                <p className="text-xs text-slate-500 mb-1">Shipping Address</p>
                <p className="font-semibold text-slate-900">{liveSelectedOrder.address.fullName}</p>
                <p className="text-slate-600">
                  {liveSelectedOrder.address.houseNumber}, {liveSelectedOrder.address.street}
                </p>
                <p className="text-slate-600">
                  {liveSelectedOrder.address.city}, {liveSelectedOrder.address.state} —{' '}
                  {liveSelectedOrder.address.pinCode}
                </p>
                <p className="text-slate-500 mt-1 tabular-nums">
                  +91 {liveSelectedOrder.address.mobile}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Simulated Payment Info</p>
                <p className="font-semibold text-slate-900">
                  {liveSelectedOrder.paymentMethod.replace('_', ' ')}
                </p>
                <p className="text-slate-600">{liveSelectedOrder.paymentStatus}</p>
                <p className="font-mono text-xs text-slate-500 mt-1">
                  Ref: {liveSelectedOrder.transactionRef}
                </p>
              </div>
            </div>

            <div>
              <h3 className="font-display text-sm font-bold text-slate-900 mb-2">Items</h3>
              <ul className="divide-y divide-slate-200 border-y border-slate-200">
                {liveSelectedOrder.items.map((item) => (
                  <li key={item.productId} className="py-3 flex items-center gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-12 h-12 rounded-xl object-cover bg-slate-100 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{item.name}</p>
                      <p className="text-xs text-slate-500 tabular-nums">
                        Qty {item.quantity} × {formatINR(item.price)}
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-slate-900 tabular-nums">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 space-y-1.5 text-sm tabular-nums">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span>{formatINR(liveSelectedOrder.subtotal)}</span>
                </div>
                {liveSelectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount ({liveSelectedOrder.couponCode})</span>
                    <span>−{formatINR(liveSelectedOrder.discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Shipping</span>
                  <span>
                    {liveSelectedOrder.shippingFee === 0
                      ? 'Free'
                      : formatINR(liveSelectedOrder.shippingFee)}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                  <span>Total</span>
                  <span>{formatINR(liveSelectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
