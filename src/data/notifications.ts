export const DEFAULT_TEST_INTERVAL_SECONDS = 60;

export type NotificationScenarioId =
  | 'general'
  | 'new-product'
  | 'discount'
  | 'cart-reminder'
  | 'order-confirmation'
  | 'shipping-update'
  | 'auto-test';

export interface NotificationScenario {
  id: NotificationScenarioId;
  label: string;
  description: string;
  title: string;
  body: string;
  url: string;
}

export interface AutoTestMessage {
  title: string;
  body: string;
  url: string;
}

export const AUTO_TEST_MESSAGES: AutoTestMessage[] = [
  {
    title: 'NEXORA Notification Test',
    body: 'This is your automatic notification test. Notifications are working correctly!',
    url: '/',
  },
  {
    title: 'Welcome to NEXORA!',
    body: 'Discover curated tech, lifestyle essentials, and home goods.',
    url: '/',
  },
  {
    title: 'Discover something new today.',
    body: 'Explore flagship headphones, monitors, and everyday carry on NEXORA.',
    url: '/shop',
  },
  {
    title: 'Check out our latest products.',
    body: 'New arrivals including Nova X Pro Smartphone and Mechanical RGB Keyboard are live.',
    url: '/product/nova-x-pro-smartphone',
  },
  {
    title: 'Your shopping experience awaits!',
    body: 'Tap to browse limited-time deals and save up to 50%.',
    url: '/shop?deals=true',
  },
  {
    title: 'NEXORA Notification Test',
    body: 'This is a one-minute notification test.',
    url: '/notifications',
  },
];

export const SAMPLE_SCENARIOS: NotificationScenario[] = [
  {
    id: 'general',
    label: 'General Announcement',
    description: 'Storefront highlight linking to the homepage.',
    title: 'Welcome to NEXORA',
    body: 'Discover. Shop. Experience. Explore 30 curated essentials across 6 categories.',
    url: '/',
  },
  {
    id: 'new-product',
    label: 'New Product Announcement',
    description: 'Opens the Nova X Pro Smartphone product details page.',
    title: 'New Arrival: Nova X Pro Smartphone',
    body: 'Titanium build, 120Hz AMOLED display, and 15% launch savings—available now.',
    url: '/product/nova-x-pro-smartphone',
  },
  {
    id: 'discount',
    label: 'Discount Announcement',
    description: 'Links to discounted items and coupon offers.',
    title: 'Limited Time Offers — Save Up to 50%',
    body: 'Use code WELCOME20 at checkout for an extra 20% off your simulated order.',
    url: '/shop?deals=true',
  },
  {
    id: 'cart-reminder',
    label: 'Cart Reminder',
    description: 'Deep-links directly to your Shopping Bag.',
    title: 'Items waiting in your NEXORA bag',
    body: 'Complete your simulated checkout anytime—orders ₹999+ ship free.',
    url: '/cart',
  },
  {
    id: 'order-confirmation',
    label: 'Order Confirmation',
    description: 'Opens My Orders to review confirmation details.',
    title: 'Demo Order Confirmed',
    body: 'Your simulated NEXORA order has been placed and is ready to track.',
    url: '/orders',
  },
  {
    id: 'shipping-update',
    label: 'Shipping Update',
    description: 'Opens My Orders to view simulated delivery tracking.',
    title: 'Out for Delivery — NEXORA',
    body: 'Simulated shipment update: your parcel is scheduled to arrive today.',
    url: '/orders',
  },
];
