const STORAGE_KEYS = {
  CART: 'nexora_cart_v1',
  COUPON: 'nexora_coupon_v1',
  WISHLIST: 'nexora_wishlist_v1',
  USERS: 'nexora_demo_users_v1',
  SESSION: 'nexora_demo_session_v1',
  ORDERS: 'nexora_demo_orders_v1',
  ADDRESS: 'nexora_demo_address_v1',
  NOTIF_ENABLED: 'nexora_notif_enabled_v1',
  NOTIF_HISTORY: 'nexora_notif_history_v1',
} as const;

export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore quota/storage errors in restricted contexts
  }
}

export function removeStorage(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage errors
  }
}

export { STORAGE_KEYS };
