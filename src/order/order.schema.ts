import { body, param, ValidationChain } from "express-validator";

export class OrderSchema {
  static createOrder(): ValidationChain[] {
    return [
      body("items")
        .isArray({ min: 1 })
        .withMessage("At least one order item is required"),
      body("items.*.productId")
        .isInt({ min: 1 })
        .withMessage("Product ID must be a positive integer"),
      body("items.*.quantity")
        .isInt({ min: 1 })
        .withMessage("Quantity must be at least 1"),
    ];
  }

  static processPayment(): ValidationChain[] {
    return [
      param("orderId")
        .isInt({ min: 1 })
        .withMessage("Order ID must be a positive integer"),
      body("paymentMethod")
        .notEmpty()
        .withMessage("Payment method is required"),
      body("amount")
        .isFloat({ min: 0.01 })
        .withMessage("Amount must be a positive number"),
    ];
  }

  static cancelOrder(): ValidationChain[] {
    return [
   param('id')
      .isString()
      .withMessage('Order ID must be a string')
      .notEmpty()
      .withMessage('Order ID is required'),
    ];
  }
}
