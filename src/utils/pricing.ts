import { CartEntry, CouponCode } from '../types';
import { PRODUCTS } from '../data/products';

export const FREE_SHIPPING_THRESHOLD = 999;
export const STANDARD_SHIPPING_FEE = 99;

export interface CouponInfo {
  code: CouponCode;
  label: string;
  description: string;
}

export const COUPONS: Record<CouponCode, CouponInfo> = {
  NEXORA10: {
    code: 'NEXORA10',
    label: '10% Off Order',
    description: '10% instant discount on your entire order.',
  },
  WELCOME20: {
    code: 'WELCOME20',
    label: '20% Welcome Offer',
    description: '20% off for new NEXORA shoppers.',
  },
  FREESHIP: {
    code: 'FREESHIP',
    label: 'Free Express Shipping',
    description: 'Waives the ₹99 delivery fee on any order size.',
  },
};

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function normalizeCoupon(input: string): CouponCode | null {
  const normalized = input.trim().toUpperCase();
  if (normalized === 'NEXORA10' || normalized === 'WELCOME20' || normalized === 'FREESHIP') {
    return normalized;
  }
  return null;
}

export interface PriceBreakdown {
  subtotal: number;
  originalTotal: number;
  productSavings: number;
  discountAmount: number;
  shippingFee: number;
  totalAmount: number;
  appliedCoupon: CouponCode | null;
}

export function calculateCartPricing(
  entries: CartEntry[],
  coupon: CouponCode | null
): PriceBreakdown {
  let subtotal = 0;
  let originalTotal = 0;

  for (const entry of entries) {
    const product = PRODUCTS.find((p) => p.id === entry.productId);
    if (!product) continue;
    subtotal += product.price * entry.quantity;
    originalTotal += product.originalPrice * entry.quantity;
  }

  let discountAmount = 0;
  if (coupon === 'NEXORA10') {
    discountAmount = Math.round(subtotal * 0.1);
  } else if (coupon === 'WELCOME20') {
    discountAmount = Math.round(subtotal * 0.2);
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const qualifiesFreeShipping =
    entries.length === 0 ||
    coupon === 'FREESHIP' ||
    discountedSubtotal >= FREE_SHIPPING_THRESHOLD;

  const shippingFee = qualifiesFreeShipping ? 0 : STANDARD_SHIPPING_FEE;
  const totalAmount = discountedSubtotal + shippingFee;

  return {
    subtotal,
    originalTotal,
    productSavings: Math.max(0, originalTotal - subtotal),
    discountAmount,
    shippingFee,
    totalAmount,
    appliedCoupon: coupon,
  };
}
