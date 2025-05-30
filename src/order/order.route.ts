import { Router } from 'express';
import { protect } from '../middleware/authMiddleware';
import {
  createOrderHandler,
  processPaymentHandler,
  getOrderHandler,
  getUserOrdersHandler,
  cancelOrderHandler
} from './order.controller';

const router = Router();

router
  .route('/')
  .post(protect, createOrderHandler)
  .get(protect, getUserOrdersHandler);

router
  .route('/:id')
  .get(protect, getOrderHandler)
  .post(protect, cancelOrderHandler);

router
  .route('/:orderId/payment')
  .post(protect, processPaymentHandler);

export { router as orderRoutes };