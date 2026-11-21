import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { PRODUCTS } from '../data/products';
import { CartEntry, CouponCode, Order, OrderStatus, Product, ShippingAddress } from '../types';
import { calculateCartPricing, normalizeCoupon, PriceBreakdown } from '../utils/pricing';
import { readStorage, removeStorage, STORAGE_KEYS, writeStorage } from '../utils/storage';

export interface HydratedCartItem {
  product: Product;
  quantity: number;
  lineTotal: number;
}

interface CartContextValue {
  entries: CartEntry[];
  items: HydratedCartItem[];
  totalCount: number;
  appliedCoupon: CouponCode | null;
  pricing: PriceBreakdown;
  shippingAddress: ShippingAddress | null;
  orders: Order[];
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string) => { ok: boolean; message: string };
  removeCoupon: () => void;
  saveShippingAddress: (address: ShippingAddress) => void;
  addOrder: (order: Order) => void;
  advanceOrderStatus: (orderId: string) => void;
  getOrderById: (orderId: string) => Order | undefined;
}

const ORDER_FLOW: OrderStatus[] = [
  'Order Placed',
  'Processing',
  'Shipped',
  'Out for Delivery',
  'Delivered',
];

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [entries, setEntries] = useState<CartEntry[]>(() =>
    readStorage<CartEntry[]>(STORAGE_KEYS.CART, [])
  );
  const [appliedCoupon, setAppliedCoupon] = useState<CouponCode | null>(() =>
    readStorage<CouponCode | null>(STORAGE_KEYS.COUPON, null)
  );
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress | null>(() =>
    readStorage<ShippingAddress | null>(STORAGE_KEYS.ADDRESS, null)
  );
  const [orders, setOrders] = useState<Order[]>(() =>
    readStorage<Order[]>(STORAGE_KEYS.ORDERS, [])
  );

  useEffect(() => {
    writeStorage(STORAGE_KEYS.CART, entries);
  }, [entries]);

  useEffect(() => {
    if (appliedCoupon) {
      writeStorage(STORAGE_KEYS.COUPON, appliedCoupon);
    } else {
      removeStorage(STORAGE_KEYS.COUPON);
    }
  }, [appliedCoupon]);

  useEffect(() => {
    if (shippingAddress) {
      writeStorage(STORAGE_KEYS.ADDRESS, shippingAddress);
    }
  }, [shippingAddress]);

  useEffect(() => {
    writeStorage(STORAGE_KEYS.ORDERS, orders);
  }, [orders]);

  const items = useMemo<HydratedCartItem[]>(() => {
    const list: HydratedCartItem[] = [];
    for (const entry of entries) {
      const product = PRODUCTS.find((p) => p.id === entry.productId);
      if (!product) continue;
      list.push({
        product,
        quantity: entry.quantity,
        lineTotal: product.price * entry.quantity,
      });
    }
    return list;
  }, [entries]);

  const totalCount = useMemo(
    () => items.reduce((acc, item) => acc + item.quantity, 0),
    [items]
  );

  const pricing = useMemo(
    () => calculateCartPricing(entries, appliedCoupon),
    [entries, appliedCoupon]
  );

  const addToCart = useCallback((productId: string, quantity = 1) => {
    const product = PRODUCTS.find((p) => p.id === productId);
    if (!product || product.stock <= 0) return;

    setEntries((prev) => {
      const existing = prev.find((e) => e.productId === productId);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map((e) =>
          e.productId === productId ? { ...e, quantity: nextQty } : e
        );
      }
      return [...prev, { productId, quantity: Math.min(product.stock, Math.max(1, quantity)) }];
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setEntries((prev) => prev.filter((e) => e.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    if (quantity <= 0) {
      setEntries((prev) => prev.filter((e) => e.productId !== productId));
      return;
    }
    const product = PRODUCTS.find((p) => p.id === productId);
    const maxStock = product ? product.stock : 99;
    setEntries((prev) =>
      prev.map((e) =>
        e.productId === productId
          ? { ...e, quantity: Math.min(maxStock, Math.max(1, quantity)) }
          : e
      )
    );
  }, []);

  const clearCart = useCallback(() => {
    setEntries([]);
    setAppliedCoupon(null);
  }, []);

  const applyCoupon = useCallback((code: string) => {
    const valid = normalizeCoupon(code);
    if (!valid) {
      return {
        ok: false,
        message: 'Invalid coupon code. Try NEXORA10, WELCOME20, or FREESHIP.',
      };
    }
    setAppliedCoupon(valid);
    return {
      ok: true,
      message: `Coupon ${valid} applied to your bag.`,
    };
  }, []);

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  const saveShippingAddress = useCallback((address: ShippingAddress) => {
    setShippingAddress(address);
  }, []);

  const addOrder = useCallback((order: Order) => {
    setOrders((prev) => [order, ...prev]);
  }, []);

  const advanceOrderStatus = useCallback((orderId: string) => {
    setOrders((prev) =>
      prev.map((order) => {
        if (order.id !== orderId) return order;
        const idx = ORDER_FLOW.indexOf(order.orderStatus);
        if (idx === -1 || idx >= ORDER_FLOW.length - 1) return order;
        return { ...order, orderStatus: ORDER_FLOW[idx + 1] };
      })
    );
  }, []);

  const getOrderById = useCallback(
    (orderId: string) => orders.find((o) => o.id === orderId),
    [orders]
  );

  return (
    <CartContext.Provider
      value={{
        entries,
        items,
        totalCount,
        appliedCoupon,
        pricing,
        shippingAddress,
        orders,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        applyCoupon,
        removeCoupon,
        saveShippingAddress,
        addOrder,
        advanceOrderStatus,
        getOrderById,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error('useCart must be used inside CartProvider');
  }
  return ctx;
}
