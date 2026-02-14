import express from 'express';
import * as bookController from '../controllers/bookController';
import auth from '../middleware/auth';
import admin from '../middleware/admin';

const router = express.Router();

router.get('/', bookController.getBooks);
router.post('/', auth, admin, bookController.addBook);
router.delete('/:id', auth, admin, bookController.deleteBook);

export default router;
