import express from 'express';
import * as orderController from '../controllers/orderController';
import auth from '../middleware/auth';

const router = express.Router();

router.get('/', auth, orderController.getOrders);

export default router;
