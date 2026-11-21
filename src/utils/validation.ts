import { ShippingAddress } from '../types';

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function validateShippingAddress(addr: ShippingAddress): Partial<Record<keyof ShippingAddress, string>> {
  const errors: Partial<Record<keyof ShippingAddress, string>> = {};

  if (!addr.fullName.trim() || addr.fullName.trim().length < 2) {
    errors.fullName = 'Enter a valid full name (at least 2 characters).';
  }
  if (!/^[6-9]\d{9}$/.test(addr.mobile.trim())) {
    errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  }
  if (!addr.houseNumber.trim()) {
    errors.houseNumber = 'Enter house, flat, or building number.';
  }
  if (!addr.street.trim() || addr.street.trim().length < 3) {
    errors.street = 'Enter street or locality name.';
  }
  if (!addr.city.trim() || addr.city.trim().length < 2) {
    errors.city = 'Enter city name.';
  }
  if (!addr.state.trim() || addr.state.trim().length < 2) {
    errors.state = 'Select or enter your state.';
  }
  if (!/^\d{6}$/.test(addr.pinCode.trim())) {
    errors.pinCode = 'Enter a valid 6-digit PIN code.';
  }

  return errors;
}

export function validateDemoUpiId(upiId: string): string | null {
  const trimmed = upiId.trim();
  if (!trimmed) return 'Enter a simulated UPI ID (e.g. demo@upi).';
  if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z0-9]{2,}$/.test(trimmed)) {
    return 'Use a valid UPI format such as demo@upi.';
  }
  return null;
}

export interface DemoCardInput {
  holderName: string;
  cardNumber: string;
  expiry: string;
  cvv: string;
}

export function formatCardNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 16);
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ');
}

export function formatExpiry(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 4);
  if (digits.length >= 3) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }
  return digits;
}

export function validateDemoCard(card: DemoCardInput): Partial<Record<keyof DemoCardInput, string>> {
  const errors: Partial<Record<keyof DemoCardInput, string>> = {};
  const digits = card.cardNumber.replace(/\s+/g, '');

  if (!card.holderName.trim() || card.holderName.trim().length < 2) {
    errors.holderName = 'Enter cardholder name.';
  }
  if (!/^\d{16}$/.test(digits)) {
    errors.cardNumber = 'Enter a 16-digit test card number (e.g. 4242 4242 4242 4242).';
  }
  if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(card.expiry.trim())) {
    errors.expiry = 'Enter expiry in MM/YY format.';
  }
  if (!/^\d{3,4}$/.test(card.cvv.trim())) {
    errors.cvv = 'Enter a 3 or 4 digit demo CVV.';
  }

  return errors;
}
