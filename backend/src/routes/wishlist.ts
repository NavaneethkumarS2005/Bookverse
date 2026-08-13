import express from 'express';
import * as wishlistController from '../controllers/wishlistController';
import { auth } from '../middleware/auth';

const router = express.Router();

router.use(auth);
router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addToWishlist);
router.delete('/:bookId', wishlistController.removeFromWishlist);

export default router;
