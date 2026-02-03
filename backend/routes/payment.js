const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authMiddleware = require('../middleware/auth');

router.post('/create-payment-intent', authMiddleware, orderController.createPaymentIntent);
router.post('/save-order', authMiddleware, orderController.saveOrder);

module.exports = router;
