import express from 'express';
import * as orderController from '../controllers/orderController';
// @ts-ignore
import { auth } from '../middleware/auth';

const router = express.Router();

router.post('/create-payment-intent', auth, orderController.createPaymentIntent);
router.post('/save-order', auth, orderController.saveOrder);
router.post('/demo-session', auth, orderController.createDemoPaymentSession);
router.get('/demo-session/:sessionKey', auth, orderController.getDemoPaymentSession);
router.get('/demo-session/:sessionKey/public', orderController.getPublicDemoPaymentSession);
router.post('/demo-session/:sessionKey/succeed', orderController.succeedDemoPaymentSession);
router.post('/demo-session/:sessionKey/fail', orderController.failDemoPaymentSession);
router.post('/webhook', orderController.stripeWebhook); // No auth middleware for webhooks

export default router;
