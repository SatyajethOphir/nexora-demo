export type CategorySlug =
  | 'electronics'
  | 'fashion'
  | 'home-living'
  | 'accessories'
  | 'fitness'
  | 'gaming';

export type CategoryName =
  | 'Electronics'
  | 'Fashion'
  | 'Home & Living'
  | 'Accessories'
  | 'Fitness'
  | 'Gaming';

export interface ProductReview {
  id: string;
  author: string;
  rating: number;
  date: string;
  comment: string;
  verified: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: CategoryName;
  categorySlug: CategorySlug;
  price: number;
  originalPrice: number;
  discount: number;
  rating: number;
  reviewCount: number;
  image: string;
  gallery: string[];
  stock: number;
  sku: string;
  featured: boolean;
  bestSeller?: boolean;
  isNew?: boolean;
  highlights: string[];
  reviews: ProductReview[];
}

export interface Category {
  slug: CategorySlug;
  name: CategoryName;
  description: string;
  image: string;
  productCount: number;
}

export interface CartEntry {
  productId: string;
  quantity: number;
}

export type CouponCode = 'NEXORA10' | 'WELCOME20' | 'FREESHIP';

export interface ShippingAddress {
  fullName: string;
  mobile: string;
  houseNumber: string;
  street: string;
  city: string;
  state: string;
  pinCode: string;
}

export type PaymentMethod = 'UPI' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'COD';

export type PaymentStatus = 'Paid (Demo)' | 'Pending (Cash on Delivery)' | 'Failed (Demo)';

export type OrderStatus =
  | 'Order Placed'
  | 'Processing'
  | 'Shipped'
  | 'Out for Delivery'
  | 'Delivered';

export interface OrderItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  sku: string;
}

export interface Order {
  id: string;
  createdAt: string;
  items: OrderItem[];
  address: ShippingAddress;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  transactionRef: string;
}

export interface DemoUser {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
