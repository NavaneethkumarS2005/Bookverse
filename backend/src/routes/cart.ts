import express from 'express';
import * as cartController from '../controllers/cartController';
// @ts-ignore
import { auth } from '../middleware/auth';

const router = express.Router();

router.get('/', auth, cartController.getCart);
router.post('/add', auth, cartController.addToCart);
router.delete('/remove/:bookId', auth, cartController.removeFromCart);
router.delete('/clear', auth, cartController.clearCart);

export default router;
