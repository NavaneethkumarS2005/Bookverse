import express from 'express';
import { getBooks, getBookById, addBook, deleteBook } from '../controllers/bookController';
import { auth } from '../middleware/auth';
import { AuthRequest } from '../types';
import { admin } from '../middleware/admin';
import { enrichBookCovers } from '../utils/enrichBookCovers';

const router = express.Router();

router.get('/', getBooks);
router.get('/:id', getBookById);
router.post('/', auth, addBook);
router.delete('/:id', auth, admin, deleteBook);

// Manual catalogue maintenance: admin-only cover enrichment.
// Never wired to startup; see server.ts for the explicit opt-in note.
router.post('/enrich-covers', auth, admin, async (req: AuthRequest, res) => {
    try {
        console.log(`🖼️ Manual cover enrichment requested by admin ${req.user?.email ?? 'unknown'} (IP: ${req.ip})`);
        await enrichBookCovers();
        return res.json({ message: 'Book cover enrichment completed.' });
    } catch (error) {
        console.error('❌ Cover enrichment failed:', error);
        return res.status(500).json({ message: 'Cover enrichment failed.' });
    }
});

export default router;
