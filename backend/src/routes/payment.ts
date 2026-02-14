import express from 'express';
import * as orderController from '../controllers/orderController';
import auth from '../middleware/auth';

const router = express.Router();

router.post('/create-payment-intent', auth, orderController.createPaymentIntent);
router.post('/save-order', auth, orderController.saveOrder);
router.post('/webhook', orderController.stripeWebhook); // No auth middleware for webhooks

export default router;
