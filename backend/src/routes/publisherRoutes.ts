import express from 'express';
import { auth } from '../middleware/auth';
import {
    applyAsPublisher,
    getMyPublisher,
    getPublicPublisher,
    listMyPublisherBooks,
    listPublicPublishers,
    submitPublisherBook,
    updateMyPublisher,
    updatePublisherBook,
} from '../controllers/publisherController';

const router = express.Router();

router.get('/', listPublicPublishers);
router.get('/me', auth, getMyPublisher);
router.post('/', auth, applyAsPublisher);
router.patch('/me', auth, updateMyPublisher);
router.get('/me/books', auth, listMyPublisherBooks);
router.post('/me/books', auth, submitPublisherBook);
router.patch('/me/books/:bookId', auth, updatePublisherBook);
router.get('/:id', getPublicPublisher);

export default router;