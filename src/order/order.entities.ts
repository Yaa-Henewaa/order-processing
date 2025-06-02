import { Order, OrderItem, OrderStatus, PaymentStatus, Product, Prisma } from '@prisma/client';

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
  };
}>;
export interface CreateOrderParams {
  userId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}

export interface ProcessPaymentParams {
  userId: string;
  amount: number;
}

export interface OrderResult {
  success: boolean;
  order?: OrderWithItems;
  error?: string;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}