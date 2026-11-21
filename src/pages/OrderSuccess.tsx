import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatINR } from '../utils/pricing';

export const OrderSuccess: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { getOrderById } = useCart();

  const order = orderId ? getOrderById(orderId) : undefined;

  if (!order) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-slate-900">Order record not found</h1>
        <p className="mt-2 text-sm text-slate-600">
          View your recent simulated orders in My Orders.
        </p>
        <Link
          to="/orders"
          className="mt-6 inline-flex items-center justify-center min-h-[44px] rounded-xl bg-slate-900 px-6 text-sm font-semibold text-white"
        >
          Go to My Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-600">
            Simulated Order Confirmed
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-slate-900">
            Thank you, {order.address.fullName}
          </h1>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            Your demo order has been saved locally.{' '}
            {order.paymentMethod === 'COD'
              ? 'No online payment was charged (Cash on Delivery simulation).'
              : 'Simulated payment was approved in demo mode—no real money was transferred.'}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm">
          <div>
            <p className="text-xs text-slate-500">Order ID</p>
            <p className="font-mono font-semibold text-slate-900 mt-0.5">{order.id}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Simulated Reference</p>
            <p className="font-mono font-semibold text-slate-900 mt-0.5">{order.transactionRef}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Payment Status</p>
            <p className="font-semibold text-slate-900 mt-0.5">{order.paymentStatus}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="font-display text-sm font-bold text-slate-900">Items Ordered</h2>
          <ul className="divide-y divide-slate-200 border-y border-slate-200">
            {order.items.map((item) => (
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
          <div className="flex justify-between pt-2 text-base font-bold text-slate-900 tabular-nums">
            <span>Total</span>
            <span>{formatINR(order.totalAmount)}</span>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Link
            to="/orders"
            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white hover:bg-blue-600 transition-colors"
          >
            <Package className="w-4 h-4" />
            <span>View My Orders</span>
          </Link>
          <Link
            to="/shop"
            className="flex-1 min-h-[48px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};
