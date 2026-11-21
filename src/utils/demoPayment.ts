import { Order, OrderItem, PaymentMethod, ShippingAddress } from '../types';

export type SimulationMode = 'random' | 'success' | 'failure';

export interface SimulatedPaymentResult {
  success: boolean;
  transactionRef: string;
  message: string;
}

export function generateDemoOrderId(): string {
  const ts = Date.now().toString().slice(-6);
  const rand = Math.floor(100 + Math.random() * 900);
  return `NX-${ts}-${rand}`;
}

export function generateDemoTxRef(method: PaymentMethod): string {
  const prefix =
    method === 'UPI'
      ? 'DEMO-UPI'
      : method === 'CREDIT_CARD'
        ? 'DEMO-CC'
        : method === 'DEBIT_CARD'
          ? 'DEMO-DC'
          : 'DEMO-COD';
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${rand}`;
}

export async function runSimulatedPayment(
  method: PaymentMethod,
  mode: SimulationMode = 'random'
): Promise<SimulatedPaymentResult> {
  // Simulated 2-second processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const txRef = generateDemoTxRef(method);

  if (method === 'COD') {
    return {
      success: true,
      transactionRef: txRef,
      message: 'Simulated Cash on Delivery order confirmed. No online payment was processed.',
    };
  }

  const isSuccess =
    mode === 'success' ? true : mode === 'failure' ? false : Math.random() < 0.72;

  if (isSuccess) {
    return {
      success: true,
      transactionRef: txRef,
      message: 'Simulated demo payment approved. No real money was charged.',
    };
  }

  return {
    success: false,
    transactionRef: txRef,
    message:
      'Simulated gateway timeout or declined test authorization. You can safely retry this demo payment.',
  };
}

export function buildDemoOrder(params: {
  items: OrderItem[];
  address: ShippingAddress;
  subtotal: number;
  discountAmount: number;
  couponCode: string | null;
  shippingFee: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  transactionRef: string;
}): Order {
  const isCod = params.paymentMethod === 'COD';
  return {
    id: generateDemoOrderId(),
    createdAt: new Date().toISOString(),
    items: params.items,
    address: params.address,
    subtotal: params.subtotal,
    discountAmount: params.discountAmount,
    couponCode: params.couponCode,
    shippingFee: params.shippingFee,
    totalAmount: params.totalAmount,
    paymentMethod: params.paymentMethod,
    paymentStatus: isCod ? 'Pending (Cash on Delivery)' : 'Paid (Demo)',
    orderStatus: 'Order Placed',
    transactionRef: params.transactionRef,
  };
}
