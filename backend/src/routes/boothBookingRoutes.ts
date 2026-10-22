import express from 'express';
import { auth } from '../middleware/auth';
import { cancelMyBoothBooking, listMyBoothBookings, requestBoothBooking } from '../controllers/boothBookingController';

const router = express.Router();

router.get('/me', auth, listMyBoothBookings);
router.post('/', auth, requestBoothBooking);
router.patch('/:id/cancel', auth, cancelMyBoothBooking);

export default router;