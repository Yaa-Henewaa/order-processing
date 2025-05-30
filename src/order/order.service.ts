import { OrderStatus, PaymentStatus } from '@prisma/client';
import { prisma } from '../utils/db';
import { 
  CreateOrderParams, 
  OrderWithItems, 
  OrderResult, 
  PaymentResult,
  ProcessPaymentParams
} from './order.entities';

export const createOrder = async (params: CreateOrderParams): Promise<OrderResult> => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Verify products and calculate total
      let totalAmount = 0;
      const orderItems: {
        productId: string;
        quantity: number;
        priceAtOrder: number;
      }[] = [];

      // Check product availability and calculate total
      for (const item of params.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new Error(`Product with ID ${item.productId} not found`);
        }

        if (product.stock < item.quantity) {
          throw new Error(`Insufficient stock for product ${product.name}`);
        }

        totalAmount += product.price * item.quantity;

        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          priceAtOrder: product.price,
        });
      }

      // 2. Create the order
      const order = await tx.order.create({
        data: {
          userId: params.userId,
          totalAmount,
          status: OrderStatus.PENDING, // Assuming you have an enum for order status
          paymentStatus: PaymentStatus.PENDING,
          items: {
            create: orderItems
          },
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // 3. Update product stocks
      for (const item of params.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              decrement: item.quantity,
            },
          },
        });
      }

      // The order returned from Prisma already matches OrderWithItems structure
      // due to the include clause, so no casting needed
      return {
        success: true,
        order,
      };
    });
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create order',
    };
  }
};

export const processPayment = async (params: ProcessPaymentParams): Promise<PaymentResult> => {
  try {
    // Simulate payment processing (replace with real payment gateway in production)
    const paymentSuccess = Math.random() > 0.2; // 80% success rate
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate delay

    if (paymentSuccess) {
      await prisma.order.update({
        where: { id: params.orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          status: OrderStatus.COMPLETED, 
        },
      });

      return {
        success: true,
        transactionId: `tx_${Math.random().toString(36).substring(2, 10)}`,
      };
    } else {
      await prisma.order.update({
        where: { id: params.orderId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          status: OrderStatus.FAILED,
        },
      });

      return {
        success: false,
        error: 'Payment declined by bank',
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment processing failed',
    };
  }
};

export const getOrder = async (id: string): Promise<OrderWithItems | null> => {
  try {
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Prisma returns the correct type due to include, or null if not found
    return order;
  } catch (error) {
    console.error('Error fetching order:', error);
    throw new Error('Error fetching order');
  }
};

export const getUserOrders = async (userId: string): Promise<OrderWithItems[]> => {
  try {
    const orders = await prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Prisma returns the correct type due to include
    return orders;
  } catch (error) {
    console.error('Error fetching user orders:', error);
    throw new Error('Error fetching user orders');
  }
};

export const cancelOrder = async (id: string): Promise<OrderResult> => {
  try {
    // First check if order exists and can be cancelled
    const existingOrder = await prisma.order.findUnique({
      where: { id },
      select: { status: true, paymentStatus: true },
    });

    if (!existingOrder) {
      return {
        success: false,
        error: 'Order not found',
      };
    }

    if (existingOrder.status === OrderStatus.CANCELLED) {
      return {
        success: false,
        error: 'Order is already cancelled',
      };
    }

    if (existingOrder.status === 'COMPLETED') {
      return {
        success: false,
        error: 'Cannot cancel completed order',
      };
    }

    // Cancel the order and potentially restore stock
    const result = await prisma.$transaction(async (tx) => {
      // Update order status
      const cancelledOrder = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.CANCELLED,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
        },
      });

      // Restore stock for cancelled order
      for (const item of cancelledOrder.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: {
              increment: item.quantity,
            },
          },
        });
      }

      return cancelledOrder;
    });

    return {
      success: true,
      order: result,
    };
  } catch (error) {
    console.error('Error cancelling order:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error cancelling order',
    };
  }
};