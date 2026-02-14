import express from 'express';
import { getBooks, getBookById, addBook, deleteBook } from '../controllers/bookController';
import { auth } from '../middleware/auth';
import { admin } from '../middleware/admin';

const router = express.Router();

router.get('/', getBooks);
router.get('/:id', getBookById);
router.post('/', auth, admin, addBook);
router.delete('/:id', auth, admin, deleteBook);

export default router;
