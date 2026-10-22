import express from 'express';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';
import { listBoothBookingsForAdmin, reviewBoothBooking } from '../controllers/boothBookingController';

const router = express.Router();
router.use(auth, admin);
router.get('/', listBoothBookingsForAdmin);
router.patch('/:id/review', reviewBoothBooking);

export default router;