"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelOrder = exports.getUserOrders = exports.getOrder = exports.processPayment = exports.createOrder = void 0;
const client_1 = require("@prisma/client");
const db_1 = require("../utils/db");
const createOrder = (params) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        return yield db_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Verifying products and calculate total
            let totalAmount = 0;
            const orderItems = [];
            // Checking product availability and calculate total
            for (const item of params.items) {
                const product = yield tx.product.findUnique({
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
            //Creatin the order
            const order = yield tx.order.create({
                data: {
                    userId: params.userId,
                    totalAmount,
                    status: client_1.OrderStatus.PENDING,
                    paymentStatus: client_1.PaymentStatus.PENDING,
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
            //Updating product stocks
            for (const item of params.items) {
                yield tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            decrement: item.quantity,
                        },
                    },
                });
            }
            return {
                success: true,
                order,
            };
        }));
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to create order',
        };
    }
});
exports.createOrder = createOrder;
const processPayment = (params) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const paymentSuccess = Math.random() > 0.2; // 80% success rate
        yield new Promise(resolve => setTimeout(resolve, 1000)); // Simulated delay
        if (paymentSuccess) {
            yield db_1.prisma.order.update({
                where: { id: params.orderId },
                data: {
                    paymentStatus: client_1.PaymentStatus.PAID,
                    status: client_1.OrderStatus.COMPLETED,
                },
            });
            return {
                success: true,
                transactionId: `tx_${Math.random().toString(36).substring(2, 10)}`,
            };
        }
        else {
            yield db_1.prisma.order.update({
                where: { id: params.orderId },
                data: {
                    paymentStatus: client_1.PaymentStatus.FAILED,
                    status: client_1.OrderStatus.FAILED,
                },
            });
            return {
                success: false,
                error: 'Payment declined',
            };
        }
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Payment processing failed',
        };
    }
});
exports.processPayment = processPayment;
const getOrder = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const order = yield db_1.prisma.order.findUnique({
            where: { id },
            include: {
                items: {
                    include: {
                        product: true,
                    },
                },
            },
        });
        return order;
    }
    catch (error) {
        console.error('Error fetching order:', error);
        throw new Error('Error fetching order');
    }
});
exports.getOrder = getOrder;
const getUserOrders = (userId) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const orders = yield db_1.prisma.order.findMany({
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
        return orders;
    }
    catch (error) {
        console.error('Error fetching user orders:', error);
        throw new Error('Error fetching user orders');
    }
});
exports.getUserOrders = getUserOrders;
const cancelOrder = (id) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const existingOrder = yield db_1.prisma.order.findUnique({
            where: { id },
            select: { status: true, paymentStatus: true },
        });
        if (!existingOrder) {
            return {
                success: false,
                error: 'Order not found',
            };
        }
        if (existingOrder.status === client_1.OrderStatus.CANCELLED) {
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
        // Cancel the order and restore stock
        const result = yield db_1.prisma.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            const cancelledOrder = yield tx.order.update({
                where: { id },
                data: {
                    status: client_1.OrderStatus.CANCELLED,
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
                yield tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stock: {
                            increment: item.quantity,
                        },
                    },
                });
            }
            return cancelledOrder;
        }));
        return {
            success: true,
            order: result,
        };
    }
    catch (error) {
        console.error('Error cancelling order:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Error cancelling order',
        };
    }
});
exports.cancelOrder = cancelOrder;
